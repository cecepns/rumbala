import React, { useState, useEffect, useCallback } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  UserCheck,
  Calendar,
  Download,
  Car,
  Clock,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";

export default function TutorAttendanceRecap() {
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({
    total_sessions: 0,
    home_visit_sessions: 0,
    total_hours: 0,
    total_teaching_fee: 0,
    total_transport: 0,
    total_honor: 0
  });
  const [tutors, setTutors] = useState([]);
  const [units, setUnits] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTutor, setSelectedTutor] = useState("");
  const [periodMonth, setPeriodMonth] = useState("2026-08");
  const [unitFilter, setUnitFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("Semua Program");
  const [search, setSearch] = useState("");

  const fetchOptions = async () => {
    try {
      const [tRes, uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.TUTORS.LIST),
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST)
      ]);
      if (tRes.success) setTutors(tRes.data || []);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setPrograms(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecapData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.TUTOR_ATTENDANCE.RECAP, {
        tutor_id: selectedTutor,
        period_month: periodMonth,
        unit_name: unitFilter,
        program_name: programFilter
      });
      if (res.success) {
        setSessions(res.data || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      toast.error("Gagal memuat rekap kehadiran tutor");
    } finally {
      setLoading(false);
    }
  }, [selectedTutor, periodMonth, unitFilter, programFilter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchRecapData();
  }, [fetchRecapData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (sessions.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      "Tanggal",
      "Nama Tutor",
      "Nama Siswa",
      "Kelas/Grade",
      "Program",
      "Unit Cabang",
      "Jenis Kelas",
      "Home Visit",
      "Jam Sesi",
      "Durasi (Menit)",
      "Fee Mengajar (Rp)",
      "Transport (Rp)",
      "Total Honor (Rp)",
      "Status Sesi"
    ];

    const rows = sessions.map((s) => [
      s.date ? new Date(s.date).toISOString().split("T")[0] : "",
      `"${s.tutor_name || ""}"`,
      `"${s.student_name || ""}"`,
      `"${s.class_grade || ""}"`,
      `"${s.program_name || ""}"`,
      `"${s.unit_name || ""}"`,
      `"${s.class_type || ""}"`,
      s.is_home_visit ? "Ya" : "Tidak",
      `"${s.start_time} - ${s.end_time}"`,
      s.duration_minutes || 90,
      s.tutor_session_fee || 0,
      s.tutor_transport_fee || 0,
      s.tutor_total_honor || 0,
      "Hadir Terlaksana"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Kehadiran_Tutor_${periodMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("File spreadsheet CSV berhasil diunduh!");
  };

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.tutor_name?.toLowerCase().includes(q) ||
      s.student_name?.toLowerCase().includes(q) ||
      s.program_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Audit Sesi Mengajar
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Rekap Kehadiran Tutor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data rekap presensi seluruh sesi bimbingan yang benar-benar terlaksana sebagai basis perhitungan honor tutor & transport.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export ke Spreadsheet (CSV)
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sesi Terlaksana</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{summary.total_sessions} Sesi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Total {summary.total_hours} Jam Mengajar</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sesi Privat Home Visit</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-purple-700">{summary.home_visit_sessions} Sesi</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-purple-600 font-semibold mt-1">+Transport: {formatRupiah(summary.total_transport)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Fee Mengajar</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-800">{formatRupiah(summary.total_teaching_fee)}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Akumulasi tarif mengajar</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grand Total Honor Sesi</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{formatRupiah(summary.total_honor)}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">Fee Mengajar + Transport</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <DebouncedSearch
          placeholder="Cari tutor, siswa, mapel..."
          onSearch={setSearch}
          className="w-full"
        />

        <div>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
          >
            <option value="2026-08">Periode: Agustus 2026</option>
            <option value="2026-07">Periode: Juli 2026</option>
            <option value="2026-09">Periode: September 2026</option>
          </select>
        </div>

        <div>
          <select
            value={selectedTutor}
            onChange={(e) => setSelectedTutor(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
          >
            <option value="">Semua Tutor</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
          >
            <option value="">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
          >
            <option value="Semua Program">Semua Program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Tutor Pengajar</th>
                  <th className="py-3.5 px-4">Siswa Bimbingan</th>
                  <th className="py-3.5 px-4">Program & Unit</th>
                  <th className="py-3.5 px-4">Jenis Kelas</th>
                  <th className="py-3.5 px-4">Fee Mengajar</th>
                  <th className="py-3.5 px-4">Transport</th>
                  <th className="py-3.5 px-4 font-extrabold text-right">Total Honor Sesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-800">{formatDate(s.date)}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {s.start_time} - {s.end_time} ({s.duration_minutes || 90}m)
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-800">{s.tutor_name}</p>
                      <p className="text-[10px] text-slate-400">{s.tutor_phone || ""}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{s.student_name}</p>
                      <p className="text-[10px] text-slate-400">{s.class_grade}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-primary-700">{s.program_name}</p>
                      <p className="text-[10px] text-slate-500">{s.unit_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          s.is_home_visit
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.class_type || "Semi Privat"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{formatRupiah(s.tutor_session_fee)}</td>
                    <td className="py-3 px-4">
                      {s.is_home_visit ? (
                        <span className="font-bold text-purple-700">+{formatRupiah(s.tutor_transport_fee)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700 text-right">
                      {formatRupiah(s.tutor_total_honor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={UserCheck}
            title="Tidak Ada Riwayat Sesi"
            description="Belum ada data sesi mengajar yang terlaksana pada filter ini."
          />
        )}
      </div>
    </div>
  );
}
