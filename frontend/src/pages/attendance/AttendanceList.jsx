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
  User
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
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    program_name: "Cermat Matematika",
    unit_name: "Unit Riscon Rancaekek",
    date: new Date().toISOString().split("T")[0],
    start_time: "15:30",
    end_time: "17:00",
    status: "hadir",
    notes: "",
    session_number: 1,
    package_total: 8,
    // Integrated Teaching Journal
    topic: "",
    targets_achieved: "",
    score: 85,
    fluency_rating: "Baik",
    makhraj_rating: "Sesuai Kaidah",
    tajwid_rating: "Menguasai",
    memorization_surah: "",
    murojaah_status: "Lancar",
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
  }, [page, limit, search, dateFilter, statusFilter, role, selectedChildId, selectedProgram]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const handleOpenCreate = () => {
    const firstStudent = students[0];
    setFormData({
      student_id: firstStudent?.id || "",
      tutor_id: user?.tutor_id || tutors[0]?.id || "",
      program_name: firstStudent?.program_name || programs[0]?.name || "Cermat Matematika",
      unit_name: firstStudent?.unit_name || units[0]?.name || "Unit Riscon Rancaekek",
      date: new Date().toISOString().split("T")[0],
      start_time: "15:30",
      end_time: "17:00",
      status: "hadir",
      notes: "",
      session_number: (firstStudent?.completed_sessions_month || 0) + 1,
      package_total: firstStudent?.package_sessions || 8,
      topic: "",
      targets_achieved: "",
      score: 85,
      fluency_rating: "Baik",
      makhraj_rating: "Sesuai Kaidah",
      tajwid_rating: "Menguasai",
      memorization_surah: "",
      murojaah_status: "Lancar",
      progress_notes: "",
      homework: "",
      next_target: ""
    });
    setIsModalOpen(true);
  };

  const handleStudentChangeInForm = (studentId) => {
    const st = students.find((s) => s.id === Number(studentId));
    setFormData((prev) => ({
      ...prev,
      student_id: studentId,
      program_name: st?.program_name || prev.program_name,
      unit_name: st?.unit_name || prev.unit_name,
      session_number: (st?.completed_sessions_month || 0) + 1,
      package_total: st?.package_sessions || 8,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await request.post(API_ENDPOINTS.ATTENDANCES.CREATE, formData);
      if (res.success) {
        toast.success(res.message || "Presensi sesi berhasil dicatat!");
        setIsModalOpen(false);
        fetchAttendances();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mencatat kehadiran");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "hadir":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Hadir
          </span>
        );
      case "izin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Izin
          </span>
        );
      case "sakit":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Sakit (Pengecualian)
          </span>
        );
      case "alfa":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Alfa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Absensi"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "parent" ? "Riwayat Kehadiran & Pertemuan" : "Pencatatan Kehadiran Siswa"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "parent"
              ? "Riwayat sesi bimbingan belajar ananda per program beserta status kehadiran dan materi tuntas."
              : "Catat presensi dan jurnal sesi pembelajaran siswa asuhan Anda di Rumbala."}
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Kehadiran Sesi
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-72">
          <DebouncedSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari siswa, program, atau tutor..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alfa">Alfa</option>
          </select>
        </div>
      </div>

      {/* Attendances Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : attendances.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Belum Ada Riwayat Kehadiran"
            description="Riwayat presensi pertemuan sesi les akan ditampilkan di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Siswa & Program</th>
                  <th className="px-6 py-4">Pertemuan & Paket</th>
                  <th className="px-6 py-4">Tanggal & Waktu</th>
                  <th className="px-6 py-4">Tutor & Unit</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Materi Pembelajaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-extrabold text-slate-900 text-sm">{att.student_name}</p>
                      <span className="inline-block mt-0.5 text-[11px] font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                        {att.program_name || "Cermat Matematika"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                        {att.program_name} – Pertemuan #{att.session_number || 1}
                        <span className="text-slate-400 font-semibold">/{att.package_total || 8}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{formatDate(att.date)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatTime(att.start_time)} - {formatTime(att.end_time)} WIB
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{att.tutor_name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {att.unit_name || "Unit Riscon Rancaekek"}
                      </p>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(att.status)}</td>
                    <td className="px-6 py-4 max-w-xs">
                      {att.topic ? (
                        <div>
                          <p className="font-bold text-slate-800">{att.topic}</p>
                          <p className="text-[11px] text-slate-500 truncate">{att.targets_achieved}</p>
                          {att.score && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Nilai: {att.score}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Tidak ada catatan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={setLimit}
          totalItems={total}
        />
      </div>

      {/* Modal Catat Absensi (Tutor/Admin) */}
      {role !== "parent" && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Catat Kehadiran & Jurnal Pembelajaran Sesi"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih Siswa
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => handleStudentChangeInForm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">Pilih Siswa</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.program_name || s.class_grade})
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="Cermat Matematika">Cermat Matematika</option>
                  <option value="English BEC">English BEC</option>
                  <option value="Mengaji & Tahfidz">Mengaji & Tahfidz</option>
                  <option value="Pracalis Calistung">Pracalis Calistung</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unit Cabang
                </label>
                <select
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Unit Riscon Rancaekek">Unit Riscon Rancaekek</option>
                  <option value="Unit Panorama Jatinangor">Unit Panorama Jatinangor</option>
                  <option value="Unit Rumah Belajar Pusat">Unit Rumah Belajar Pusat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pertemuan Ke-
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.session_number}
                  onChange={(e) => setFormData({ ...formData, session_number: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Total Paket Bulan Ini
                </label>
                <select
                  value={formData.package_total}
                  onChange={(e) => setFormData({ ...formData, package_total: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value={4}>Paket 4 Sesi/Bulan</option>
                  <option value={8}>Paket 8 Sesi/Bulan</option>
                  <option value={12}>Paket 12 Sesi/Bulan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Pertemuan
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Status Presensi
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="hadir">Hadir (Sesi Terlaksana)</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alfa">Alfa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Waktu
                </label>
                <input
                  type="text"
                  value={`${formData.start_time} - ${formData.end_time}`}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
                />
              </div>
            </div>

            {/* Integrated Journal Section */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary-600" />
                Catatan Jurnal Pembelajaran Sesi Ini
              </span>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Materi / Topik Pembelajaran
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Contoh: Operasi Pecahan Campuran / Tahsin Surah Al-Mulk"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  required={formData.status === "hadir"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Capaian & Target Tercapai
                </label>
                <textarea
                  rows={2}
                  value={formData.targets_achieved}
                  onChange={(e) => setFormData({ ...formData, targets_achieved: e.target.value })}
                  placeholder="Contoh: Mampu menyelesaikan 10 soal cerita KPK dengan tepat..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  required={formData.status === "hadir"}
                />
              </div>

              {/* Dynamic Rubric based on program */}
              {formData.program_name.includes("Mengaji") || formData.program_name.includes("Tahfidz") ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Kelancaran & Makhraj
                    </label>
                    <select
                      value={formData.fluency_rating}
                      onChange={(e) => setFormData({ ...formData, fluency_rating: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="Sangat Lancar">Sangat Lancar</option>
                      <option value="Baik / Lancar">Baik / Lancar</option>
                      <option value="Perlu Latihan">Perlu Latihan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Setoran Surah / Ayat
                    </label>
                    <input
                      type="text"
                      value={formData.memorization_surah}
                      onChange={(e) => setFormData({ ...formData, memorization_surah: e.target.value })}
                      placeholder="Surah Al-Mulk ayat 1-5"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Nilai Sesi (0 - 100) (Opsional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.score || ""}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="85"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Tugas Rumah / PR
                    </label>
                    <input
                      type="text"
                      value={formData.homework}
                      onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                      placeholder="Modul Rumbala Hal 15"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Presensi & Jurnal"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
