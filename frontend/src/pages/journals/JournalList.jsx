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
  ArrowRight,
  Building2,
  BookmarkCheck,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

export default function JournalList() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("Semua Program");
  const [periodFilter, setPeriodFilter] = useState("Agustus 2026");

  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const params = { search, period: periodFilter };

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
  }, [search, role, selectedChildId, selectedProgram, programFilter, periodFilter]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // Render flexible evaluation rubric badge or cards
  const renderEvaluationRubric = (j) => {
    const rubric = j.evaluation_json || {};
    const hasRubric = Object.keys(rubric).length > 0;

    if (hasRubric) {
      return (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
            Rubrik Capaian Pembelajaran:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(rubric).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                <span className="font-bold text-slate-800 text-[11px]">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {j.score && (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-600" /> Nilai Sesi: {j.score}/100
          </span>
        )}
        {j.fluency_rating && (
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-100">
            Kelancaran: {j.fluency_rating}
          </span>
        )}
        {j.makhraj_rating && (
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-semibold border border-purple-100">
            Makhraj/Tajwid: {j.makhraj_rating}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
          {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Jurnal"}
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          {role === "parent" ? "Jurnal Belajar Ananda" : "Jurnal Mengajar & Evaluasi Singkat"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Catatan materi pembelajaran, capaian ringkas per pertemuan (Pertemuan X dari Y – Periode), tugas rumah, dan evaluasi fleksibel per program.
        </p>
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <DebouncedSearch
            onSearch={setSearch}
            placeholder="Cari materi, topik, atau capaian..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Periode Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-600 shrink-0" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua Periode">Semua Periode</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
            </select>
          </div>

          {role !== "parent" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Program:</label>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="Semua Program">Semua Program</option>
                <option value="Cermat Matematika">Cermat Matematika</option>
                <option value="English BEC">English BEC</option>
                <option value="Prisma Kalkulator Tangan">Prisma Kalkulator Tangan</option>
                <option value="Mengaji & Tahsin">Mengaji & Tahsin</option>
                <option value="Tahfidz Quran">Tahfidz Quran</option>
              </select>
            </div>
          )}
        </div>
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
                {/* Header: Session X of Y – Period */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-extrabold">
                        Pertemuan {j.session_number || 1} dari {j.package_total || 8} &ndash; {j.period_month || "Agustus 2026"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {formatDate(j.date)}
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900 mt-1">
                      {j.topic || "Materi Pembelajaran"}
                    </h2>

                    <p className="text-xs font-semibold text-primary-700">
                      {j.program_name} &bull; <span className="text-slate-800">{j.student_name}</span> ({j.class_grade})
                    </p>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                    {j.unit_name || "Unit Riscon"}
                  </span>
                </div>

                {/* Body Content */}
                <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                  {/* Targets Achieved */}
                  {j.targets_achieved && (
                    <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed"><strong>Capaian Sesi:</strong> {j.targets_achieved}</p>
                    </div>
                  )}

                  {/* Flexible Evaluation Rubrics */}
                  {renderEvaluationRubric(j)}

                  {/* Homework */}
                  {j.homework && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-amber-950">
                      <BookmarkCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p><strong>PR / Latihan Mandiri di Buku Fisik:</strong> {j.homework}</p>
                    </div>
                  )}

                  {/* Progress Notes */}
                  {j.progress_notes && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 italic">
                      "{j.progress_notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Tutor signature */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>👩‍🏫 Tutor: <strong>{j.tutor_name || "Tutor Pengajar"}</strong></span>
                <span className="text-emerald-700 font-bold">✓ Terverifikasi Presensi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
