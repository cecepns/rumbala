import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatTime, createWhatsAppUrl } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  Plus,
  Edit2,
  Trash2,
  CalendarDays,
  MessageCircle,
  Clock,
  MapPin,
  BookOpen,
  User,
  Home,
  Globe,
  Building2,
  Car,
  BellRing,
  UserCheck
} from "lucide-react";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const CLASS_TYPES = [
  "Semi Privat",
  "Privat di Tempat Les",
  "Online Privat",
  "Online Semi Privat",
  "Privat Home Visit"
];

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
  const [unitFilter, setUnitFilter] = useState("");
  const [classTypeFilter, setClassTypeFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    program_name: "Cermat Matematika",
    unit_name: "Unit Riscon Rancaekek",
    class_type: "Semi Privat",
    day_of_week: "Senin",
    start_time: "15:30",
    end_time: "17:00",
    duration_minutes: 90,
    subject: "Matematika",
    location_type: "offline",
    is_home_visit: 0,
    home_address: "",
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
        day_of_week: dayFilter,
        unit_name: unitFilter
      };
      if (role === "parent" && selectedChildId) {
        params.student_id = selectedChildId;
      }
      if (role === "parent" && selectedProgram && selectedProgram !== "Semua Program") {
        params.program_name = selectedProgram;
      }

      const res = await request.get(API_ENDPOINTS.SCHEDULES.LIST, params);
      if (res.success) {
        let list = res.data || [];
        if (classTypeFilter) {
          list = list.filter((s) => s.class_type === classTypeFilter);
        }
        setSchedules(list);
        setTotal(list.length);
        setTotalPages(Math.ceil(list.length / limit) || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat jadwal les");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dayFilter, unitFilter, classTypeFilter, role, selectedChildId, selectedProgram]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    const firstStudent = students[0];
    setFormData({
      student_id: firstStudent?.id || "",
      tutor_id: tutors[0]?.id || "",
      program_name: firstStudent?.programs?.[0]?.program_name || programs[0]?.name || "Cermat Matematika",
      unit_name: firstStudent?.programs?.[0]?.unit_name || units[0]?.name || "Unit Riscon Rancaekek",
      class_type: firstStudent?.programs?.[0]?.class_type || "Semi Privat",
      day_of_week: "Senin",
      start_time: "15:30",
      end_time: "17:00",
      duration_minutes: 90,
      subject: "Matematika",
      location_type: "offline",
      is_home_visit: 0,
      home_address: firstStudent?.address || "",
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
      class_type: sc.class_type || "Semi Privat",
      day_of_week: sc.day_of_week,
      start_time: sc.start_time?.substring(0, 5) || "15:30",
      end_time: sc.end_time?.substring(0, 5) || "17:00",
      duration_minutes: sc.duration_minutes || 90,
      subject: sc.subject || sc.program_name,
      location_type: sc.location_type || "offline",
      is_home_visit: sc.is_home_visit || (sc.class_type === "Privat Home Visit" ? 1 : 0),
      home_address: sc.home_address || "",
      notes: sc.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const isHome = formData.class_type === "Privat Home Visit" ? 1 : 0;
      const isOnline = formData.class_type.includes("Online");
      const payload = {
        ...formData,
        is_home_visit: isHome,
        location_type: isOnline ? "online" : "offline",
        unit_name: isOnline ? "Online Zoom / Meet" : isHome ? "Rumah Siswa (Home Visit)" : formData.unit_name
      };

      if (editingSchedule) {
        const res = await request.put(API_ENDPOINTS.SCHEDULES.UPDATE(editingSchedule.id), payload);
        if (res.success) {
          toast.success("Jadwal les berhasil diperbarui!");
          setIsModalOpen(false);
          fetchSchedules();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.SCHEDULES.CREATE, payload);
        if (res.success) {
          toast.success("Jadwal les baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchSchedules();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan jadwal les");
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

  // WhatsApp Reminder Sender
  const handleSendReminderWA = (sc, targetType = "parent") => {
    const phone = targetType === "parent" ? sc.parent_phone : sc.tutor_phone;
    if (!phone) {
      toast.error(`Nomor WhatsApp ${targetType === "parent" ? "Orang Tua" : "Tutor"} tidak tersedia`);
      return;
    }

    const message = `*PENGINGAT JADWAL LES RUMBALA* 📚\n\nHalo ${
      targetType === "parent" ? `Ayah/Bunda dari ananda *${sc.student_name}*` : `Tutor *${sc.tutor_name}*`
    },\n\nMengingatkan jadwal bimbingan belajar sesi berikutnya:\n📖 *Program:* ${sc.program_name}\n🏷️ *Jenis Kelas:* ${sc.class_type || "Semi Privat"}\n🗓️ *Hari & Waktu:* ${sc.day_of_week}, ${formatTime(sc.start_time)} - ${formatTime(sc.end_time)} WIB\n📍 *Lokasi / Unit:* ${sc.unit_name}\n👩‍🏫 *Tutor:* ${sc.tutor_name || "Tutor Rumbala"}\n\nMohon hadir tepat waktu ya. Terima kasih! ✨\n_Rumah Belajar Alfatih (RUMBALA)_`;

    const url = createWhatsAppUrl(phone, message);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Jadwal"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "parent" ? "Jadwal Les Ananda" : role === "tutor" ? "Jadwal Mengajar Saya" : "Jadwal Les & Bimbingan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemisahan data Unit/Lokasi, Jenis Kelas, Durasi, Paket, dan Progress Pertemuan (X/Y) per program.
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal Baru
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <DebouncedSearch
          placeholder="Cari siswa, tutor, program..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full"
        />

        <select
          value={dayFilter}
          onChange={(e) => {
            setDayFilter(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
        >
          <option value="">Semua Hari</option>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={unitFilter}
          onChange={(e) => {
            setUnitFilter(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
        >
          <option value="">Semua Unit Cabang</option>
          {units.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={classTypeFilter}
          onChange={(e) => {
            setClassTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
        >
          <option value="">Semua Jenis Kelas</option>
          {CLASS_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Schedules Table */}
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
                  <th className="py-3.5 px-4">Hari & Jam (Durasi)</th>
                  <th className="py-3.5 px-4">Siswa & Kelas</th>
                  <th className="py-3.5 px-4">Program & Kuota Paket</th>
                  <th className="py-3.5 px-4">Unit / Lokasi Pembelajaran</th>
                  <th className="py-3.5 px-4">Jenis Kelas</th>
                  <th className="py-3.5 px-4">Tutor Pengajar</th>
                  <th className="py-3.5 px-4 text-right">Aksi & Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-900 text-sm">{sc.day_of_week}</span>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-primary-700">
                          <Clock className="w-3.5 h-3.5 text-primary-600" />
                          {formatTime(sc.start_time)} - {formatTime(sc.end_time)} ({sc.duration_minutes || 90}m)
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-slate-800 text-xs sm:text-sm">{sc.student_name}</p>
                      <p className="text-[10px] text-slate-400">{sc.class_grade}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{sc.program_name}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Pertemuan {sc.completed_sessions_month || 0}/{sc.package_sessions || 8} Sesi
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {sc.class_type?.includes("Online") ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                          <Globe className="w-3.5 h-3.5" /> Online Zoom / Meet
                        </span>
                      ) : sc.is_home_visit || sc.class_type === "Privat Home Visit" ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700">
                            <Home className="w-3.5 h-3.5" /> Rumah Siswa (Home Visit)
                          </span>
                          {sc.home_address && (
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{sc.home_address}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> {sc.unit_name || "Unit Riscon"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          sc.class_type === "Privat Home Visit"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : sc.class_type?.includes("Online")
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sc.class_type || "Semi Privat"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{sc.tutor_name || "Belum Ditugaskan"}</p>
                      {sc.tutor_phone && (
                        <p className="text-[10px] text-slate-400">{sc.tutor_phone}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Reminder Button */}
                        <button
                          onClick={() => handleSendReminderWA(sc, "parent")}
                          title="Kirim Reminder WA ke Orang Tua"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>

                        {role === "admin" && (
                          <button
                            onClick={() => handleOpenEdit(sc)}
                            title="Edit Jadwal"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {role === "admin" && (
                          <button
                            onClick={() => setDeleteTarget(sc)}
                            title="Hapus Jadwal"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            title="Tidak Ada Jadwal Les"
            description="Belum ada jadwal les yang terdaftar pada filter ini."
            actionText={role === "admin" ? "Tambah Jadwal Baru" : undefined}
            onAction={role === "admin" ? handleOpenCreate : undefined}
          />
        )}
      </div>

      {/* Modal Add / Edit Schedule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? "Ubah Jadwal Bimbingan" : "Tambah Jadwal Les Baru"}
        subtitle="Atur siswa, tutor pengajar, program, unit lokasi, dan jenis kelas"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Siswa *
              </label>
              <select
                value={formData.student_id}
                onChange={(e) => {
                  const sId = e.target.value;
                  const st = students.find((s) => s.id === parseInt(sId));
                  setFormData({
                    ...formData,
                    student_id: sId,
                    program_name: st?.programs?.[0]?.program_name || formData.program_name,
                    unit_name: st?.programs?.[0]?.unit_name || formData.unit_name,
                    class_type: st?.programs?.[0]?.class_type || formData.class_type,
                    home_address: st?.address || formData.home_address
                  });
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                required
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class_grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tutor Pengajar *
              </label>
              <select
                value={formData.tutor_id}
                onChange={(e) => setFormData({ ...formData, tutor_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                required
              >
                <option value="">-- Pilih Tutor --</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Program Les *
              </label>
              <select
                value={formData.program_name}
                onChange={(e) => setFormData({ ...formData, program_name: e.target.value, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilihan Jenis Kelas *
              </label>
              <select
                value={formData.class_type}
                onChange={(e) => setFormData({ ...formData, class_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                {CLASS_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit / Lokasi Pembelajaran */}
          {!formData.class_type.includes("Online") && formData.class_type !== "Privat Home Visit" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unit Cabang Belajar (Tempat Les) *
              </label>
              <select
                value={formData.unit_name}
                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.class_type === "Privat Home Visit" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Alamat Rumah Siswa (Home Visit)
              </label>
              <textarea
                rows={2}
                value={formData.home_address}
                onChange={(e) => setFormData({ ...formData, home_address: e.target.value })}
                placeholder="Alamat rumah siswa..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Hari *
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
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
        message={`Apakah Anda yakin ingin menghapus jadwal ${deleteTarget?.program_name} hari ${deleteTarget?.day_of_week} untuk ${deleteTarget?.student_name}?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
