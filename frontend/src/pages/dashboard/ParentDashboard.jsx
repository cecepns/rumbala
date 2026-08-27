import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime, formatRupiah } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import StatCard from "../../components/common/StatCard";
import {
  CalendarDays,
  CheckCircle,
  TrendingUp,
  Receipt,
  FileText,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Clock,
  MapPin,
  CalendarClock,
  Award,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { selectedChildId, selectedProgram, selectedChild } = useParentPortal();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!selectedChildId && !user?.student_id) return;
    try {
      setLoading(true);
      const sId = selectedChildId || user?.student_id || 1;
      const params = { student_id: sId };
      if (selectedProgram && selectedProgram !== "Semua Program") {
        params.program_name = selectedProgram;
      }
      const res = await request.get(API_ENDPOINTS.PARENT.SUMMARY, params);
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedChildId, selectedProgram, user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleConfirmAttendance = async (attendanceId) => {
    try {
      const res = await request.put(API_ENDPOINTS.ATTENDANCES.CONFIRM(attendanceId));
      if (res.success) {
        toast.success("Kehadiran sesi berhasil dikonfirmasi!");
        fetchSummary();
      }
    } catch (err) {
      toast.error("Gagal mengonfirmasi kehadiran.");
    }
  };

  const student = summaryData?.student || selectedChild;
  const programs = summaryData?.programs || [];
  const schedules = summaryData?.schedules || [];
  const attendances = summaryData?.attendances || [];
  const journals = summaryData?.journals || [];
  const latestInvoice = summaryData?.latestInvoice;
  const unconfirmedAttendances = attendances.filter((a) => a.parent_confirmed === 0);

  // Total completed sessions calculation
  const totalCompletedMonth = programs.reduce((sum, p) => sum + (p.completed_sessions_month || 0), 0);
  const totalPackageMonth = programs.reduce((sum, p) => sum + (p.package_sessions || 8), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md mb-3 text-sky-100">
            👨‍👩‍👧 Portal Orang Tua & Siswa
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.name || "Bapak/Ibu Orang Tua"}! 🌟
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            Pantau perkembangan belajar ananda <span className="font-bold underline">{student?.name || "Siswa"}</span> ({student?.class_grade}), riwayat kehadiran, materi les per program, serta tagihan SPP bulanan resmi.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/progress"
              className="px-4 py-2 rounded-xl bg-white text-indigo-800 text-xs font-bold hover:bg-sky-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Lihat Progress & Capaian
            </Link>
            <Link
              to="/reschedule"
              className="px-4 py-2 rounded-xl bg-sky-400 text-sky-950 text-xs font-bold hover:bg-sky-300 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Ajukan Izin / Reschedule
            </Link>
            <Link
              to="/invoices"
              className="px-4 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              Tagihan SPP Bulanan
            </Link>
            <Link
              to="/child-profile"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-200" />
              Profil Anak
            </Link>
          </div>
        </div>
      </div>

      {/* Global Parent Filter Bar */}
      <ParentFilterBar />

      {/* Program Summary Cards (e.g. Matematika 4/8 Riscon, English 2/4 Riscon, Mengaji 5/8 Panorama) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            {selectedProgram === "Semua Program" ? "Ringkasan Seluruh Program Ananda" : `Program: ${selectedProgram}`}
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            Progress Bulan Ini: <strong className="text-primary-700">{totalCompletedMonth}/{totalPackageMonth} Pertemuan</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                    {prog.unit_name}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {prog.completed_sessions_month}/{prog.package_sessions} Sesi
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mt-2">{prog.program_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  👩‍🏫 Tutor: <span className="font-semibold text-slate-700">{prog.tutor_name || "Sarah Azzahra"}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  ⏰ {prog.schedule_info || "Jadwal Rutin Mingguan"}
                </p>
              </div>

              {/* Mini progress bar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Progress Bulan Ini</span>
                  <span className="text-primary-700">
                    {Math.round(((prog.completed_sessions_month || 0) / (prog.package_sessions || 8)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((prog.completed_sessions_month || 0) / (prog.package_sessions || 8)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SPP Bulanan Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              Informasi Tagihan SPP Bulanan
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              SPP {latestInvoice?.period_month?.toUpperCase() || "AGUSTUS 2026"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Progres: <strong>{latestInvoice?.sessions_completed || 4}/{latestInvoice?.package_sessions || 8} pertemuan</strong>
            </p>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                latestInvoice?.status === "paid"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              Status: {latestInvoice?.status === "paid" ? "Lunas" : "Belum Lunas"}
            </span>
          </div>
        </div>

        {/* Milestone Capaian Banner */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-medium leading-relaxed">
            Siswa telah menyelesaikan pertemuan ke <strong>{totalCompletedMonth || 4}</strong> dari <strong>{totalPackageMonth || 8}</strong> pertemuan bulan <strong>Agustus 2026</strong> dengan capaian baik.
          </p>
        </div>

        {/* Breakdown Items */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {latestInvoice?.items && latestInvoice.items.length > 0 ? (
            latestInvoice.items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 font-semibold text-[11px]">{item.program_name}</p>
                <p className="font-bold text-slate-800 mt-0.5 truncate">{item.description}</p>
                <p className="font-extrabold text-primary-700 mt-1">{formatRupiah(item.amount)}</p>
              </div>
            ))
          ) : (
            <>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 font-semibold text-[11px]">Cermat Matematika</p>
                <p className="font-bold text-slate-800 mt-0.5">8 Sesi/Bulan - Unit Riscon</p>
                <p className="font-extrabold text-primary-700 mt-1">Rp 350.000</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 font-semibold text-[11px]">English BEC</p>
                <p className="font-bold text-slate-800 mt-0.5">4 Sesi/Bulan - Unit Riscon</p>
                <p className="font-extrabold text-primary-700 mt-1">Rp 300.000</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 font-semibold text-[11px]">Mengaji & Tahfidz</p>
                <p className="font-bold text-slate-800 mt-0.5">8 Sesi/Bulan - Unit Panorama</p>
                <p className="font-extrabold text-primary-700 mt-1">Rp 300.000</p>
              </div>
            </>
          )}

          <div className="p-3 rounded-xl bg-primary-50/70 border border-primary-100 text-xs flex flex-col justify-between">
            <p className="text-primary-800 font-bold uppercase text-[11px]">Total Tagihan SPP</p>
            <p className="text-lg font-black text-primary-800 mt-1">
              {formatRupiah(latestInvoice?.amount || 950000)}
            </p>
            <Link
              to="/invoices"
              className="text-[11px] font-bold text-primary-700 hover:underline flex items-center gap-1 mt-1"
            >
              Lihat Detail Invoice <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Unconfirmed Attendances Alert if any */}
      {unconfirmedAttendances.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Konfirmasi Sesi Les Terlaksana
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Terdapat {unconfirmedAttendances.length} sesi les yang menunggu konfirmasi kehadiran dari Bapak/Ibu.
            </p>
          </div>
          <div className="flex gap-2">
            {unconfirmedAttendances.slice(0, 2).map((att) => (
              <button
                key={att.id}
                onClick={() => handleConfirmAttendance(att.id)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Konfirmasi ({formatDate(att.date)} - {att.program_name})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedules & Recent Journals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Schedules with Unit & Program labels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jadwal Les Rutin</h3>
              <p className="text-xs text-slate-500">Waktu, unit, dan tutor bimbingan ananda</p>
            </div>
            <Link
              to="/schedules"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {schedules && schedules.length > 0 ? (
              schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{sc.program_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {sc.day_of_week}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      ⏰ {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      📍 <span className="font-medium text-slate-700">{sc.unit_name}</span> &bull; 👩‍🏫 Tutor:{" "}
                      <span className="font-medium text-slate-700">{sc.tutor_name}</span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 text-slate-700 self-start sm:self-center">
                    {sc.location_type === "online" ? "Online Zoom" : "Offline Unit"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jadwal les tersimpan.</p>
            )}
          </div>
        </div>

        {/* Recent Learning Journals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jurnal Belajar Terbaru</h3>
              <p className="text-xs text-slate-500">Catatan materi dan capaian ananda per sesi</p>
            </div>
            <Link
              to="/journals"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Semua Jurnal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {journals && journals.length > 0 ? (
              journals.slice(0, 4).map((j) => (
                <div key={j.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{j.topic}</span>
                      <p className="text-[11px] font-semibold text-primary-600">{j.program_name}</p>
                    </div>
                    <span className="text-slate-400 font-medium">{formatDate(j.date)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{j.targets_achieved}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    {j.score && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Nilai: {j.score}/100
                      </span>
                    )}
                    {j.memorization_surah && (
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                        Hafalan: {j.memorization_surah}
                      </span>
                    )}
                    {j.homework && (
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                        PR: {j.homework}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jurnal materi.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
