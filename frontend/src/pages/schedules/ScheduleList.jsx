import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatTime, createWhatsAppUrl, WA_TEMPLATES } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Plus, Edit2, Trash2, CalendarDays, MessageCircle, Clock, MapPin, BookOpen, User } from "lucide-react";
import toast from "react-hot-toast";

export default function ScheduleList() {
  const { role } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [schedules, setSchedules] = useState([]);
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
  const [dayFilter, setDayFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    program_name: "Cermat Matematika",
    unit_name: "Unit Riscon Rancaekek",
    day_of_week: "Senin",
    start_time: "15:30",
    end_time: "17:00",
    subject: "Matematika SD",
    location_type: "offline",
    notes: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOptions = async () => {
    try {
      const [sRes, tRes, uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.TUTORS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST),
      ]);
      if (sRes.success) setStudents(sRes.data || []);
      if (tRes.success) setTutors(tRes.data || []);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setPrograms(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search,
        day: dayFilter
      };
      if (role === "parent" && selectedChildId) {
        params.student_id = selectedChildId;
      }
      if (role === "parent" && selectedProgram && selectedProgram !== "Semua Program") {
        params.program_name = selectedProgram;
      }

      const res = await request.get(API_ENDPOINTS.SCHEDULES.LIST, params);
      if (res.success) {
        setSchedules(res.data || []);
        setTotal(res.pagination?.total || res.data?.length || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat jadwal les");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dayFilter, role, selectedChildId, selectedProgram]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormData({
      student_id: students[0]?.id || "",
      tutor_id: tutors[0]?.id || "",
      program_name: programs[0]?.name || "Cermat Matematika",
      unit_name: units[0]?.name || "Unit Riscon Rancaekek",
      day_of_week: "Senin",
      start_time: "15:30",
      end_time: "17:00",
      subject: "Matematika",
      location_type: "offline",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sc) => {
    setEditingSchedule(sc);
    setFormData({
      student_id: sc.student_id,
      tutor_id: sc.tutor_id,
      program_name: sc.program_name || "Cermat Matematika",
      unit_name: sc.unit_name || "Unit Riscon Rancaekek",
      day_of_week: sc.day_of_week,
      start_time: sc.start_time.substring(0, 5),
      end_time: sc.end_time.substring(0, 5),
      subject: sc.subject,
      location_type: sc.location_type || "offline",
      notes: sc.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingSchedule) {
        const res = await request.put(API_ENDPOINTS.SCHEDULES.UPDATE(editingSchedule.id), formData);
        if (res.success) {
          toast.success("Jadwal les berhasil diperbarui!");
          setIsModalOpen(false);
          fetchSchedules();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.SCHEDULES.CREATE, formData);
        if (res.success) {
          toast.success("Jadwal les baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchSchedules();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan jadwal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.SCHEDULES.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Jadwal les berhasil dihapus.");
        setDeleteTarget(null);
        fetchSchedules();
      }
    } catch (err) {
      toast.error("Gagal menghapus jadwal");
    } finally {
      setIsDeleting(false);
    }
  };

  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Jadwal"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "tutor" ? "Jadwal Mengajar" : "Jadwal Les Bimbingan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "parent"
              ? "Semua jadwal bimbingan belajar ananda lengkap dengan label program dan unit belajar."
              : role === "tutor"
              ? "Jadwal resmi bimbingan mengajar yang diatur oleh Admin Lembaga Rumbala."
              : "Kelola alokasi jadwal bimbingan belajar antara siswa, program, tutor, dan unit."}
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-primary-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal Baru
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-72">
          <DebouncedSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari siswa, tutor, atau program..."
          />
        </div>

        {/* Day of week filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setDayFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              dayFilter === ""
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Semua Hari
          </button>
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setDayFilter(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                dayFilter === day
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedules Cards Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Tidak Ada Jadwal Bimbingan"
          description="Belum ada jadwal les yang sesuai dengan filter pencarian Anda."
          actionText={role === "admin" ? "Buat Jadwal Pertama" : undefined}
          onAction={role === "admin" ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((sc) => (
            <div
              key={sc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header Card: Program & Unit labels */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                      {sc.unit_name || "Unit Riscon Rancaekek"}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">
                      {sc.program_name || sc.subject}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-sky-100 text-sky-800 shrink-0">
                    {sc.day_of_week}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Siswa:</span>
                    <span className="font-extrabold text-slate-900">{sc.student_name}</span>
                    {sc.class_grade && (
                      <span className="text-[10px] text-slate-500">({sc.class_grade})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Waktu:</span>
                    <span className="font-bold text-slate-800">
                      {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Tutor:</span>
                    <span className="font-bold text-slate-800">{sc.tutor_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Lokasi:</span>
                    <span className="font-semibold text-slate-700">
                      {sc.location_type === "online" ? "🌐 Online Zoom" : `🏠 ${sc.unit_name || "Offline Unit"}`}
                    </span>
                  </div>

                  {sc.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg">
                      Catatan: {sc.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              {role === "admin" && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(sc)}
                    className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Jadwal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(sc)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form (Admin Only) */}
      {role === "admin" && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSchedule ? "Edit Jadwal Les" : "Tambah Jadwal Bimbingan Baru"}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Siswa
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">Pilih Siswa</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class_grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tutor Pengajar
                </label>
                <select
                  value={formData.tutor_id}
                  onChange={(e) => setFormData({ ...formData, tutor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">Pilih Tutor</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Program Les
                </label>
                <select
                  value={formData.program_name}
                  onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  {programs.length > 0 ? (
                    programs.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Cermat Matematika">Cermat Matematika</option>
                      <option value="English BEC">English BEC</option>
                      <option value="Mengaji & Tahfidz">Mengaji & Tahfidz</option>
                      <option value="Pracalis Calistung">Pracalis Calistung</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unit Cabang
                </label>
                <select
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  {units.length > 0 ? (
                    units.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Unit Riscon Rancaekek">Unit Riscon Rancaekek</option>
                      <option value="Unit Panorama Jatinangor">Unit Panorama Jatinangor</option>
                      <option value="Unit Rumah Belajar Pusat">Unit Rumah Belajar Pusat</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hari
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mata Pelajaran / Topik
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Contoh: Matematika SD Kelas 5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Metode Belajar
                </label>
                <select
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  <option value="offline">Offline di Unit</option>
                  <option value="online">Online Zoom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Catatan Jadwal (Opsional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Contoh: Ruang Belajar 1 / Bawa Modul Bab 2"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Jadwal Bimbingan"
        message={`Apakah Anda yakin ingin menghapus jadwal ${deleteTarget?.program_name || deleteTarget?.subject} untuk ${deleteTarget?.student_name}?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
