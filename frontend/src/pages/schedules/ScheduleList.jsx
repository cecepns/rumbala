import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatTime, createWhatsAppUrl, WA_TEMPLATES } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Plus, Edit2, Trash2, CalendarDays, MessageCircle, Clock, MapPin } from "lucide-react";
import toast from "react-hot-toast";

export default function ScheduleList() {
  const { role } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
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
    day_of_week: "Senin",
    start_time: "15:30",
    end_time: "17:00",
    subject: "",
    location_type: "offline",
    notes: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOptions = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.TUTORS.LIST, { limit: 100 })
      ]);
      if (sRes.success) setStudents(sRes.data || []);
      if (tRes.success) setTutors(tRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.SCHEDULES.LIST, {
        page,
        limit,
        search,
        day: dayFilter
      });
      if (res.success) {
        setSchedules(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat jadwal les");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dayFilter]);

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
      day_of_week: "Senin",
      start_time: "15:30",
      end_time: "17:00",
      subject: "",
      location_type: "offline",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      student_id: schedule.student_id,
      tutor_id: schedule.tutor_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.substring(0, 5),
      end_time: schedule.end_time.substring(0, 5),
      subject: schedule.subject,
      location_type: schedule.location_type,
      notes: schedule.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
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

  const handleSendReminderWA = (schedule) => {
    const student = {
      name: schedule.student_name,
      parent_name: schedule.student_name,
      parent_phone: schedule.parent_phone
    };
    const message = WA_TEMPLATES.SCHEDULE_REMINDER(schedule, student, { name: schedule.tutor_name });
    const url = createWhatsAppUrl(schedule.parent_phone, message);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Jadwal Bimbingan Les
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur hari, jam bimbingan, tutor, dan kirim pengingat jadwal 1-klik ke WhatsApp.
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal Baru
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari siswa, tutor, atau mapel..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={dayFilter}
            onChange={(e) => {
              setDayFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Semua Hari</option>
            <option value="Senin">Senin</option>
            <option value="Selasa">Selasa</option>
            <option value="Rabu">Rabu</option>
            <option value="Kamis">Kamis</option>
            <option value="Jumat">Jumat</option>
            <option value="Sabtu">Sabtu</option>
            <option value="Minggu">Minggu</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : schedules.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Hari & Jam</th>
                  <th className="py-3.5 px-4">Siswa</th>
                  <th className="py-3.5 px-4">Tutor Pengajar</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4">Metode & Lokasi</th>
                  <th className="py-3.5 px-4 text-right">Aksi & Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block text-xs">{sc.day_of_week}</span>
                      <span className="text-[11px] text-primary-700 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{sc.student_name}</p>
                      <p className="text-[11px] text-slate-400">{sc.class_grade}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700">{sc.tutor_name}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold text-[11px]">
                        {sc.subject}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {sc.location_type === "online" ? "🌐 Online Zoom" : "🏠 Offline di Rumah"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendReminderWA(sc)}
                          title="Kirim Pengingat Jadwal ke WA Orang Tua"
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ingatkan WA</span>
                        </button>

                        {role !== "parent" && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(sc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {role === "admin" && (
                              <button
                                onClick={() => setDeleteTarget(sc)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Tidak Ada Jadwal"
            description="Belum ada jadwal les yang terdaftar untuk filter ini."
            actionText={role !== "parent" ? "Tambah Jadwal Baru" : undefined}
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

      {/* Create / Edit Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? "Ubah Jadwal Les" : "Tambah Jadwal Les Baru"}
        subtitle="Tentukan siswa, tutor, hari, dan waktu sesi"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Siswa *
              </label>
              <select
                required
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
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
                Pilih Tutor *
              </label>
              <select
                required
                value={formData.tutor_id}
                onChange={(e) => setFormData({ ...formData, tutor_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Pilih Tutor</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Hari Les *
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jam Mulai *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jam Selesai *
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mata Pelajaran *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Contoh: Matematika / IPA"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Metode / Lokasi Les
              </label>
              <select
                value={formData.location_type}
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="offline">Offline di Rumah Siswa</option>
                <option value="online">Online via Zoom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Lokasi / Persiapan
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Contoh: Alamat rumah siswa..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
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
              {isSaving ? "Menyimpan..." : editingSchedule ? "Perbarui Jadwal" : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Jadwal Les"
        message={`Apakah Anda yakin ingin menghapus jadwal les "${deleteTarget?.subject}" hari ${deleteTarget?.day_of_week}?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
