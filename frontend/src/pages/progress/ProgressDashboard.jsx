import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import {
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Sparkles,
  BarChart3,
  Target,
  Clock,
  User,
  Layers,
  FileCheck2
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProgressDashboard() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram, selectedChild } = useParentPortal();
  const [students, setStudents] = useState([]);
  const [tutorStudentId, setTutorStudentId] = useState("");
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for Tutor / Admin
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("Semua Program");
  const [selectedPeriod, setSelectedPeriod] = useState("Agustus 2026");

  const fetchStudents = async () => {
    try {
      if (role === "tutor") {
        const res = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) setTutorStudentId(res.data[0].id);
        }
      } else if (role === "admin") {
        const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) setTutorStudentId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgress = useCallback(async () => {
    const sId = role === "parent" ? (selectedChildId || 1) : tutorStudentId;
    if (!sId) return;

    try {
      setLoading(true);
      const progParam = role === "parent" ? selectedProgram : selectedProgramFilter;
      const res = await request.get(API_ENDPOINTS.PROGRESS.DETAIL(sId), {
        program_name: progParam && progParam !== "Semua Program" ? progParam : undefined
      });
      if (res.success) {
        setProgressData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data progress belajar");
    } finally {
      setLoading(false);
    }
  }, [role, selectedChildId, selectedProgram, tutorStudentId, selectedProgramFilter]);

  useEffect(() => {
    if (role !== "parent") {
      fetchStudents();
    }
  }, [role]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const student = progressData?.student || selectedChild;
  const programs = progressData?.programs || [];
  const journals = progressData?.journals || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
          {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Capaian"}
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Progress & Capaian Belajar Siswa
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pantau grafik kehadiran, catatan materi sesi bimbingan, evaluasi berkala tengah & akhir periode, serta target capaian belajar.
        </p>
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" ? (
        <ParentFilterBar />
      ) : (
        /* Tutor / Admin Filter Bar */
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <select
                value={tutorStudentId}
                onChange={(e) => setTutorStudentId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    Siswa: {s.name} ({s.program_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <select
                value={selectedProgramFilter}
                onChange={(e) => setSelectedProgramFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
              >
                <option value="Semua Program">Semua Program</option>
                <option value="Cermat Matematika">Cermat Matematika</option>
                <option value="English BEC">English BEC</option>
                <option value="Mengaji & Tahfidz">Mengaji & Tahfidz</option>
                <option value="Pracalis Calistung">Pracalis Calistung</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
            >
              <option value="Agustus 2026">Periode: Agustus 2026</option>
              <option value="Juli 2026">Periode: Juli 2026</option>
              <option value="September 2026">Periode: September 2026</option>
            </select>
          </div>
        </div>
      )}

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Taraf Kehadiran</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">100% Hadir</h3>
            <p className="text-xs text-emerald-600 font-semibold">Semua sesi terlaksana sesuai jadwal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-extrabold text-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Status Capaian Sesi</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Taraf Baik</h3>
            <p className="text-xs text-sky-600 font-semibold">Target materi tuntas dipahami</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-extrabold text-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Evaluasi Berkala</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">2 Laporan / Bulan</h3>
            <p className="text-xs text-purple-600 font-semibold">Tengah & Akhir Periode</p>
          </div>
        </div>
      </div>

      {/* Progress Bars per Program (e.g. 6/8 Pertemuan) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Progress Pertemuan Sesi Bulan Ini ({selectedPeriod})
            </h3>
            <p className="text-xs text-slate-500">
              Jumlah pertemuan yang telah diselesaikan terhadap kuota paket bulanan (4/8/12 sesi).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {programs.map((p) => {
            const pct = Math.min(100, Math.round(((p.completed_sessions_month || 0) / (p.package_sessions || 8)) * 100));
            return (
              <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-sm">{p.program_name}</span>
                  <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-lg">
                    {p.completed_sessions_month}/{p.package_sessions} Sesi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">📍 {p.unit_name} &bull; {p.class_type || "Semi Privat"}</p>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Kemajuan Kuota</span>
                    <span className="text-primary-700">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hasil Evaluasi Tengah Periode & Akhir Periode Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Hasil Evaluasi Berkala Siswa
            </h3>
            <p className="text-xs text-slate-500">
              Rangkuman capaian pembelajaran tengah periode (Sesi #4) dan akhir periode (Sesi #8 / #12)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Mid Period */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
                📌 Evaluasi Tengah Periode (Sesi #4)
              </span>
              <span className="text-[11px] font-bold text-slate-400">15 Agustus 2026</span>
            </div>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              "Ananda menunjukkan penguasaan konsep dasar KPK & FPB yang sangat baik. Mampu mengerjakan latihan soal pemahaman secara mandiri."
            </p>
            <div className="pt-2 border-t border-purple-100 text-[11px] text-purple-950 flex items-center justify-between">
              <span>🎯 Target Pertemuan Lanjutan: Soal Cerita HOTS</span>
              <span className="font-bold text-purple-700">Tuntas 100%</span>
            </div>
          </div>

          {/* Final Period */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                🏆 Evaluasi Akhir Periode (Sesi #8)
              </span>
              <span className="text-[11px] font-bold text-slate-400">28 Agustus 2026</span>
            </div>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              "Ananda telah menyelesaikan seluruh paket modul bulan berjalan dengan penguasaan pecahan campuran dan desimal yang sangat memuaskan."
            </p>
            <div className="pt-2 border-t border-emerald-100 text-[11px] text-emerald-950 flex items-center justify-between">
              <span>🎯 Rekomendasi: Masuk Materi Pengukuran & Geometri</span>
              <span className="font-bold text-emerald-700">Sangat Memuaskan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Jurnal Singkat Materi */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Riwayat Jurnal Singkat & Capaian Sesi
            </h3>
            <p className="text-xs text-slate-500">
              Catatan materi yang dipelajari dan target yang tuntas dicapai siswa
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {journals.map((j) => (
            <div
              key={j.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">{j.topic}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                    {j.program_name}
                  </span>
                  <span className="text-slate-400 text-[11px] font-medium">{formatDate(j.date)}</span>
                </div>
                <p className="text-slate-600 leading-relaxed max-w-2xl">{j.targets_achieved}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {j.score && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl">
                    Skor: {j.score}/100
                  </span>
                )}
                {j.fluency_rating && (
                  <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs rounded-xl">
                    Kelancaran: {j.fluency_rating}
                  </span>
                )}
                {j.memorization_surah && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-xl">
                    Hafalan: {j.memorization_surah}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
