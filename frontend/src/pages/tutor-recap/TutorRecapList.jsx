import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate } from "../../utils/helpers";
import Modal from "../../components/common/Modal";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Award, Printer, CheckCircle, Clock, Calendar, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function TutorRecapList() {
  const { user, role } = useAuth();
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("2026-08");

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  useEffect(() => {
    fetchRecaps();
  }, [selectedMonth]);

  const fetchRecaps = async () => {
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
  };

  const handleOpenSlip = (recap) => {
    setSelectedSlip(recap);
    setIsSlipOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Rekap Aktivitas & Honor Tutor
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perhitungan otomatis jumlah pertemuan, total jam mengajar, dan slip honor fee tutor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Periode:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="2026-08">Agustus 2026</option>
            <option value="2026-07">Juli 2026</option>
            <option value="2026-06">Juni 2026</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={3} cols={6} />
          </div>
        ) : recaps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Tutor</th>
                  <th className="py-3.5 px-4">Keahlian Mapel</th>
                  <th className="py-3.5 px-4 text-center">Total Pertemuan</th>
                  <th className="py-3.5 px-4 text-center">Total Jam</th>
                  <th className="py-3.5 px-4">Tarif / Sesi</th>
                  <th className="py-3.5 px-4">Total Honor Fee</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recaps.map((recap) => (
                  <tr key={recap.tutor_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                          {recap.tutor_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{recap.tutor_name}</p>
                          <p className="text-[11px] text-slate-400">{recap.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold text-[11px]">
                        {recap.subjects}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {recap.total_sessions} Sesi
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {recap.total_hours} Jam
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {formatRupiah(recap.rate_per_session)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-indigo-700 text-sm">
                      {formatRupiah(recap.total_honor)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenSlip(recap)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Slip Honor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Tidak Ada Data Rekap"
            description="Belum ada aktivitas mengajar tercatat pada periode ini."
          />
        )}
      </div>

      {/* Slip Honor Modal */}
      <Modal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        title="Slip Honor Mengajar Tutor Rumbala"
        subtitle="Dokumen rincian honorarium bulanan"
        maxWidth="max-w-2xl"
      >
        {selectedSlip && (
          <div className="space-y-6 text-xs text-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Rumbala" className="h-12 w-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">RUMBALA</h3>
                  <p className="text-[11px] text-slate-500">Lembaga Bimbingan Belajar & Les Privat</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-primary-600 uppercase text-[11px]">SLIP HONORARIUM</span>
                <p className="text-slate-500 font-medium mt-0.5">Periode: {selectedSlip.period_month}</p>
              </div>
            </div>

            {/* Tutor Details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Nama Tutor:</span>
                <span className="font-extrabold text-sm text-slate-900">{selectedSlip.tutor_name}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">Mapel: {selectedSlip.subjects}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">No. WhatsApp:</span>
                <span className="font-semibold text-slate-800">{selectedSlip.phone}</span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Sesi Pertemuan Terlaksana:</span>
                <span className="font-bold text-slate-800">{selectedSlip.total_sessions} Pertemuan</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Akumulasi Jam Mengajar:</span>
                <span className="font-bold text-slate-800">{selectedSlip.total_hours} Jam</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Tarif Honor per Pertemuan (1.5 Jam):</span>
                <span className="font-bold text-slate-800">{formatRupiah(selectedSlip.rate_per_session)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-slate-300 text-sm">
                <span className="font-extrabold text-slate-900">Total Honor yang Diterima:</span>
                <span className="font-extrabold text-primary-700 text-base">{formatRupiah(selectedSlip.total_honor)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Slip Honor
              </button>

              <button
                onClick={() => setIsSlipOpen(false)}
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
