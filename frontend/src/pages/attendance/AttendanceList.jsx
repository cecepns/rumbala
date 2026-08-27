import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  CheckSquare,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  MapPin,
  Sparkles,
  User,
  Building2,
  Car,
  Home
} from "lucide-react";
import toast from "react-hot-toast";

export default function AttendanceList() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [attendances, setAttendances] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [units, setUnits] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Agustus 2026");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    program_name: "Cermat Matematika",
    unit_name: "Unit Riscon Rancaekek",
    class_type: "Semi Privat",
    is_home_visit: 0,
    date: new Date().toISOString().split("T")[0],
    start_time: "15:30",
    end_time: "17:00",
    duration_minutes: 90,
    status: "hadir",
    notes: "",
    session_number: 1,
    package_total: 8,
    // Integrated Brief Teaching Journal
    topic: "",
    targets_achieved: "",
    score: 85,
    progress_notes: "",
    homework: "",
    next_target: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchOptions = async () => {
    try {
      if (role === "tutor") {
        const sRes = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (sRes.success) setStudents(sRes.data || []);
      } else {
        const sRes = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
        if (sRes.success) setStudents(sRes.data || []);
      }

      const [tRes, uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.TUTORS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST),
      ]);
      if (tRes.success) setTutors(tRes.data || []);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setPrograms(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendances = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search,
        date: dateFilter,
        period: periodFilter,
        status: statusFilter
      };

      if (role === "parent") {
        if (selectedChildId) params.student_id = selectedChildId;
        if (selectedProgram && selectedProgram !== "Semua Program") params.program_name = selectedProgram;
      }

      const res = await request.get(API_ENDPOINTS.ATTENDANCES.LIST, params);
      if (res.success) {
        setAttendances(res.data || []);
        setTotal(res.pagination?.total || res.data?.length || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dateFilter, periodFilter, statusFilter, role, selectedChildId, selectedProgram]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const handleOpenCreate = () => {
    const firstStudent = students[0];
    const initialProg = firstStudent?.programs?.[0] || firstStudent;
    setFormData({
      student_id: firstStudent?.id || "",
      tutor_id: user?.tutor_id || firstStudent?.tutor_id || tutors[0]?.id || "",
      program_name: initialProg?.program_name || programs[0]?.name || "Cermat Matematika",
      unit_name: initialProg?.unit_name || units[0]?.name || "Unit Riscon Rancaekek",
      class_type: initialProg?.class_type || "Semi Privat",
      is_home_visit: initialProg?.class_type === "Privat Home Visit" ? 1 : 0,
      date: new Date().toISOString().split("T")[0],
      start_time: "15:30",
      end_time: "17:00",
      duration_minutes: 90,
      status: "hadir",
      notes: "",
      session_number: (initialProg?.completed_sessions_month || 0) + 1,
      package_total: initialProg?.package_sessions || 8,
      topic: "",
      targets_achieved: "",
      score: 85,
      progress_notes: "",
      homework: "",
      next_target: ""
    });
    setIsModalOpen(true);
  };

  const handleStudentChangeInForm = (studentId) => {
    const st = students.find((s) => s.id === parseInt(studentId));
    const prog = st?.programs?.[0] || st;
    setFormData((prev) => ({
      ...prev,
      student_id: studentId,
      program_name: prog?.program_name || prev.program_name,
      unit_name: prog?.unit_name || prev.unit_name,
      class_type: prog?.class_type || prev.class_type,
      is_home_visit: prog?.class_type === "Privat Home Visit" ? 1 : 0,
      session_number: (prog?.completed_sessions_month || 0) + 1,
      package_total: prog?.package_sessions || 8,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const isHome = formData.class_type === "Privat Home Visit" ? 1 : 0;
      const res = await request.post(API_ENDPOINTS.ATTENDANCES.CREATE, {
        ...formData,
        is_home_visit: isHome
      });
      if (res.success) {
        toast.success("Presensi dan catatan belajar berhasil disimpan!");
        setIsModalOpen(false);
        fetchAttendances();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan absensi");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "hadir":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" /> Hadir Terlaksana</span>;
      case "izin":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Izin</span>;
      case "sakit":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800"><AlertCircle className="w-3 h-3" /> Sakit</span>;
      case "alfa":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800"><XCircle className="w-3 h-3" /> Alfa</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Presensi"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "parent" ? "Riwayat Kehadiran Ananda" : "Absensi & Presensi Sesi Bimbingan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sesi yang benar-benar terlaksana (Hadir) menjadi dasar perhitungan progress siswa, rekap kehadiran, dan honor tutor.
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Kehadiran Baru
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nama siswa, materi, topik..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Filter Periode Bulanan */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-primary-600 shrink-0" />
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua Periode">Semua Periode</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
            </select>
          </div>

          <input
            type="date"
            title="Filter Tanggal Spesifik"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
          >
            <option value="">Semua Status Sesi</option>
            <option value="hadir">Hadir Terlaksana</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alfa">Alfa</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : attendances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal & Jam</th>
                  <th className="py-3.5 px-4">Siswa & Kelas</th>
                  <th className="py-3.5 px-4">Tutor Pengajar</th>
                  <th className="py-3.5 px-4">Program & Unit</th>
                  <th className="py-3.5 px-4">Jenis Kelas</th>
                  <th className="py-3.5 px-4 text-center">Pertemuan Ke</th>
                  <th className="py-3.5 px-4 text-center">Status Sesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-slate-900">{formatDate(att.date)}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatTime(att.start_time)} - {formatTime(att.end_time)}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-slate-800">{att.student_name}</p>
                      <p className="text-[10px] text-slate-400">{att.class_grade}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{att.tutor_name || "Tutor"}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-primary-700">{att.program_name}</p>
                      <p className="text-[10px] text-slate-500">{att.unit_name}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          att.is_home_visit
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {att.class_type || "Semi Privat"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs border border-indigo-100">
                        {att.session_number || 1} / {att.package_total || 8}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(att.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CheckSquare}
            title="Tidak Ada Riwayat Absensi"
            description="Belum ada catatan kehadiran yang tersimpan."
            actionText={role !== "parent" ? "Catat Kehadiran Baru" : undefined}
            onAction={role !== "parent" ? handleOpenCreate : undefined}
          />
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* Modal Add Attendance & Teaching Journal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Kehadiran & Jurnal Sesi"
        subtitle="Presensi sesi bimbingan belajar dan ringkasan materi harian"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Siswa & Program *
              </label>
              <select
                value={formData.student_id}
                onChange={(e) => handleStudentChangeInForm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500/20"
                required
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.class_type || "Semi Privat"} ({s.program_name || s.class_grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Program Les
              </label>
              <select
                value={formData.program_name}
                onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jenis Kelas
              </label>
              <select
                value={formData.class_type}
                onChange={(e) => {
                  const ct = e.target.value;
                  setFormData({
                    ...formData,
                    class_type: ct,
                    is_home_visit: ct === "Privat Home Visit" ? 1 : 0
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="Semi Privat">Semi Privat</option>
                <option value="Privat di Tempat Les">Privat di Tempat Les</option>
                <option value="Online Privat">Online Privat</option>
                <option value="Privat Home Visit">Privat Home Visit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unit / Lokasi
              </label>
              <select
                value={formData.unit_name}
                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pertemuan X dari Y
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.session_number}
                  onChange={(e) => setFormData({ ...formData, session_number: parseInt(e.target.value) })}
                  className="w-14 px-2 py-2 border border-slate-200 rounded-xl text-xs font-bold text-center"
                />
                <span className="text-xs text-slate-400 font-bold">/</span>
                <select
                  value={formData.package_total}
                  onChange={(e) => setFormData({ ...formData, package_total: parseInt(e.target.value) })}
                  className="flex-1 px-2 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value={4}>4 Sesi</option>
                  <option value={8}>8 Sesi</option>
                  <option value={12}>12 Sesi</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Pertemuan *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                required
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Kehadiran *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50/50"
              >
                <option value="hadir">Hadir (Sesi Terlaksana)</option>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
                <option value="alfa">Alfa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Waktu Sesi
              </label>
              <input
                type="text"
                value={`${formData.start_time} - ${formData.end_time} (${formData.duration_minutes}m)`}
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
              />
            </div>
          </div>

          {/* Integrated Brief Journal */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary-600" />
              Catatan Jurnal Sesi (Ringkas):
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Materi / Topik Pembelajaran *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Contoh: Operasi Pecahan / Phonics / Tahsin Surah Al-Mulk"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                required={formData.status === "hadir"}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Capaian Singkat Sesi Ini
              </label>
              <textarea
                rows={2}
                value={formData.targets_achieved}
                onChange={(e) => setFormData({ ...formData, targets_achieved: e.target.value })}
                placeholder="Contoh: Mampu menyelesaikan latihan dengan baik dan mandiri..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tugas Rumah / PR (Jika Ada)
                </label>
                <input
                  type="text"
                  value={formData.homework}
                  onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                  placeholder="Latihan hal. 14 no 1-5 di buku fisik"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan Khusus Sesi
                </label>
                <input
                  type="text"
                  value={formData.progress_notes}
                  onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                  placeholder="Ananda sangat antusias belajar"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Presensi"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
