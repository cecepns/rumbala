import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime, formatRupiah, createWhatsAppUrl } from "../../utils/helpers";
import {
  CalendarDays,
  CheckSquare,
  Sparkles,
  BookOpenCheck,
  Award,
  ArrowUpRight,
  Users,
  MapPin,
  Clock,
  CalendarClock,
  MessageCircle,
  BookOpen,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";

export default function TutorDashboard() {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [recentJournals, setRecentJournals] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutorDashboard();
  }, []);

  const fetchTutorDashboard = async () => {
    try {
      setLoading(true);
      const [sumRes, schRes, jrnRes, stRes] = await Promise.all([
        request.get(API_ENDPOINTS.TUTOR_STUDENTS.DASHBOARD_SUMMARY),
        request.get(API_ENDPOINTS.SCHEDULES.LIST),
        request.get(API_ENDPOINTS.JOURNALS.LIST),
        request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST),
      ]);

      if (sumRes.success) setSummaryData(sumRes.data);
      if (schRes.success) setSchedules(schRes.data || []);
      if (jrnRes.success) setRecentJournals(jrnRes.data || []);
      if (stRes.success) setStudents(stRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentDayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];
  const todaySchedules = summaryData?.todaySchedules || schedules.filter(sc => sc.day_of_week === currentDayName);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md mb-3 text-emerald-100">
            👩‍🏫 Portal Tutor Pengajar
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {user?.name || "Sarah Azzahra, S.Pd"}! ✨
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Selamat datang di portal mengajar Rumbala. Kelola kehadiran sesi bimbingan, catat jurnal singkat materi, perbarui data pembelajaran siswa asuhan Anda, dan terbitkan laporan perkembangan berkala.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/attendance"
              className="px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm"
            >
              + Catat Absensi Sesi
            </Link>
            <Link
              to="/students"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Siswa Saya ({students.length})
            </Link>
            <Link
              to="/ai-reports"
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              Generate Laporan AI
            </Link>
            <a
              href={createWhatsAppUrl("081212788313", `Halo Admin Rumbala, saya Tutor ${user?.name || "Rumbala"} ingin berkoordinasi mengenai jadwal / kebutuhan bimbingan.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hubungi Admin
            </a>
          </div>
        </div>
      </div>

      {/* 1. Unit & Program yang Diampu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Program yang Anda Ampu</p>
            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {summaryData?.programs?.join(" • ") || "Pracalis • Cerdas Matematika"}
            </h4>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">Fokus Materi & Evaluasi Fleksibel</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-extrabold shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Unit Lokasi Mengajar</p>
            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {summaryData?.units?.join(" • ") || "Unit Riscon Rancaekek • Unit Panorama Jatinangor"}
            </h4>
            <p className="text-xs text-sky-600 font-semibold mt-0.5">Semi Privat, Privat, & Online</p>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics (Sesi Bulan Ini, Status Jurnal, Laporan yang Harus Dibuat, Honor) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sesi Mengajar Bulan Ini"
          value={`${summaryData?.totalSessionsMonth || 14} Sesi`}
          subtitle="Agustus 2026 (Terlaksana)"
          icon={CheckSquare}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Status Jurnal Mengajar</p>
            <h3 className="text-xl font-extrabold text-slate-900">
              {summaryData?.missingJournalsCount === 0 ? "Semua Terisi" : `${summaryData?.missingJournalsCount || 0} Perlu Diisi`}
            </h3>
            <p className="text-xs font-semibold text-emerald-600">
              {summaryData?.missingJournalsCount === 0 ? "Jurnal terisi rapih" : "Lengkapi jurnal sesi"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpenCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Laporan Harus Dibuat</p>
            <h3 className="text-xl font-extrabold text-slate-900">
              {summaryData?.reportsToMake?.length || 1} Siswa
            </h3>
            <p className="text-xs font-semibold text-purple-600">
              Mencapai Pertemuan #4 / #8
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <StatCard
          title="Estimasi Honor Bulan Ini"
          value={formatRupiah(summaryData?.honorSummary?.totalHonor || 1120000)}
          subtitle="Berdasarkan sesi terlaksana"
          icon={Award}
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
      </div>

      {/* 3. Jadwal Hari Ini Highlight */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Jadwal Mengajar Hari Ini ({currentDayName})
              </h3>
              <p className="text-xs text-slate-500">Daftar sesi bimbingan yang harus Anda ampu hari ini</p>
            </div>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
            {todaySchedules.length} Sesi Terjadwal
          </span>
        </div>

        {todaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {todaySchedules.map((sc) => (
              <div
                key={sc.id}
                className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{sc.student_name}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900">
                      {sc.program_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold">
                    ⏰ {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {sc.unit_name} &bull; {sc.location_type === "online" ? "Online" : "Offline"}
                  </p>
                </div>

                <Link
                  to="/attendance"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shrink-0"
                >
                  Absen Sesi
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            Tidak ada jadwal mengajar pada hari ini ({currentDayName}). Anda dapat mempersiapkan materi bimbingan berikutnya.
          </div>
        )}
      </div>

      {/* 4. Jadwal Mengajar & Jurnal Terakhir Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tutor All Schedules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Semua Jadwal Mengajar Anda</h3>
              <p className="text-xs text-slate-500">Jadwal bimbingan aktif yang ditugaskan oleh Admin</p>
            </div>
            <Link
              to="/schedules"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {schedules.length > 0 ? (
              schedules.slice(0, 4).map((sc) => (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{sc.student_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-50 text-primary-700">
                        {sc.program_name || sc.subject}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      🗓️ {sc.day_of_week}, {formatTime(sc.start_time)} - {formatTime(sc.end_time)} &bull; 📍 {sc.unit_name}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                    {sc.location_type === "online" ? "Online" : "Unit"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada jadwal mengajar.</p>
            )}
          </div>
        </div>

        {/* Jurnal Mengajar Terakhir */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Jurnal Singkat Terakhir</h3>
              <p className="text-xs text-slate-500">Catatan materi sesi dan capaian pembelajaran</p>
            </div>
            <Link
              to="/journals"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Semua Jurnal <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentJournals.length > 0 ? (
              recentJournals.slice(0, 3).map((j) => (
                <div key={j.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{j.student_name}</span>
                      <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                        {j.program_name}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-medium">{formatDate(j.date)}</span>
                  </div>
                  <p className="font-bold text-slate-800">{j.topic}</p>
                  <p className="text-slate-500 line-clamp-1">{j.targets_achieved}</p>
                  {j.homework && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold mt-1 inline-block">
                      📝 PR: {j.homework}
                    </p>
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
