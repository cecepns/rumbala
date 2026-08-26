import React, { useState, useEffect } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, createWhatsAppUrl, WA_TEMPLATES } from "../../utils/helpers";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { Sparkles, Printer, MessageCircle, FileText, CheckCircle, Brain, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function AIReportGenerator() {
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reportType, setReportType] = useState("monthly");
  const [periodName, setPeriodName] = useState("Agustus 2026");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [previewReport, setPreviewReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, sRes] = await Promise.all([
        request.get(API_ENDPOINTS.AI_REPORTS.LIST),
        request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 })
      ]);
      if (rRes.success) setReports(rRes.data || []);
      if (sRes.success) {
        setStudents(sRes.data || []);
        if (sRes.data?.length > 0) setSelectedStudentId(sRes.data[0].id);
      }
    } catch (err) {
      toast.error("Gagal memuat laporan AI");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      setIsGenerating(true);
      const res = await request.post(API_ENDPOINTS.AI_REPORTS.GENERATE, {
        student_id: selectedStudentId,
        report_type: reportType,
        period: periodName,
        custom_prompt: customPrompt
      });
      if (res.success) {
        toast.success("Laporan AI Evaluasi Siswa berhasil di-generate!");
        setIsGenerateModalOpen(false);
        setPreviewReport(res.data);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat laporan AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWA = (report) => {
    const student = {
      name: report.student_name,
      parent_name: report.student_name,
      parent_phone: report.parent_phone
    };
    const message = WA_TEMPLATES.LEARNING_REPORT(report, student);
    const url = createWhatsAppUrl(report.parent_phone, message);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 text-purple-100">
            <Brain className="w-3.5 h-3.5" /> Rumbala Smart AI Report Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Generate Laporan Evaluasi Siswa Berbasis AI ✨
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-purple-100/90 leading-relaxed">
            Buat laporan harian, mingguan, bulanan, dan evaluasi rapor secara otomatis dari data akumulasi jurnal mengajar, kehadiran, dan skor latihan siswa.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-extrabold shadow-lg transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-950" />
          + Generate Laporan Baru
        </button>
      </div>

      {/* Reports Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">Daftar Laporan Evaluasi AI Tersimpan</h3>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat laporan AI...</div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full inline-block">
                        {report.report_type === "monthly" ? "Evaluasi Bulanan" : report.report_type === "weekly" ? "Evaluasi Mingguan" : report.report_type === "report_card" ? "Komentar Rapor" : "Laporan Harian"}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-800 mt-1.5">{report.title}</h4>
                      <p className="text-[11px] text-slate-400">Periode: {report.period}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{formatDate(report.created_at)}</span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-slate-600 line-clamp-3 leading-relaxed">{report.summary}</p>
                    <div className="pt-1">
                      <span className="font-bold text-slate-700">Rekomendasi Utama:</span>
                      <p className="text-slate-600 line-clamp-2 mt-0.5">{report.recommendations}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{report.student_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShareWA(report)}
                      title="Kirim ke WA Orang Tua"
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4" /> WA Ortu
                    </button>
                    <button
                      onClick={() => setPreviewReport(report)}
                      className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Buka Laporan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Belum Ada Laporan AI"
            description="Klik tombol '+ Generate Laporan Baru' untuk membuat evaluasi rapor pintar."
            actionText="+ Generate Laporan Baru"
            onAction={() => setIsGenerateModalOpen(true)}
          />
        )}
      </div>

      {/* Generate Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Laporan Pembelajaran AI"
        subtitle="Sistem akan menganalisis histori jurnal, absensi, dan skor siswa"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Siswa yang Dievaluasi *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-purple-500/20"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_grade} - {s.subjects})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tipe Laporan *
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="monthly">Evaluasi Bulanan</option>
                <option value="weekly">Evaluasi Mingguan</option>
                <option value="report_card">Komentar Rapor Resmi</option>
                <option value="daily">Laporan Harian Sesi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Belajar *
              </label>
              <input
                type="text"
                required
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="Contoh: Agustus 2026 / Minggu ke-3"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Khusus Tambahan untuk AI (Opsional)
            </label>
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Contoh: Tekankan motivasi ananda dalam materi geometri dan apresiasi kerapihan catatannya..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memproses AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Mulai Generate AI
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Full Report Modal */}
      <Modal
        isOpen={!!previewReport}
        onClose={() => setPreviewReport(null)}
        title="Dokumen Evaluasi Pembelajaran Siswa"
        subtitle="Format resmi laporan Rumbala"
        maxWidth="max-w-3xl"
      >
        {previewReport && (
          <div className="space-y-6 text-xs text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Rumbala" className="h-10 w-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{previewReport.title}</h3>
                  <p className="text-slate-500 font-medium">{previewReport.period} • Siswa: {previewReport.student_name}</p>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1.5">
                  1. Ringkasan & Capaian Akademik
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{previewReport.summary}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <h4 className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] mb-1.5">
                  2. Kelebihan & Potensi Siswa (Strengths)
                </h4>
                <p className="text-emerald-800 leading-relaxed whitespace-pre-line">{previewReport.strengths}</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <h4 className="font-bold text-amber-900 uppercase tracking-wider text-[11px] mb-1.5">
                  3. Aspek yang Perlu Ditingkatkan
                </h4>
                <p className="text-amber-800 leading-relaxed whitespace-pre-line">{previewReport.areas_for_improvement}</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] mb-1.5">
                  4. Rekomendasi Pembelajaran & Kolaborasi Rumah
                </h4>
                <p className="text-indigo-800 leading-relaxed whitespace-pre-line">{previewReport.recommendations}</p>
              </div>

              {previewReport.ai_generated_notes && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-mono whitespace-pre-line">
                  {previewReport.ai_generated_notes}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleShareWA(previewReport)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Kirimkan Hasil ke WhatsApp Orang Tua
              </button>

              <button
                onClick={() => setPreviewReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
