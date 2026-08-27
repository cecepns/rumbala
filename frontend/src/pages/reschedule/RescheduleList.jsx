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
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";

export default function RescheduleList() {
  const { role } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [schedulesOptions, setSchedulesOptions] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    program_name: "Cermat Matematika",
    unit_name: "Unit Riscon Rancaekek",
    class_type: "Semi Privat",
    schedule_id: "",
    original_date: new Date().toISOString().split("T")[0],
    reason: "izin",
    reason_details: "",
    requested_new_date: "",
    requested_new_time: "15:30 - 17:00 WIB",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Action Modal (For Admin Administrative Decision)
  const [selectedReq, setSelectedReq] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "approved",
    session_decision: "valid",
    admin_notes: ""
  });
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
              unit_name: res.data[0].programs?.[0]?.unit_name || "Unit Riscon Rancaekek",
              class_type: res.data[0].programs?.[0]?.class_type || "Semi Privat"
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
    const prog = activeChild?.programs?.[0] || activeChild;
    setFormData({
      student_id: sId,
      program_name: prog?.program_name || "Cermat Matematika",
      unit_name: prog?.unit_name || "Unit Riscon Rancaekek",
      class_type: prog?.class_type || "Semi Privat",
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
    if (!formData.student_id || !formData.original_date || !formData.reason_details) {
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
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengirim permohonan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStatusModal = (reqItem) => {
    setSelectedReq(reqItem);
    setStatusForm({
      status: reqItem.status === "pending" ? "approved" : reqItem.status,
      session_decision: reqItem.session_decision || (reqItem.reason === "sakit" ? "valid" : "valid"),
      admin_notes: reqItem.admin_notes || (reqItem.reason === "sakit" ? "Izin sakit diterima, sesi dapat dijadwalkan ulang." : "Disetujui untuk jadwal pengganti.")
    });
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      setIsUpdatingStatus(true);
      const res = await request.put(API_ENDPOINTS.RESCHEDULE.UPDATE_STATUS(selectedReq.id), statusForm);
      if (res.success) {
        toast.success("Keputusan administratif permohonan berhasil disimpan!");
        setIsStatusModalOpen(false);
        fetchRequests();
      }
    } catch (err) {
      toast.error("Gagal memperbarui status permohonan");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (st, decision) => {
    if (st === "approved") {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Disetujui Admin
          </span>
          <p className="text-[10px] font-semibold text-emerald-700">
            {decision === "forfeited" ? "⚠️ Sesi Hangus" : "✓ Sesi Berlaku / Reschedule"}
          </p>
        </div>
      );
    } else if (st === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
          <XCircle className="w-3 h-3" /> Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
        <Clock className="w-3 h-3" /> Menunggu Keputusan Admin
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : role === "tutor" ? "Portal Tutor" : "Keputusan Administratif"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Izin & Reschedule Sesi Les
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Alur: Orang Tua mengajukan &rarr; Admin memproses keputusan administratif &rarr; Tutor menerima informasi jadwal pengganti.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajukan Izin / Reschedule
        </button>
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          Total: <strong className="text-slate-800">{requests.length}</strong> Pengajuan
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Tidak Ada Pengajuan Izin"
          description="Belum ada riwayat permohonan izin atau reschedule jadwal les."
          actionText="Ajukan Izin / Reschedule"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                      {r.program_name}
                    </span>
                    <h2 className="text-sm font-extrabold text-slate-900 mt-1">{r.student_name}</h2>
                    <p className="text-xs text-slate-500">Wali: {r.parent_name || "Orang Tua"}</p>
                  </div>

                  <div className="text-right">
                    {getStatusBadge(r.status, r.session_decision)}
                  </div>
                </div>

                {/* Reason & Details */}
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="capitalize text-slate-800 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Alasan: {r.reason === "sakit" ? "Sakit (Pengecualian Medis)" : r.reason || "Izin"}
                      </span>
                      <span className="text-slate-400 font-normal">
                        Jadwal Awal: <strong>{formatDate(r.original_date)}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic leading-relaxed">"{r.reason_details}"</p>
                  </div>

                  {/* Requested Replacement */}
                  {r.requested_new_date && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs font-semibold">
                      <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Usulan Jadwal Pengganti: <strong>{formatDate(r.requested_new_date)}</strong> ({r.requested_new_time || "Sore"})
                      </span>
                    </div>
                  )}

                  {/* Admin Notes / Decision */}
                  {r.admin_notes && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-950 text-xs">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Catatan Keputusan Admin:</p>
                      <p className="mt-0.5 font-medium">{r.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button for Admin */}
              {role === "admin" && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">ID Pengajuan: #{r.id}</span>
                  <button
                    onClick={() => handleOpenStatusModal(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Proses Keputusan Admin
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create Request */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Ajukan Izin / Permohonan Reschedule"
        subtitle="Sampaikan alasan izin atau sakit dan usulan waktu pengganti"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Siswa & Program *
            </label>
            <select
              value={formData.student_id}
              onChange={(e) => {
                const sId = e.target.value;
                const found = childrenOptions.find((c) => c.id === parseInt(sId));
                setFormData({
                  ...formData,
                  student_id: sId,
                  program_name: found?.programs?.[0]?.program_name || formData.program_name
                });
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              required
            >
              <option value="">-- Pilih Siswa --</option>
              {childrenOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.class_grade})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori Alasan *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="izin">Izin Acara / Keperluan</option>
                <option value="sakit">Sakit (Pengecualian Medis)</option>
                <option value="acara_keluarga">Acara Keluarga / Liburan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Sesi Awal *
              </label>
              <input
                type="date"
                required
                value={formData.original_date}
                onChange={(e) => setFormData({ ...formData, original_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Detail Alasan Izin *
            </label>
            <textarea
              rows={2}
              required
              value={formData.reason_details}
              onChange={(e) => setFormData({ ...formData, reason_details: e.target.value })}
              placeholder="Contoh: Ananda sedang demam / ada kegiatan wisuda keluarga..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-extrabold uppercase text-slate-800 block">
              Usulan Jadwal Pengganti (Opsional):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tanggal Pengganti
                </label>
                <input
                  type="date"
                  value={formData.requested_new_date}
                  onChange={(e) => setFormData({ ...formData, requested_new_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pilihan Jam Pengganti
                </label>
                <input
                  type="text"
                  value={formData.requested_new_time}
                  onChange={(e) => setFormData({ ...formData, requested_new_time: e.target.value })}
                  placeholder="Contoh: 15:30 - 17:00 WIB"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Admin Status & Decision Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Keputusan Administratif Admin"
        subtitle={`Pengajuan: ${selectedReq?.student_name} (${selectedReq?.program_name})`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <p><strong>Alasan:</strong> {selectedReq?.reason} &bull; <em>"{selectedReq?.reason_details}"</em></p>
            <p><strong>Jadwal Awal:</strong> {formatDate(selectedReq?.original_date)}</p>
            {selectedReq?.requested_new_date && (
              <p className="text-primary-700 font-semibold">
                <strong>Usulan Pengganti:</strong> {formatDate(selectedReq.requested_new_date)} ({selectedReq.requested_new_time})
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Keputusan Status Pengajuan *
              </label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                <option value="approved">Disetujui (Approved)</option>
                <option value="rejected">Ditolak (Rejected)</option>
                <option value="pending">Tetap Menunggu (Pending)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ketentuan Sesi Pembelajaran *
              </label>
              <select
                value={statusForm.session_decision}
                onChange={(e) => setStatusForm({ ...statusForm, session_decision: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="valid">Sesi Tetap Berlaku / Reschedule Pengganti</option>
                <option value="forfeited">Sesi Hangus (Dihitung Terpakai)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Administratif untuk Orang Tua & Tutor
            </label>
            <textarea
              rows={3}
              value={statusForm.admin_notes}
              onChange={(e) => setStatusForm({ ...statusForm, admin_notes: e.target.value })}
              placeholder="Contoh: Disetujui, jadwal pengganti dilaksanakan pada hari Sabtu pukul 16:00..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isUpdatingStatus ? "Menyimpan..." : "Simpan Keputusan Admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
