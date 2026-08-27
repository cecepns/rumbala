import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { TableSkeleton } from "../../components/common/Skeleton";
import {
  Sparkles,
  BookOpen,
  User,
  Calendar,
  CheckCircle2,
  Edit2,
  Printer,
  Download,
  Share2,
  Award,
  ArrowRight,
  Send,
  Eye,
  Layers,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";

export default function AIReportGenerator() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate AI Modal State (Tutor/Admin)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    student_id: "",
    program_name: "Cermat Matematika",
    report_type: "mid_period", // 'mid_period' (Evaluasi Tengah Periode) or 'final_period' (Evaluasi Akhir Periode)
    period: "Agustus 2026",
    // Rubric Fields for Flexible Evaluation
    concept_understanding: "Baik",
    accuracy_rating: "Berkembang",
    vocabulary_rating: "Baik",
    grammar_rating: "Berkembang",
    reading_rating: "Baik",
    english_level: "Intro 1",
    speed_rating: "Berkembang",
    technique_rating: "Baik",
    concentration_rating: "Baik",
    fluency_rating: "Baik",
    makhraj_rating: "Sesuai Kaidah",
    mad_rating: "Berkembang",
    tajwid_rating: "Baik",
    memorization_target: "Surah Al-Mulk ayat 1-15",
    murojaah_status: "Lancar",
    next_target: "Surah Al-Mulk ayat 16-30"
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // View / Edit / Publish Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    strengths: "",
    areas_for_improvement: "",
    recommendations: "",
    status: "published",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchStudents = async () => {
    if (role === "parent") return;
    try {
      if (role === "tutor") {
        const res = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) {
            setGenerateForm((prev) => ({
              ...prev,
              student_id: res.data[0].id,
              program_name: res.data[0].program_name || "Cermat Matematika",
            }));
          }
        }
      } else {
        const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) {
            setGenerateForm((prev) => ({
              ...prev,
              student_id: res.data[0].id,
            }));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (role === "parent") {
        if (selectedChildId) params.student_id = selectedChildId;
        if (selectedProgram && selectedProgram !== "Semua Program") params.program_name = selectedProgram;
      }

      const res = await request.get(API_ENDPOINTS.AI_REPORTS.LIST, params);
      if (res.success) {
        setReports(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat laporan perkembangan");
    } finally {
      setLoading(false);
    }
  }, [role, selectedChildId, selectedProgram]);

  useEffect(() => {
    fetchStudents();
  }, [role]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateAI = async (e) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const res = await request.post(API_ENDPOINTS.AI_REPORTS.GENERATE, generateForm);
      if (res.success) {
        toast.success(res.message || "Draft Laporan AI berhasil dibuat!");
        setIsGenerateOpen(false);
        fetchReports();
        if (res.data) {
          handleOpenEdit(res.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat laporan AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEdit = (rep) => {
    setSelectedReport(rep);
    setEditForm({
      title: rep.title,
      summary: rep.summary,
      strengths: rep.strengths,
      areas_for_improvement: rep.areas_for_improvement,
      recommendations: rep.recommendations,
      status: rep.status || "published",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      setIsSavingEdit(true);
      const res = await request.put(API_ENDPOINTS.AI_REPORTS.UPDATE(selectedReport.id), editForm);
      if (res.success) {
        toast.success("Laporan perkembangan berhasil disimpan!");
        setIsEditModalOpen(false);
        fetchReports();
      }
    } catch (err) {
      toast.error("Gagal menyimpan laporan.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Laporan Perkembangan"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "parent" ? "Laporan Perkembangan Ananda" : "Generate & Publikasi Laporan AI"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "parent"
              ? "Laporan resmi perkembangan belajar ananda (Evaluasi Tengah & Akhir Periode) yang diterbitkan oleh tutor pengampu."
              : "Generate draft evaluasi berkala (Tengah Periode / Akhir Periode) per program & siswa, tinjau, lalu publish untuk orang tua."}
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-purple-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            + Buat Laporan Berkala AI
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Reports Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum Ada Laporan Perkembangan"
          description="Laporan evaluasi berkala siswa per program akan ditampilkan di sini."
          actionText={role !== "parent" ? "Generate Laporan AI" : undefined}
          onAction={role !== "parent" ? () => setIsGenerateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                        {rep.program_name} &bull; {rep.period}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                        {rep.title?.includes("Tengah") ? "Evaluasi Tengah Periode" : "Evaluasi Akhir Periode"}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      {rep.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      Siswa: <span className="font-extrabold text-slate-900">{rep.student_name}</span> &bull; 👩‍🏫 Tutor:{" "}
                      <span className="font-bold text-slate-800">{rep.tutor_name || "Sarah Azzahra"}</span>
                    </p>
                  </div>

                  <div>
                    {rep.status === "admin_approved" || rep.status === "published" ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Dipublish ke Ortu
                      </span>
                    ) : rep.status === "tutor_reviewed" ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5" /> Menunggu Publish Admin
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                        Draft Tutor
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Sections */}
                <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Ringkasan Kemajuan Belajar
                    </p>
                    <p className="font-medium text-slate-800">{rep.summary}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-950">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                      🌟 Kekuatan & Kemampuan yang Dikuasai
                    </p>
                    <p className="font-medium">{rep.strengths}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-amber-950">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                      🎯 Bagian yang Perlu Ditingkatkan
                    </p>
                    <p className="font-medium">{rep.areas_for_improvement}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 text-sky-950">
                    <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-1">
                      💡 Target & Rekomendasi Latihan
                    </p>
                    <p className="font-medium">{rep.recommendations}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  {rep.status === "admin_approved" || rep.status === "published"
                    ? "Telah Dipublish Resmi"
                    : "Draft Disusun Tutor"} &bull; {formatDate(rep.created_at)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Cetak Laporan"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* 1-Click Publish Button for Admin */}
                  {role === "admin" && rep.status !== "admin_approved" && rep.status !== "published" && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await request.put(API_ENDPOINTS.AI_REPORTS.UPDATE(rep.id), {
                            ...rep,
                            status: "admin_approved"
                          });
                          if (res.success) {
                            toast.success("Laporan berhasil dipublish ke Orang Tua!");
                            fetchReports();
                          }
                        } catch (err) {
                          toast.error("Gagal mempublish laporan.");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Publish ke Ortu
                    </button>
                  )}

                  {role !== "parent" && (
                    <button
                      onClick={() => handleOpenEdit(rep)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {role === "admin" ? "Edit / Review" : "Edit Draft"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Generate AI (Tutor/Admin) with Periodic Schedule & Flexible Rubric */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Draft Laporan Perkembangan Berkala (AI)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleGenerateAI} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Siswa
              </label>
              <select
                value={generateForm.student_id}
                onChange={(e) => {
                  const st = students.find((s) => s.id === Number(e.target.value));
                  setGenerateForm({
                    ...generateForm,
                    student_id: e.target.value,
                    program_name: st?.program_name || "Cermat Matematika",
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.program_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Program Belajar
              </label>
              <input
                type="text"
                value={generateForm.program_name}
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jenis Laporan Berkala
              </label>
              <select
                value={generateForm.report_type}
                onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="mid_period">Evaluasi Tengah Periode (Sesi #4 / #6)</option>
                <option value="final_period">Evaluasi Akhir Periode (Sesi #8 / #12)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Bulan
              </label>
              <input
                type="text"
                value={generateForm.period}
                onChange={(e) => setGenerateForm({ ...generateForm, period: e.target.value })}
                placeholder="Agustus 2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Program-Specific Flexible Rubric Form */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <span className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              Indikator Evaluasi Capaian ({generateForm.program_name})
            </span>

            {/* Matematika Rubric */}
            {generateForm.program_name.includes("Matematika") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pemahaman Konsep</label>
                  <select
                    value={generateForm.concept_understanding}
                    onChange={(e) => setGenerateForm({ ...generateForm, concept_understanding: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Berkembang">Berkembang</option>
                    <option value="Perlu Latihan">Perlu Latihan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Ketelitian Berhitung</label>
                  <select
                    value={generateForm.accuracy_rating}
                    onChange={(e) => setGenerateForm({ ...generateForm, accuracy_rating: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Sangat Teliti">Sangat Teliti</option>
                    <option value="Baik / Teliti">Baik / Teliti</option>
                    <option value="Berkembang">Berkembang</option>
                    <option value="Perlu Ditingkatkan">Perlu Ditingkatkan</option>
                  </select>
                </div>
              </div>
            )}

            {/* English Rubric */}
            {generateForm.program_name.includes("English") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Vocabulary</label>
                  <select
                    value={generateForm.vocabulary_rating}
                    onChange={(e) => setGenerateForm({ ...generateForm, vocabulary_rating: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Berkembang">Berkembang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Grammar</label>
                  <select
                    value={generateForm.grammar_rating}
                    onChange={(e) => setGenerateForm({ ...generateForm, grammar_rating: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Berkembang">Berkembang</option>
                    <option value="Perlu Latihan">Perlu Latihan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Level</label>
                  <input
                    type="text"
                    value={generateForm.english_level}
                    onChange={(e) => setGenerateForm({ ...generateForm, english_level: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Mengaji / Tahfidz Rubric */}
            {(generateForm.program_name.includes("Mengaji") || generateForm.program_name.includes("Tahfidz")) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Kelancaran & Makhraj</label>
                  <select
                    value={generateForm.makhraj_rating}
                    onChange={(e) => setGenerateForm({ ...generateForm, makhraj_rating: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Fasih Sesuai Kaidah">Fasih Sesuai Kaidah</option>
                    <option value="Baik / Berkembang">Baik / Berkembang</option>
                    <option value="Perlu Penguatan">Perlu Penguatan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Hafalan / Setoran</label>
                  <input
                    type="text"
                    value={generateForm.memorization_target}
                    onChange={(e) => setGenerateForm({ ...generateForm, memorization_target: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Pracalis / Calistung Rubric */}
            {generateForm.program_name.includes("Pracalis") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mengenal Huruf & Suku Kata</label>
                  <select
                    value={generateForm.concept_understanding}
                    onChange={(e) => setGenerateForm({ ...generateForm, concept_understanding: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Sangat Lancar">Sangat Lancar</option>
                    <option value="Lancar / Baik">Lancar / Baik</option>
                    <option value="Berkembang">Berkembang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Motorik Menulis</label>
                  <select
                    value={generateForm.accuracy_rating}
                    onChange={(e) => setGenerateForm({ ...generateForm, accuracy_rating: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Rapi & Mandiri">Rapi & Mandiri</option>
                    <option value="Berkembang Baik">Berkembang Baik</option>
                    <option value="Perlu Latihan">Perlu Latihan</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Alur Review & Human In The Loop:
            </span>
            AI akan merangkum jurnal kehadiran dan indikator di atas menjadi draft laporan. Anda dapat mereview dan mengedit sebelum dipublish ke orang tua.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? "Sedang Menyusun Draft..." : "Generate Draft AI"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Review & Publish Report */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Tinjau & Publish Laporan Perkembangan Siswa"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Judul Laporan
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Ringkasan Kemajuan Belajar
            </label>
            <textarea
              rows={3}
              value={editForm.summary}
              onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kekuatan & Kemampuan yang Dikuasai
            </label>
            <textarea
              rows={2}
              value={editForm.strengths}
              onChange={(e) => setEditForm({ ...editForm, strengths: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Bagian yang Perlu Ditingkatkan
            </label>
            <textarea
              rows={2}
              value={editForm.areas_for_improvement}
              onChange={(e) => setEditForm({ ...editForm, areas_for_improvement: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Target & Rekomendasi Latihan
            </label>
            <textarea
              rows={2}
              value={editForm.recommendations}
              onChange={(e) => setEditForm({ ...editForm, recommendations: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Status Alur Publikasi
            </label>
            {role === "admin" ? (
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white"
              >
                <option value="admin_approved">✅ Publish Resmi ke Portal Orang Tua</option>
                <option value="tutor_reviewed">⏳ Menunggu Review / Draft Admin</option>
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Laporan ini akan disimpan sebagai Draft Review dan diteruskan ke <strong>Admin</strong> untuk dipublish ke Orang Tua.</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className={`px-4 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-sm ${
                role === "admin" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isSavingEdit
                ? "Menyimpan..."
                : role === "admin"
                ? "Simpan & Publish ke Ortu"
                : "Kirim Draft ke Admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
