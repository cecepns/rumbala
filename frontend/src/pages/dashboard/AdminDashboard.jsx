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
  Sparkles
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-primary-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 text-sky-100">
            <Sparkles className="w-3.5 h-3.5" /> Dashboard Pengelola Lembaga
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang di Portal Rumbala! 👋
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            Pantau seluruh aktivitas bimbingan belajar, absensi sesi harian, auto-billing milestone 4/8/12 pertemuan, laporan perkembangan AI, dan rekap honor tutor secara terpusat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/students"
              className="px-3.5 py-2 rounded-xl bg-white text-primary-700 text-xs font-bold hover:bg-sky-50 transition-colors shadow-sm"
            >
              + Kelola Data Siswa
            </Link>
            <Link
              to="/attendance"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors"
            >
              Catat Absensi Sesi
            </Link>
            <Link
              to="/invoices"
              className="px-3.5 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-sm"
            >
              Cek Tagihan (4/8/12)
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-80 opacity-15 pointer-events-none flex items-center justify-center">
          <img src="/logo.png" alt="Rumbala" className="w-full object-contain" />
        </div>
      </div>

      {/* Main Metric StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Siswa Aktif"
          value={stats?.studentsCount || 0}
          subtitle="Siswa terdaftar aktif"
          icon={Users}
          colorClass="bg-sky-50 text-sky-600 border-sky-100"
        />
        <StatCard
          title="Tutor Pengajar"
          value={stats?.tutorsCount || 0}
          subtitle="Tutor spesialis aktif"
          icon={GraduationCap}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard
          title="Total Pemasukan"
          value={formatRupiah(stats?.totalIncome || 0)}
          subtitle="Tagihan lunas terverifikasi"
          icon={CircleDollarSign}
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-100"
        />
        <StatCard
          title="Piutang / Tagihan"
          value={formatRupiah(stats?.totalPending || 0)}
          subtitle="Menunggu pembayaran"
          icon={Receipt}
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
      </div>

      {/* Quick Action Grid & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Teaching Journals */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jurnal Mengajar Terbaru</h3>
              <p className="text-xs text-slate-500">Aktivitas pembelajaran yang baru diinput tutor</p>
            </div>
            <Link
              to="/journals"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentJournals && stats.recentJournals.length > 0 ? (
              stats.recentJournals.map((journal) => (
                <div
                  key={journal.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{journal.student_name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                        {journal.tutor_name}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{journal.topic}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{journal.targets_achieved}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-500">{formatDate(journal.date)}</span>
                    {journal.score && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                          Nilai: {journal.score}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jurnal mengajar tercatat.</p>
            )}
          </div>
        </div>

        {/* Feature Fast Shortcuts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-800">Menu Cepat Rumbala</h3>
          <p className="text-xs text-slate-500">Pintasan fitur administrasi utama</p>

          <div className="space-y-2.5">
            <Link
              to="/ai-reports"
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100 bg-purple-50/60 hover:bg-purple-100/60 text-purple-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold">Generate Laporan AI</p>
                  <p className="text-[11px] text-purple-700/80">Evaluasi otomatis mingguan & rapor</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-600" />
            </Link>

            <Link
              to="/progress"
              className="flex items-center justify-between p-3 rounded-xl border border-sky-100 bg-sky-50/60 hover:bg-sky-100/60 text-sky-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold">Progress Belajar Siswa</p>
                  <p className="text-[11px] text-sky-700/80">Grafik nilai & ketuntasan belajar</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-sky-600" />
            </Link>

            <Link
              to="/tutor-recap"
              className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold">Rekap Honor Tutor</p>
                  <p className="text-[11px] text-emerald-700/80">Hitung total sesi & cetak slip fee</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </Link>

            <Link
              to="/worksheets"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold">Worksheet & Modul</p>
                  <p className="text-[11px] text-slate-500">Bank latihan soal & lembar kerja</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
