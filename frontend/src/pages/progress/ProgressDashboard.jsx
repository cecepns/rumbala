import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import { TableSkeleton } from "../../components/common/Skeleton";
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
  FileCheck2,
  Building2,
  BookmarkCheck,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProgressDashboard() {
  const { role } = useAuth();
  const { selectedChildId, selectedProgram, selectedChild } = useParentPortal();
  const [students, setStudents] = useState([]);
  const [units, setUnits] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for Tutor / Admin
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("Semua Program");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("Agustus 2026");

  const fetchOptions = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST)
      ]);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setProgramsList(pRes.data || []);

      if (role === "tutor") {
        const res = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) setSelectedStudentId(res.data[0].id);
        }
      } else if (role === "admin") {
        const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
        if (res.success && res.data) {
          setStudents(res.data);
          if (res.data.length > 0) setSelectedStudentId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgress = useCallback(async () => {
    const sId = role === "parent" ? (selectedChildId || 1) : selectedStudentId;
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
  }, [role, selectedChildId, selectedProgram, selectedStudentId, selectedProgramFilter]);

  useEffect(() => {
    fetchOptions();
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
          Pantau grafik kehadiran, catatan materi sesi bimbingan, evaluasi berkala per program, serta target capaian belajar.
        </p>
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" ? (
        <ParentFilterBar />
      ) : (
        /* Tutor / Admin Filter Bar */
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_grade})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Semua Program">Semua Program</option>
              {programsList.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">Semua Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Agustus 2026">Periode: Agustus 2026</option>
              <option value="Juli 2026">Periode: Juli 2026</option>
              <option value="September 2026">Periode: September 2026</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <div className="space-y-6">
          {/* Programs Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {programs.map((prog, idx) => {
              const completed = prog.completed_sessions || 0;
              const totalPackage = prog.package_sessions || 8;
              const pct = Math.min(100, Math.round((completed / totalPackage) * 100));

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                        {prog.unit_name || "Unit Riscon Rancaekek"}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        {prog.program_name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-purple-700">{prog.class_type || "Semi Privat"}</span> &bull; 👩‍🏫 Tutor: <strong>{prog.tutor_name || "Sarah Azzahra"}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-extrabold text-slate-900">{pct}%</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Tuntas</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">
                        Pertemuan {completed} dari {totalPackage} &ndash; {selectedPeriod}
                      </span>
                      <span className="text-primary-700">{totalPackage - completed} Sesi Tersisa</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Program Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Paket Belajar:</span>
                      <span className="font-extrabold text-slate-800">{totalPackage} Pertemuan / Bulan</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Sesi Terlaksana:</span>
                      <span className="font-extrabold text-emerald-900">{completed} Sesi Hadir</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Learning Journals in this Period */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Catatan Sesi Belajar Terlaksana ({journals.length} Sesi)
                </h3>
                <p className="text-xs text-slate-500">Materi dan evaluasi singkat pada periode {selectedPeriod}</p>
              </div>
            </div>

            <div className="space-y-3">
              {journals.map((j) => (
                <div
                  key={j.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          Pertemuan {j.session_number || 1} dari {j.package_total || 8}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">{j.topic}</span>
                      </div>
                      <p className="text-xs text-primary-700 font-semibold mt-0.5">{j.program_name}</p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">{formatDate(j.date)}</span>
                  </div>

                  {j.targets_achieved && (
                    <p className="text-xs text-slate-600">
                      <strong>Capaian:</strong> {j.targets_achieved}
                    </p>
                  )}

                  {j.homework && (
                    <p className="text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 inline-block">
                      <strong>PR:</strong> {j.homework}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
