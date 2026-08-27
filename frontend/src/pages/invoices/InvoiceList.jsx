import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatRupiah } from "../../utils/helpers";
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
  Sparkles
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

  // Payment Modal
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Generate Monthly SPP Modal (Admin)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    student_id: "",
    period_month: "Agustus 2026",
    due_date: "2026-08-10",
    notes: "Tagihan SPP Bulanan Program Les Rumbala",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchStudents = async () => {
    if (role !== "admin") return;
    try {
      const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
      if (res.success && res.data) {
        setStudents(res.data);
        if (res.data.length > 0) {
          setGenerateForm((prev) => ({ ...prev, student_id: res.data[0].id }));
        }
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
      toast.error("Gagal memuat daftar tagihan invoice");
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
        toast.success("Tagihan SPP Bulanan berhasil diterbitkan!");
        setIsGenerateOpen(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menerbitkan SPP");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Lunas (Terverifikasi)
          </span>
        );
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Menunggu Verifikasi Admin
          </span>
        );
      case "unpaid":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Belum Dibayar
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
            {role === "parent" ? "Portal Orang Tua" : "Manajemen Keuangan"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Tagihan & Invoice SPP Bulanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tagihan SPP resmi berdasarkan paket pertemuan per bulan dengan rincian biaya masing-masing program les.
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-primary-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Terbitkan SPP Bulanan Baru
          </button>
        )}
      </div>

      {/* Parent Filter Bar */}
      {role === "parent" && <ParentFilterBar />}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === ""
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Semua Tagihan
        </button>
        <button
          onClick={() => setStatusFilter("paid")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === "paid"
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Lunas
        </button>
        <button
          onClick={() => setStatusFilter("unpaid")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            statusFilter === "unpaid"
              ? "bg-amber-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Belum Dibayar
        </button>
      </div>

      {/* Invoice List Cards */}
      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Tidak Ada Tagihan Invoice"
          description="Daftar invoice pembayaran SPP bulanan akan ditampilkan di sini."
        />
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all space-y-4"
            >
              {/* Header Invoice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      {inv.invoice_number}
                    </span>
                    <span className="text-xs font-bold text-primary-700">
                      {inv.period_month || "Agustus 2026"}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {inv.milestone_name || "SPP Agustus 2026 – Paket 8 Pertemuan/Bulan – Lunas"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Siswa: <span className="font-extrabold text-slate-800">{inv.student_name}</span> &bull; Wali:{" "}
                    <span className="font-semibold text-slate-700">{inv.parent_name}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                  <div>{getStatusBadge(inv.status)}</div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Jatuh Tempo: {formatDate(inv.due_date)}
                  </p>
                </div>
              </div>

              {/* Rincian Tiap Program */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Rincian Biaya per Program Belajar:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inv.items && inv.items.length > 0 ? (
                    inv.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">{item.program_name}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{item.description}</p>
                        </div>
                        <span className="font-black text-primary-700 shrink-0">{formatRupiah(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between text-xs col-span-3">
                      <span>SPP Program Paket Belajar</span>
                      <span className="font-bold text-primary-700">{formatRupiah(inv.amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Total & Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Tagihan:</span>
                  <span className="text-xl font-black text-slate-900">{formatRupiah(inv.amount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Invoice
                  </button>

                  {inv.status !== "paid" && (
                    <button
                      onClick={() => handleOpenPayment(inv)}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {role === "admin" ? "Verifikasi Pembayaran" : "Bayar / Unggah Bukti Transfer"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload Payment / Verify */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title="Pembayaran & Konfirmasi Transfer SPP"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 text-primary-950 text-xs space-y-2">
            <p className="font-bold uppercase tracking-wider text-primary-800">
              Rekening Resmi Pembayaran Rumbala
            </p>
            <div className="space-y-1">
              <p className="font-semibold">🏦 Bank BCA: <strong className="font-bold text-sm">8455-1234-88</strong></p>
              <p className="font-semibold">A.N: <strong className="font-bold">Lembaga Rumah Belajar Alfatih</strong></p>
              <p className="text-[11px] text-primary-700">Total Nominal: <strong className="text-sm font-black">{formatRupiah(paymentTarget?.amount || 0)}</strong></p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Unggah Foto / Bukti Transfer (Struk / Screenshot)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setPaymentFile(e.target.files[0])}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPaymentTarget(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {isUploading ? "Mengirim..." : role === "admin" ? "Verifikasi Lunas" : "Kirim Bukti Pembayaran"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Generate Monthly SPP (Admin) */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Terbitkan Tagihan SPP Bulanan Siswa"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Siswa
            </label>
            <select
              value={generateForm.student_id}
              onChange={(e) => setGenerateForm({ ...generateForm, student_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
              required
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.parent_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Bulan
              </label>
              <input
                type="text"
                value={generateForm.period_month}
                onChange={(e) => setGenerateForm({ ...generateForm, period_month: e.target.value })}
                placeholder="Agustus 2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jatuh Tempo
              </label>
              <input
                type="date"
                value={generateForm.due_date}
                onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Tagihan
            </label>
            <input
              type="text"
              value={generateForm.notes}
              onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {isGenerating ? "Menerbitkan..." : "Terbitkan SPP"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
