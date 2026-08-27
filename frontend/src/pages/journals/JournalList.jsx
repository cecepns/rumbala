import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import EmptyState from "../../components/common/EmptyState";
import { TableSkeleton } from "../../components/common/Skeleton";
import {
  BookOpenCheck,
  Calendar,
  User,
  Award,
  BookOpen,
  Sparkles,
  CheckCircle,
  FileText,
  Target,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function JournalList() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("Semua Program");

  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const params = { search };

      if (role === "parent") {
        if (selectedChildId) params.student_id = selectedChildId;
        if (selectedProgram && selectedProgram !== "Semua Program") params.program_name = selectedProgram;
      } else if (programFilter !== "Semua Program") {
        params.program_name = programFilter;
      }

      const res = await request.get(API_ENDPOINTS.JOURNALS.LIST, params);
      if (res.success) {
        setJournals(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat jurnal pembelajaran");
    } finally {
      setLoading(false);
    }
  }, [search, role, selectedChildId, selectedProgram, programFilter]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
          {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Jurnal"}
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          {role === "parent" ? "Jurnal Belajar Ananda" : "Jurnal Mengajar & Evaluasi Sesi"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {role === "parent"
            ? "Catatan detail materi, target yang tuntas dicapai, nilai/rubrik capaian, tugas rumah, dan target pertemuan berikutnya per program."
            : "Riwayat pencatatan materi pembelajaran dan evaluasi capaian siswa per sesi les."}
        </p>
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <DebouncedSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari materi, topik, atau capaian..."
          />
        </div>

        {role !== "parent" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Program:</label>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Semua Program">Semua Program</option>
              <option value="Cermat Matematika">Cermat Matematika</option>
              <option value="English BEC">English BEC</option>
              <option value="Mengaji & Tahfidz">Mengaji & Tahfidz</option>
              <option value="Pracalis Calistung">Pracalis Calistung</option>
            </select>
          </div>
        )}
      </div>

      {/* Journals Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : journals.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Belum Ada Catatan Jurnal Belajar"
          description="Catatan materi pembelajaran dan evaluasi sesi akan ditampilkan di sini."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {journals.map((j) => (
            <div
              key={j.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Student, Program, Session x of y */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                        {j.unit_name || "Unit Riscon Rancaekek"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {formatDate(j.date)}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      {j.topic}
                    </h3>
                    <p className="text-xs font-semibold text-primary-700 mt-0.5">
                      {j.program_name} &bull; <span className="text-slate-700">{j.student_name}</span>
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                    Pertemuan #{j.session_number || 1}/{j.package_total || 8}
                  </span>
                </div>

                {/* Achieved Targets */}
                <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Target & Capaian Sesi:
                    </span>
                    <p className="mt-1 font-medium text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {j.targets_achieved}
                    </p>
                  </div>

                  {/* Progress Notes */}
                  {j.progress_notes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Catatan Tutor:
                      </span>
                      <p className="mt-0.5 text-slate-600 italic leading-relaxed">
                        "{j.progress_notes}"
                      </p>
                    </div>
                  )}

                  {/* Rubric and Evaluation Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {j.score && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        Skor: {j.score}/100
                      </span>
                    )}
                    {j.fluency_rating && (
                      <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs">
                        Kelancaran: {j.fluency_rating}
                      </span>
                    )}
                    {j.makhraj_rating && (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs">
                        Makhraj: {j.makhraj_rating}
                      </span>
                    )}
                    {j.tajwid_rating && (
                      <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">
                        Tajwid: {j.tajwid_rating}
                      </span>
                    )}
                    {j.memorization_surah && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs">
                        Setoran: {j.memorization_surah}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Homework & Next Target Footer */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {j.homework && (
                  <div className="p-2 rounded-lg bg-amber-50/60 text-amber-900 border border-amber-100">
                    <span className="font-bold">📝 PR / Tugas:</span> {j.homework}
                  </div>
                )}
                {j.next_target && (
                  <div className="p-2 rounded-lg bg-sky-50/60 text-sky-900 border border-sky-100">
                    <span className="font-bold">🎯 Target Selanjutnya:</span> {j.next_target}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
