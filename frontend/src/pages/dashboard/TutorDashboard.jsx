import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime, formatRupiah } from "../../utils/helpers";
import { CalendarDays, CheckSquare, Sparkles, BookOpenCheck, Award, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";

export default function TutorDashboard() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [recentJournals, setRecentJournals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutorData();
  }, []);

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      const [schRes, jrnRes] = await Promise.all([
        request.get(API_ENDPOINTS.SCHEDULES.LIST, { tutor_id: user?.tutor_id || "" }),
        request.get(API_ENDPOINTS.JOURNALS.LIST, { tutor_id: user?.tutor_id || "", limit: 5 })
      ]);

      if (schRes.success) setSchedules(schRes.data || []);
      if (jrnRes.success) setRecentJournals(jrnRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 text-emerald-100">
            👩‍🏫 Portal Tutor Pengajar
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {user?.name}! ✨
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Selamat datang di dashboard mengajar Rumbala. Catat kehadiran sesi siswa, isi jurnal materi & nilai, serta gunakan Smart AI untuk membuat evaluasi rapor dengan cepat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/attendance"
              className="px-4 py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm"
            >
              + Catat Absensi & Jurnal Sesi
            </Link>
            <Link
              to="/ai-reports"
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Laporan AI
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Jadwal Les Aktif"
          value={schedules.length}
          subtitle="Sesi les yang Anda ampu"
          icon={CalendarDays}
          colorClass="bg-sky-50 text-sky-600 border-sky-100"
        />
        <StatCard
          title="Jurnal Terisi"
          value={recentJournals.length}
          subtitle="Catatan materi tersimpan"
          icon={BookOpenCheck}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard
          title="Tarif Honor / Sesi"
          value="Rp 80.000 - Rp 95.000"
          subtitle="Honor per pertemuan 1.5 jam"
          icon={Award}
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
      </div>

      {/* Schedules & Recent Journals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tutor Schedules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Jadwal Mengajar Anda</h3>
              <p className="text-xs text-slate-500">Daftar hari dan jam bimbingan siswa</p>
            </div>
            <Link to="/schedules" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Lihat Detail <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {schedules.length > 0 ? (
              schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{sc.student_name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {sc.subject}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {sc.day_of_week}, {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Metode: {sc.location_type === "online" ? "🌐 Online Zoom" : "🏠 Offline di Rumah Siswa"}
                    </span>
                  </div>
                  <Link
                    to="/attendance"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Absen
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jadwal mengajar.</p>
            )}
          </div>
        </div>

        {/* Recent Teaching Records */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Riwayat Jurnal Terakhir</h3>
              <p className="text-xs text-slate-500">Catatan perkembangan belajar siswa</p>
            </div>
            <Link to="/journals" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Semua Jurnal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentJournals.length > 0 ? (
              recentJournals.map((j) => (
                <div key={j.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{j.student_name}</span>
                    <span className="text-slate-400 font-medium">{formatDate(j.date)}</span>
                  </div>
                  <p className="font-semibold text-slate-700">{j.topic}</p>
                  <p className="text-slate-500 line-clamp-1">{j.targets_achieved}</p>
                  {j.score && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      Skor: {j.score}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jurnal tersimpan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
