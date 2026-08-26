import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime, formatRupiah } from "../../utils/helpers";
import {
  CalendarDays,
  CheckCircle,
  TrendingUp,
  Receipt,
  FileText,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import toast from "react-hot-toast";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentDetail();
  }, []);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      // Default to student 1 (Keenan) or user's student_id
      const sId = user?.student_id || 1;
      const res = await request.get(API_ENDPOINTS.STUDENTS.DETAIL(sId));
      if (res.success) {
        setStudentData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAttendance = async (attendanceId) => {
    try {
      const res = await request.put(API_ENDPOINTS.ATTENDANCES.CONFIRM(attendanceId));
      if (res.success) {
        toast.success("Kehadiran sesi berhasil dikonfirmasi!");
        fetchStudentDetail();
      }
    } catch (err) {
      toast.error("Gagal mengonfirmasi kehadiran.");
    }
  };

  const unconfirmedAttendances = studentData?.attendances?.filter(a => a.parent_confirmed === 0) || [];
  const latestInvoice = studentData?.invoices?.[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 text-sky-100">
            👨‍👩‍👧 Portal Orang Tua & Siswa
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.name || "Bapak/Ibu Orang Tua"}! 🌟
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            Pantau perkembangan belajar ananda <span className="font-bold underline">{studentData?.name || "Siswa"}</span> ({studentData?.class_grade}), riwayat kehadiran, materi les yang diajarkan, serta tagihan invoice pembayaran resmi.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/progress"
              className="px-4 py-2 rounded-xl bg-white text-indigo-800 text-xs font-bold hover:bg-sky-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Lihat Grafik Nilai & Progress
            </Link>
            <Link
              to="/invoices"
              className="px-4 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              Daftar Tagihan & Invoice
            </Link>
            <Link
              to="/ai-reports"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              Laporan AI Rapor
            </Link>
          </div>
        </div>
      </div>

      {/* 4/8/12 Milestone & Progress Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Sesi Selesai"
          value={`${studentData?.total_sessions_completed || 0} Pertemuan`}
          subtitle={`Milestone Paket: ${studentData?.total_sessions_completed >= 4 ? "Selesai 4 Sesi" : "Menuju Sesi 4"}`}
          icon={CheckCircle}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard
          title="Jadwal Bimbingan"
          value={`${studentData?.schedules?.length || 0} Sesi / Minggu`}
          subtitle={studentData?.subjects || "Mata Pelajaran Les"}
          icon={CalendarDays}
          colorClass="bg-sky-50 text-sky-600 border-sky-100"
        />
        <StatCard
          title="Status Tagihan Terakhir"
          value={latestInvoice ? (latestInvoice.status === "paid" ? "Lunas" : formatRupiah(latestInvoice.amount)) : "Tidak Ada"}
          subtitle={latestInvoice?.milestone_name || "Paket Pembelajaran"}
          icon={Receipt}
          colorClass={latestInvoice?.status === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}
        />
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
                Konfirmasi Sesi ({formatDate(att.date)})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedules & Recent Journals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Schedules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jadwal Les Rutin</h3>
              <p className="text-xs text-slate-500">Waktu dan tutor bimbingan ananda</p>
            </div>
            <Link to="/schedules" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {studentData?.schedules && studentData.schedules.length > 0 ? (
              studentData.schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{sc.subject}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {sc.day_of_week}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      ⏰ {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                    </p>
                    <p className="text-xs text-slate-500">
                      👩‍🏫 Tutor: <span className="font-medium text-slate-700">{sc.tutor_name}</span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 text-slate-700">
                    {sc.location_type === "online" ? "Online Zoom" : "Offline Rumah"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jadwal les tersimpan.</p>
            )}
          </div>
        </div>

        {/* Recent Learning Journals & Scores */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jurnal & Materi Pembelajaran</h3>
              <p className="text-xs text-slate-500">Ringkasan apa yang telah dipelajari ananda</p>
            </div>
            <Link to="/journals" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Semua Catatan <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {studentData?.journals && studentData.journals.length > 0 ? (
              studentData.journals.slice(0, 4).map((j) => (
                <div key={j.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{j.topic}</span>
                    <span className="text-slate-400 font-medium">{formatDate(j.date)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{j.targets_achieved}</p>
                  <div className="flex items-center justify-between pt-1">
                    {j.score && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Nilai Sesi: {j.score}/100
                      </span>
                    )}
                    {j.homework && (
                      <span className="text-[11px] text-indigo-700 font-medium truncate max-w-[200px]">
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
