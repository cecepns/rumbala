import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatRupiah, createWhatsAppUrl } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { TableSkeleton } from "../../components/common/Skeleton";
import {
  Receipt,
  CheckCircle,
  Clock,
  Upload,
  Plus,
  Printer,
  FileText,
  AlertCircle,
  CreditCard,
  Building,
  User,
  Sparkles,
  MessageCircle,
  Edit2,
  CheckCircle2,
  DollarSign,
  Layers
} from "lucide-react";
import toast from "react-hot-toast";

export default function InvoiceList() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedProgram } = useParentPortal();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Payment Upload Modal (Parents)
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Generate Monthly SPP Modal (Admin)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    student_id: "all",
    period_month: "Agustus 2026",
    due_date: "2026-08-10",
    notes: "Tagihan SPP Bulanan Bimbingan Belajar RUMBALA",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit Invoice Modal (Admin)
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: 0,
    status: "unpaid",
    notes: "",
    due_date: ""
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Invoice Print Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const fetchStudents = async () => {
    if (role !== "admin") return;
    try {
      const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (role === "parent" && selectedChildId) {
        params.student_id = selectedChildId;
      }

      const res = await request.get(API_ENDPOINTS.INVOICES.LIST, params);
      if (res.success) {
        setInvoices(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat daftar tagihan SPP bulanan");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, role, selectedChildId]);

  useEffect(() => {
    fetchStudents();
  }, [role]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOpenPayment = (inv) => {
    setPaymentTarget(inv);
    setPaymentFile(null);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentTarget) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      if (paymentFile) {
        formData.append("payment_proof", paymentFile);
      }

      const res = await request.post(API_ENDPOINTS.INVOICES.PAY(paymentTarget.id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.success) {
        toast.success(res.message || "Bukti transfer berhasil diunggah!");
        setPaymentTarget(null);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengunggah pembayaran");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const res = await request.post(API_ENDPOINTS.INVOICES.GENERATE_MONTHLY, generateForm);
      if (res.success) {
        toast.success(res.message || "Tagihan SPP Bulanan berhasil diterbitkan!");
        setIsGenerateOpen(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menerbitkan SPP");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setEditForm({
      amount: inv.amount,
      status: inv.status,
      notes: inv.notes || "",
      due_date: inv.due_date ? new Date(inv.due_date).toISOString().split("T")[0] : ""
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      setIsSavingEdit(true);
      const res = await request.put(API_ENDPOINTS.INVOICES.UPDATE_STATUS(editingInvoice.id), editForm);
      if (res.success) {
        toast.success("Data tagihan invoice berhasil diperbarui!");
        setEditingInvoice(null);
        fetchInvoices();
      }
    } catch (err) {
      toast.error("Gagal memperbarui tagihan");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleMarkAsPaid = async (inv) => {
    if (!window.confirm(`Konfirmasi pelunasan invoice ${inv.invoice_number} untuk ${inv.student_name}?`)) return;
    try {
      const res = await request.put(API_ENDPOINTS.INVOICES.UPDATE_STATUS(inv.id), {
        status: "paid",
        payment_method: "Transfer Bank Manual (Diverifikasi Admin)"
      });
      if (res.success) {
        toast.success("Invoice berhasil ditandai Lunas!");
        fetchInvoices();
      }
    } catch (err) {
      toast.error("Gagal memverifikasi pelunasan");
    }
  };

  const handleSendReminderWA = (inv) => {
    if (!inv.parent_phone) {
      toast.error("Nomor WhatsApp orang tua tidak terdaftar");
      return;
    }

    const message = `*TAGIHAN SPP BULANAN RUMBALA* 🧾\n\nHalo Ayah/Bunda dari ananda *${inv.student_name}*,\n\nBerikut rincian tagihan SPP bimbingan belajar:\n📄 *No. Invoice:* ${inv.invoice_number}\n🗓️ *Periode:* ${inv.period_month || "Bulan Ini"}\n💰 *Total Tagihan:* ${formatRupiah(inv.amount)}\n📅 *Jatuh Tempo:* ${formatDate(inv.due_date)}\n\n💳 *Pembayaran Transfer Bank:*\nBCA 1234567890 a/n Rumah Belajar Rumbala\n\nSetelah transfer, mohon konfirmasi atau upload bukti transfer melalui portal orang tua. Terima kasih! 🙏✨\n_Rumah Belajar Alfatih (RUMBALA)_`;

    const url = createWhatsAppUrl(inv.parent_phone, message);
    window.open(url, "_blank");
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.student_name?.toLowerCase().includes(q) ||
      inv.parent_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "parent" ? "Portal Orang Tua" : "Administrasi Keuangan"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "parent" ? "Tagihan SPP Ananda" : "Tagihan & Invoice SPP Bulanan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tagihan bulanan berdasarkan paket pertemuan (4/8/12 sesi per bulan) yang mencakup multi-program siswa.
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Terbitkan SPP Bulanan
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nomor invoice, nama siswa, orang tua..."
          onSearch={setSearch}
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="paid">Lunas</option>
            <option value="pending_verification">Menunggu Verifikasi</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : filteredInvoices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInvoices.map((inv) => {
            const isPaid = inv.status === "paid";
            const isPendingVerif = inv.status === "pending_verification";
            const items = inv.items_json || [];

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                  isPaid ? "border-slate-200/80" : isPendingVerif ? "border-amber-300 bg-amber-50/20" : "border-rose-200 bg-rose-50/10"
                }`}
              >
                <div>
                  {/* Top Bar: Invoice Number & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{inv.invoice_number}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {inv.period_month || "Agustus 2026"}
                        </span>
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900 mt-1">{inv.student_name}</h2>
                      <p className="text-xs text-slate-500">Ortu/Wali: {inv.parent_name}</p>
                    </div>

                    <div className="text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                        </span>
                      ) : isPendingVerif ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Verifikasi Bukti
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5" /> Belum Lunas
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        Jatuh Tempo: <strong>{formatDate(inv.due_date)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Multi-Program Items Breakdown (Format Sesuai Revisi Klien) */}
                  <div className="mt-3 space-y-2.5 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Rincian Paket SPP Bulanan:
                    </span>

                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((it, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50/90 border border-slate-100 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <p className="font-extrabold text-slate-900 text-sm">
                                {it.program_name}
                              </p>
                              <span className="font-extrabold text-primary-700">{formatRupiah(it.fee || it.amount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                              <p><span className="text-slate-400">Paket:</span> <strong className="text-slate-800">{it.package || 8} pertemuan / Bulan</strong></p>
                              <p><span className="text-slate-400">Unit:</span> <span className="font-semibold text-slate-700">{it.unit_name || "Unit Riscon"}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-700 font-semibold space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">{inv.program_name || "Bimbingan Belajar"}</span>
                          <span className="font-bold text-primary-700">{formatRupiah(inv.amount)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Paket: {inv.package_sessions || 8} pertemuan / Bulan</p>
                      </div>
                    )}

                    {/* Progress Sesi & Ketentuan Hangus Info Box */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Progres Pembelajaran:</span>
                      <span className="font-extrabold text-indigo-900 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {inv.sessions_completed || 0} / {inv.package_sessions || 8} pertemuan
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Ketentuan:</strong> Paket berlaku 1 bulan berjalan. Sesi yang melewati bulan yang sama akan <strong>hangus</strong> (diusahakan dituntaskan di bulan yang sama).
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total & Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pembayaran:</span>
                    <span className="text-lg font-extrabold text-slate-900">{formatRupiah(inv.amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Print / View Receipt */}
                    <button
                      onClick={() => setPreviewInvoice(inv)}
                      title="Cetak Bukti Tagihan"
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* WhatsApp Reminder (Admin) */}
                    {role === "admin" && !isPaid && (
                      <button
                        onClick={() => handleSendReminderWA(inv)}
                        title="Kirim Tagihan via WhatsApp"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Mark as Paid (Admin) */}
                    {role === "admin" && !isPaid && (
                      <button
                        onClick={() => handleMarkAsPaid(inv)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Tandai Lunas
                      </button>
                    )}

                    {/* Parent Upload Proof */}
                    {role === "parent" && !isPaid && (
                      <button
                        onClick={() => handleOpenPayment(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isPendingVerif ? "Unggah Ulang" : "Bayar SPP"}
                      </button>
                    )}

                    {/* Edit Invoice (Admin) */}
                    {role === "admin" && (
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        title="Sesuaikan Nominal / Catatan"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="Tidak Ada Tagihan SPP"
          description="Belum ada data tagihan SPP bulanan yang diterbitkan."
          actionText={role === "admin" ? "Terbitkan SPP Bulanan" : undefined}
          onAction={role === "admin" ? () => setIsGenerateOpen(true) : undefined}
        />
      )}

      {/* Modal 1: Generate Monthly SPP */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Terbitkan Tagihan SPP Bulanan"
        subtitle="Sistem akan otomatis menghitung tagihan seluruh program aktif siswa"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Target Siswa *
            </label>
            <select
              value={generateForm.student_id}
              onChange={(e) => setGenerateForm({ ...generateForm, student_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
            >
              <option value="all">⚡ Seluruh Siswa Aktif Sekaligus (Batch Generate)</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_grade})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Bulan Tagihan *
              </label>
              <input
                type="text"
                required
                value={generateForm.period_month}
                onChange={(e) => setGenerateForm({ ...generateForm, period_month: e.target.value })}
                placeholder="Contoh: Agustus 2026"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Jatuh Tempo *
              </label>
              <input
                type="date"
                required
                value={generateForm.due_date}
                onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan / Pesan Invoice
            </label>
            <textarea
              rows={2}
              value={generateForm.notes}
              onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Menerbitkan Tagihan..." : "Terbitkan Tagihan Sekarang"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Invoice (Admin) */}
      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title={`Penyesuaian Invoice: ${editingInvoice?.invoice_number}`}
        subtitle={`Siswa: ${editingInvoice?.student_name}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nominal Tagihan (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="5000"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Pembayaran *
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                <option value="unpaid">Belum Lunas</option>
                <option value="paid">Lunas</option>
                <option value="pending_verification">Menunggu Verifikasi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Penyesuaian (Diskon / Keringanan)
            </label>
            <input
              type="text"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Contoh: Diskon pendaftaran 10%..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingInvoice(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl disabled:opacity-50"
            >
              {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Payment Upload (Parent) */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title="Pembayaran SPP Bulanan"
        subtitle={`Invoice: ${paymentTarget?.invoice_number} • Total: ${formatRupiah(paymentTarget?.amount || 0)}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-950 space-y-2">
            <p className="font-extrabold flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600" /> Rekening Pembayaran Resmi Rumbala:
            </p>
            <p className="text-sm font-bold text-slate-900">BCA: 1234567890</p>
            <p className="text-slate-600 font-semibold">a/n Rumah Belajar Rumbala</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Unggah Foto / Screenshot Bukti Transfer
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentFile(e.target.files[0])}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPaymentTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl disabled:opacity-50"
            >
              {isUploading ? "Mengunggah..." : "Konfirmasi Pembayaran"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Print Preview Receipt */}
      <Modal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        title="Kuitansi / Invoice Resmi RUMBALA"
        subtitle={`No: ${previewInvoice?.invoice_number}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 p-4 border border-slate-200 rounded-2xl bg-white text-slate-800 text-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-primary-700">RUMAH BELAJAR RUMBALA</h2>
              <p className="text-[10px] text-slate-500">Layanan Bimbingan Belajar Berkualitas</p>
            </div>
            <div className="text-right">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                previewInvoice?.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                {previewInvoice?.status === "paid" ? "LUNAS" : "BELUM LUNAS"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Ditagihkan Kepada:</span>
              <strong className="text-slate-900">{previewInvoice?.student_name}</strong>
              <p className="text-slate-600">{previewInvoice?.parent_name}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Periode & Tanggal:</span>
              <strong>{previewInvoice?.period_month || "Agustus 2026"}</strong>
              <p className="text-slate-500">Jatuh Tempo: {formatDate(previewInvoice?.due_date)}</p>
            </div>
          </div>

          {/* Items */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-2">Deskripsi Layanan</th>
                  <th className="p-2 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(previewInvoice?.items_json || [{ program_name: "SPP Bimbingan Belajar", fee: previewInvoice?.amount }]).map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <p className="font-bold text-slate-800">{it.program_name}</p>
                      <p className="text-[10px] text-slate-400">{it.class_type} &bull; {it.unit_name}</p>
                    </td>
                    <td className="p-2 text-right font-bold">{formatRupiah(it.fee || it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2 font-extrabold text-sm border-t border-slate-200">
            <span>Total Tagihan:</span>
            <span className="text-primary-700">{formatRupiah(previewInvoice?.amount || 0)}</span>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" /> Cetak Kuitansi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
