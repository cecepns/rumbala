import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate } from "../../utils/helpers";
import Modal from "../../components/common/Modal";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  Award,
  Printer,
  CheckCircle,
  Clock,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
  Car,
  BookOpen,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

export default function TutorRecapList() {
  const { user, role } = useAuth();
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("2026-08");

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  const fetchRecaps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.TUTOR_RECAPS.LIST, { month_year: selectedMonth });
      if (res.success) {
        setRecaps(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat rekap honor tutor");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchRecaps();
  }, [fetchRecaps]);

  const handleOpenSlip = (recap) => {
    setSelectedSlip(recap);
    setIsSlipOpen(true);
  };

  const handleTogglePaymentStatus = async (recap) => {
    const newStatus = recap.payment_status === "paid" ? "pending" : "paid";
    try {
      const res = await request.put(API_ENDPOINTS.TUTOR_RECAPS.UPDATE_STATUS(recap.id), {
        payment_status: newStatus
      });
      if (res.success) {
        toast.success(`Status honor ${recap.tutor_name} diubah menjadi: ${newStatus === "paid" ? "Sudah Dibayar" : "Belum Dibayar"}`);
        fetchRecaps();
      }
    } catch (err) {
      toast.error("Gagal mengubah status pembayaran honor");
    }
  };

  const handleExportCSV = () => {
    if (recaps.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      "Nama Tutor",
      "No WhatsApp",
      "Keahlian Program",
      "Periode Bulan",
      "Total Sesi Terlaksana",
      "Sesi Home Visit",
      "Total Jam Mengajar",
      "Total Fee Mengajar (Rp)",
      "Total Transport Home Visit (Rp)",
      "Grand Total Honor (Rp)",
      "Status Pembayaran"
    ];

    const rows = recaps.map((r) => [
      `"${r.tutor_name}"`,
      `"${r.phone}"`,
      `"${r.subjects}"`,
      `"${r.month_year}"`,
      r.total_sessions || 0,
      r.home_visit_sessions || 0,
      r.total_hours || 0,
      r.total_teaching_fee || (r.total_sessions * r.rate_per_session),
      r.total_transport_fee || (r.home_visit_sessions * 25000),
      r.total_honor || 0,
      r.payment_status === "paid" ? "Sudah Dibayar" : "Belum Dibayar"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Honor_Tutor_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Spreadsheet CSV rekap honor berhasil diunduh!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Audit Honor Edukator
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Rekap Mengajar & Honor Tutor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total honor dihitung dari Sesi Terlaksana × Fee Sesi Program + Tambahan Transport Home Visit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 shadow-xs"
          >
            <option value="2026-08">Periode: Agustus 2026</option>
            <option value="2026-07">Periode: Juli 2026</option>
            <option value="2026-09">Periode: September 2026</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Spreadsheet
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={7} />
          </div>
        ) : recaps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Tutor</th>
                  <th className="py-3.5 px-4">Program & Keahlian</th>
                  <th className="py-3.5 px-4 text-center">Sesi Terlaksana</th>
                  <th className="py-3.5 px-4">Fee Mengajar</th>
                  <th className="py-3.5 px-4">Transport Home Visit</th>
                  <th className="py-3.5 px-4 font-extrabold text-emerald-800">Grand Total Honor</th>
                  <th className="py-3.5 px-4 text-center">Status Bayar</th>
                  <th className="py-3.5 px-4 text-right">Aksi & Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recaps.map((recap) => {
                  const isPaid = recap.payment_status === "paid";
                  const transport = recap.total_transport_fee || (recap.home_visit_sessions ? recap.home_visit_sessions * 25000 : 0);
                  const teachingFee = recap.total_teaching_fee || (recap.total_sessions * recap.rate_per_session);

                  return (
                    <tr key={recap.tutor_id || recap.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                            {recap.tutor_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs sm:text-sm">{recap.tutor_name}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{recap.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold text-[11px]">
                          {recap.subjects || "Cermat Matematika"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-100">
                          {recap.total_sessions || 0} Sesi ({recap.total_hours || 0} Jam)
                        </span>
                        {recap.home_visit_sessions > 0 && (
                          <span className="block text-[10px] text-purple-700 font-bold mt-0.5">
                            {recap.home_visit_sessions} Home Visit
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {formatRupiah(teachingFee)}
                      </td>

                      <td className="py-3.5 px-4">
                        {transport > 0 ? (
                          <span className="font-bold text-purple-700">+{formatRupiah(transport)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-emerald-700 text-sm">
                        {formatRupiah(recap.total_honor || teachingFee + transport)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {role === "admin" ? (
                          <button
                            onClick={() => handleTogglePaymentStatus(recap)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              isPaid ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            }`}
                          >
                            {isPaid ? "✓ Sudah Dibayar" : "⏳ Belum Dibayar"}
                          </button>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isPaid ? "Sudah Dibayar" : "Belum Dibayar"}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenSlip(recap)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Slip Honor
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Tidak Ada Rekap Honor"
            description="Belum ada data rekap kehadiran sesi mengajar pada periode ini."
          />
        )}
      </div>

      {/* Modal Slip Honor Preview */}
      <Modal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        title="Slip Honorarium Tutor"
        subtitle={`Penerima: ${selectedSlip?.tutor_name} • Periode: ${selectedMonth}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-4 border border-slate-200 rounded-2xl bg-white text-slate-800 text-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-primary-700">RUMAH BELAJAR RUMBALA</h2>
              <p className="text-[10px] text-slate-500">Bukti Penerimaan Honor Pengajar</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedSlip?.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {selectedSlip?.payment_status === "paid" ? "SUDAH DIBAYAR" : "PENDING"}
            </span>
          </div>

          <div className="space-y-1">
            <p><strong>Nama Tutor:</strong> {selectedSlip?.tutor_name}</p>
            <p><strong>Program / Mapel:</strong> {selectedSlip?.subjects}</p>
            <p><strong>Periode:</strong> {selectedMonth}</p>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden p-3 bg-slate-50 space-y-2">
            <div className="flex justify-between">
              <span>Sesi Mengajar ({selectedSlip?.total_sessions || 0} Sesi):</span>
              <span className="font-bold">{formatRupiah(selectedSlip?.total_teaching_fee || (selectedSlip?.total_sessions * selectedSlip?.rate_per_session))}</span>
            </div>
            {(selectedSlip?.total_transport_fee > 0 || selectedSlip?.home_visit_sessions > 0) && (
              <div className="flex justify-between text-purple-700">
                <span>Transport Home Visit ({selectedSlip?.home_visit_sessions || 0} Sesi):</span>
                <span className="font-bold">+{formatRupiah(selectedSlip?.total_transport_fee || (selectedSlip?.home_visit_sessions * 25000))}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-emerald-800">
              <span>Grand Total Honor:</span>
              <span>{formatRupiah(selectedSlip?.total_honor || 0)}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" /> Cetak Slip
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
