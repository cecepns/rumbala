import React, { useState, useEffect } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate } from "../../utils/helpers";
import StatCard from "../../components/common/StatCard";
import { CardSkeleton } from "../../components/common/Skeleton";
import {
  Users,
  GraduationCap,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  Receipt,
  Sparkles,
  CalendarClock,
  Car,
  Award,
  AlertCircle,
  Clock,
  Building2,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.DASHBOARD.STATS);
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={4} />
      </div>
    );
  }

  const d = stats || {};
  const income = d.monthly_income || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-primary-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 text-sky-100">
            <Sparkles className="w-3.5 h-3.5" /> Dashboard Pengelola RUMBALA
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang di Portal Admin! 👋
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            Kelola operasional les, tagihan bulanan paket 4/8/12 sesi, jadwal bimbingan, absensi terverifikasi, persetujuan izin/reschedule, dan rekap honor tutor secara rapih.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/students"
              className="px-4 py-2 rounded-xl bg-white text-primary-700 text-xs font-bold hover:bg-sky-50 transition-colors shadow-sm"
            >
              + Data Siswa & Program
            </Link>
            <Link
              to="/attendance"
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-colors"
            >
              Catat Absensi Sesi
            </Link>
            <Link
              to="/invoices"
              className="px-4 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-sm"
            >
              Tagihan SPP Bulanan
            </Link>
            <Link
              to="/tutor-attendance"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors shadow-sm"
            >
              Rekap Kehadiran Tutor
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-80 opacity-15 pointer-events-none flex items-center justify-center">
          <img src="/logo.png" alt="Rumbala" className="w-full object-contain" />
        </div>
      </div>

      {/* 7 Ringkasan Utama Admin Sesuai Revisi */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Jadwal Hari Ini */}
        <Link to="/schedules" className="block">
          <StatCard
            title={`Jadwal ${d.today_day_name || "Hari Ini"}`}
            value={`${d.schedules_today_count || 0} Sesi`}
            subtitle="Jadwal kelas aktif hari ini"
            icon={CalendarDays}
            colorClass="bg-sky-50 text-sky-600 border-sky-100"
          />
        </Link>

        {/* 2. Jumlah Pertemuan Hari Ini */}
        <Link to="/attendance" className="block">
          <StatCard
            title="Pertemuan Hari Ini"
            value={`${d.sessions_today_completed || 0} Terlaksana`}
            subtitle="Sesi yang telah dipresensi"
            icon={CheckSquare}
            colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
        </Link>

        {/* 3. Pengajuan Izin / Reschedule */}
        <Link to="/reschedule" className="block">
          <StatCard
            title="Pengajuan Izin / Reschedule"
            value={`${d.pending_reschedule_count || 0} Menunggu`}
            subtitle="Perlu keputusan admin"
            icon={CalendarClock}
            colorClass={d.pending_reschedule_count > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-100"}
          />
        </Link>

        {/* 4. Tagihan Belum Lunas */}
        <Link to="/invoices" className="block">
          <StatCard
            title="Tagihan SPP Belum Lunas"
            value={formatRupiah(d.unpaid_invoices_amount || 0)}
            subtitle={`${d.unpaid_invoices_count || 0} invoice pending`}
            icon={Receipt}
            colorClass="bg-rose-50 text-rose-700 border-rose-100"
          />
        </Link>

        {/* 5. Laporan Perkembangan Menunggu Publish */}
        <Link to="/ai-reports" className="block">
          <StatCard
            title="Laporan Menunggu Publish"
            value={`${d.pending_ai_reports_count || 0} Draft`}
            subtitle="Menunggu review admin"
            icon={Sparkles}
            colorClass="bg-purple-50 text-purple-700 border-purple-100"
          />
        </Link>

        {/* 6. Rekap Sesi Tutor Bulan Berjalan */}
        <Link to="/tutor-attendance" className="block">
          <StatCard
            title="Sesi Tutor Bulan Berjalan"
            value={`${d.tutor_month_sessions_count || 0} Sesi`}
            subtitle={`Honor: ${formatRupiah(d.tutor_month_honor_amount || 0)}`}
            icon={Award}
            colorClass="bg-indigo-50 text-indigo-700 border-indigo-100"
          />
        </Link>

        {/* 7. Ringkasan Pemasukan Bulan Berjalan */}
        <Link to="/finances" className="col-span-2 sm:col-span-2 block">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pemasukan SPP Bulan Berjalan ({d.current_period || "Bulan Ini"})
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold text-emerald-700">
                  {formatRupiah(income.paid || 0)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  dari total tagihan {formatRupiah(income.total || 0)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tingkat Pelunasan: <strong className="text-slate-800">{income.ratio || 0}%</strong> &bull; Piutang: <span className="text-rose-600 font-semibold">{formatRupiah(income.unpaid || 0)}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CircleDollarSign className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* Grid: Jadwal Hari Ini & Aksi Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jadwal Hari Ini Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Jadwal Les {d.today_day_name || "Hari Ini"} ({d.schedules_today_count || 0} Kelas)
              </h2>
              <p className="text-xs text-slate-500">Daftar sesi belajar yang dijadwalkan berlangsung hari ini</p>
            </div>
            <Link
              to="/schedules"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Kelola Jadwal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {d.schedules_today && d.schedules_today.length > 0 ? (
              d.schedules_today.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{sc.student_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                        {sc.class_grade}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                        {sc.class_type || "Semi Privat"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-primary-700">
                      {sc.program_name} &bull; <span className="text-slate-600">{sc.unit_name}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      👩‍🏫 Tutor: <strong>{sc.tutor_name || "Tutor Belum Ditugaskan"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end gap-2 text-right">
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-800 shadow-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary-600" />
                      {sc.start_time} - {sc.end_time}
                    </span>
                    <Link
                      to="/attendance"
                      className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
                    >
                      Presensi Sesi &rarr;
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada jadwal sesi bimbingan yang aktif untuk {d.today_day_name || "hari ini"}.
              </div>
            )}
          </div>
        </div>

        {/* Master Database Summary & Quick Access */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Database Rumbala</h2>
            <p className="text-xs text-slate-500">Ringkasan master entitas aktif</p>
          </div>

          <div className="space-y-3">
            <Link
              to="/students"
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Total Siswa Aktif</p>
                  <p className="text-[11px] text-slate-500">Mendukung multi-program</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{d.counts?.students || 0}</span>
            </Link>

            <Link
              to="/tutors"
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Tutor Bersertifikasi</p>
                  <p className="text-[11px] text-slate-500">Honor per program & transport</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{d.counts?.tutors || 0}</span>
            </Link>

            <Link
              to="/programs-master"
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Program & Rubrik Evaluasi</p>
                  <p className="text-[11px] text-slate-500">Prisma, MTK, Tahfidz, BEC</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{d.counts?.programs || 0}</span>
            </Link>

            <Link
              to="/units-master"
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Unit Cabang Belajar</p>
                  <p className="text-[11px] text-slate-500">Riscon, Panorama, Home Visit</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{d.counts?.units || 0}</span>
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            💡 <strong>Info Tagihan Bulanan:</strong> Tagihan SPP diterbitkan per bulan kalender berdasarkan jumlah paket pertemuan siswa (4, 8, atau 12 sesi/bulan).
          </div>
        </div>
      </div>
    </div>
  );
}
