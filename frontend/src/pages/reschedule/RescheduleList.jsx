import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { TableSkeleton } from "../../components/common/Skeleton";
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  BookOpen,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function RescheduleList() {
  const { role } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Create Modal State (For Parent / Admin)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [schedulesOptions, setSchedulesOptions] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    program_name: "",
    schedule_id: "",
    original_date: new Date().toISOString().split("T")[0],
    reason: "izin",
    reason_details: "",
    requested_new_date: "",
    requested_new_time: "15:30 - 17:00 WIB",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Action Modal (For Admin)
  const [selectedReq, setSelectedReq] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "approved", admin_notes: "" });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (role === "parent" && selectedChildId) {
        params.student_id = selectedChildId;
      }
      if (role === "parent" && selectedProgram && selectedProgram !== "Semua Program") {
        params.program_name = selectedProgram;
      }

      const res = await request.get(API_ENDPOINTS.RESCHEDULE.LIST, params);
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data permohonan izin/reschedule");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, role, selectedChildId, selectedProgram]);

  const fetchOptions = async () => {
    try {
      if (role === "parent") {
        const res = await request.get(API_ENDPOINTS.PARENT.CHILDREN);
        if (res.success && res.data) {
          setChildrenOptions(res.data);
          if (res.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              student_id: selectedChildId || res.data[0].id,
              program_name: res.data[0].programs?.[0]?.program_name || "Cermat Matematika",
            }));
          }
        }
      } else {
        const sRes = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
        if (sRes.success) setChildrenOptions(sRes.data || []);
      }

      const schRes = await request.get(API_ENDPOINTS.SCHEDULES.LIST);
      if (schRes.success) setSchedulesOptions(schRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchOptions();
  }, [role, selectedChildId]);

  const handleOpenCreate = () => {
    const sId = selectedChildId || childrenOptions[0]?.id || "";
    const activeChild = childrenOptions.find((c) => c.id === Number(sId));
    const prog = activeChild?.programs?.[0]?.program_name || "Cermat Matematika";
    setFormData({
      student_id: sId,
      program_name: prog,
      schedule_id: "",
      original_date: new Date().toISOString().split("T")[0],
      reason: "izin",
      reason_details: "",
      requested_new_date: "",
      requested_new_time: "15:30 - 17:00 WIB",
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.program_name || !formData.original_date || !formData.reason_details) {
      toast.error("Harap lengkapi semua data permohonan.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await request.post(API_ENDPOINTS.RESCHEDULE.CREATE, formData);
      if (res.success) {
        toast.success(res.message || "Permohonan berhasil dikirim!");
        setIsCreateOpen(false);
        fetchRequests();
      } else {
        toast.error(res.message || "Gagal mengajukan izin");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStatusModal = (reqItem) => {
    setSelectedReq(reqItem);
    setStatusForm({
      status: reqItem.status === "pending" ? "approved" : reqItem.status,
      admin_notes: reqItem.admin_notes || "",
    });
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      setIsUpdatingStatus(true);
      const res = await request.put(API_ENDPOINTS.RESCHEDULE.UPDATE_STATUS(selectedReq.id), statusForm);
      if (res.success) {
        toast.success(res.message || "Status berhasil diperbarui.");
        setIsStatusModalOpen(false);
        fetchRequests();
      }
    } catch (err) {
      toast.error("Gagal memperbarui status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Disetujui Admin
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Ditolak
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Verifikasi Admin
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Manajemen Lembaga"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Izin & Reschedule Jadwal Les
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "parent"
              ? "Ajukan permohonan izin belajar atau jadwal pengganti untuk ananda tercinta."
              : role === "tutor"
              ? "Pantau status pengajuan izin dan jadwal pengganti dari siswa bimbingan Anda."
              : "Verifikasi dan kelola persetujuan izin serta jadwal pengganti siswa."}
          </p>
        </div>

        {role === "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-primary-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ajukan Izin / Reschedule
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === ""
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Semua Pengajuan
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === "pending"
              ? "bg-amber-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Menunggu Verifikasi
        </button>
        <button
          onClick={() => setStatusFilter("approved")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === "approved"
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Disetujui
        </button>
        <button
          onClick={() => setStatusFilter("rejected")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === "rejected"
              ? "bg-rose-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Ditolak
        </button>
      </div>

      {/* Requests List Card */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Belum Ada Permohonan Izin / Reschedule"
          description="Riwayat pengajuan izin tidak hadir atau permohonan pergantian jadwal les akan muncul di sini."
          actionText={role === "parent" ? "Ajukan Izin Sekarang" : undefined}
          onAction={role === "parent" ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                      {item.student_name?.charAt(0) || "S"}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{item.student_name}</h4>
                      <p className="text-[11px] font-semibold text-primary-600">{item.program_name}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">Jadwal Asal:</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                      {formatDate(item.original_date)}
                    </span>
                  </div>

                  {item.requested_new_date && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Permintaan Pengganti:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {formatDate(item.requested_new_date)} ({item.requested_new_time || "Sore"})
                      </span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 mt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Alasan ({item.reason}):
                    </p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5 italic">
                      "{item.reason_details}"
                    </p>
                  </div>

                  {item.admin_notes && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs">
                      <span className="font-bold">Catatan Admin:</span> {item.admin_notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Action */}
              {role === "admin" && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenStatusModal(item)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Verifikasi Status
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajukan Izin / Reschedule (Parent) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Form Pengajuan Izin / Reschedule Jadwal"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Anak
            </label>
            <select
              value={formData.student_id}
              onChange={(e) => {
                const child = childrenOptions.find((c) => c.id === Number(e.target.value));
                setFormData({
                  ...formData,
                  student_id: e.target.value,
                  program_name: child?.programs?.[0]?.program_name || "Cermat Matematika",
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
            >
              {childrenOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.class_grade})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Program Les yang Diikuti
            </label>
            <select
              value={formData.program_name}
              onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
            >
              {(() => {
                const child = childrenOptions.find((c) => c.id === Number(formData.student_id));
                const progs = child?.programs || [
                  { id: 1, program_name: "Cermat Matematika" },
                  { id: 2, program_name: "English BEC" },
                  { id: 3, program_name: "Mengaji & Tahfidz" },
                ];
                return progs.map((p) => (
                  <option key={p.id || p.program_name} value={p.program_name}>
                    {p.program_name}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Berhalangan
              </label>
              <input
                type="date"
                value={formData.original_date}
                onChange={(e) => setFormData({ ...formData, original_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori Alasan
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="izin">Izin (Kegiatan Lain)</option>
                <option value="sakit">Sakit</option>
                <option value="acara_keluarga">Acara Keluarga</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Rincian Alasan
            </label>
            <textarea
              rows={2}
              value={formData.reason_details}
              onChange={(e) => setFormData({ ...formData, reason_details: e.target.value })}
              placeholder="Contoh: Mengikuti acara field trip sekolah / Kurang enak badan..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
            />
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-2.5">
            <p className="text-xs font-bold text-sky-900 uppercase">
              Permintaan Jadwal Pengganti (Reschedule)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Tanggal Pengganti
                </label>
                <input
                  type="date"
                  value={formData.requested_new_date}
                  onChange={(e) => setFormData({ ...formData, requested_new_date: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Jam / Sesi yang Diinginkan
                </label>
                <input
                  type="text"
                  value={formData.requested_new_time}
                  onChange={(e) => setFormData({ ...formData, requested_new_time: e.target.value })}
                  placeholder="15.30 - 17.00 WIB"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Permohonan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Status Verification (Admin) */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Verifikasi Permohonan Izin / Reschedule"
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Keputusan Status
            </label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
            >
              <option value="approved">Disetujui (Approved)</option>
              <option value="rejected">Ditolak (Rejected)</option>
              <option value="pending">Menunggu (Pending)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Admin untuk Orang Tua / Tutor
            </label>
            <textarea
              rows={3}
              value={statusForm.admin_notes}
              onChange={(e) => setStatusForm({ ...statusForm, admin_notes: e.target.value })}
              placeholder="Contoh: Disetujui, jadwal pengganti telah dikonfirmasi ke Tutor Sarah pada Kamis 27 Agustus 2026."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {isUpdatingStatus ? "Menyimpan..." : "Simpan Keputusan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
