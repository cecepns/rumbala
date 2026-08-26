import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate, createWhatsAppUrl, WA_TEMPLATES } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import PrintableInvoice from "../../components/invoice/PrintableInvoice";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  Receipt,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  MessageCircle,
  Printer,
  Sparkles,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function InvoiceList() {
  const { user, role } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Manual Generate Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    milestone_name: "Paket 4 Pertemuan",
    sessions_count: 4,
    amount: 400000,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
      if (res.success) {
        setStudents(res.data || []);
        if (res.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            student_id: res.data[0].id,
            amount: res.data[0].tuition_fee_per_session * 4
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search,
        status: statusFilter
      };
      if (role === "parent" && user?.student_id) {
        params.student_id = user.student_id;
      }

      const res = await request.get(API_ENDPOINTS.INVOICES.LIST, params);
      if (res.success) {
        setInvoices(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat daftar invoice");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, role, user]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOpenPreview = async (invoiceId) => {
    try {
      const res = await request.get(API_ENDPOINTS.INVOICES.DETAIL(invoiceId));
      if (res.success) {
        setSelectedInvoice(res.data);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      toast.error("Gagal memuat rincian invoice");
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    try {
      const res = await request.put(API_ENDPOINTS.INVOICES.PAY(invoiceId), { status: "paid" });
      if (res.success) {
        toast.success("Invoice berhasil ditandai Lunas!");
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status: "paid", paid_at: new Date() });
        }
        fetchInvoices();
      }
    } catch (err) {
      toast.error("Gagal memperbarui status pembayaran");
    }
  };

  const handleSendWA = (inv) => {
    const student = {
      name: inv.student_name,
      parent_name: inv.parent_name,
      parent_phone: inv.parent_phone
    };
    const message = WA_TEMPLATES.INVOICE_BILLING(inv, student);
    const url = createWhatsAppUrl(inv.parent_phone, message);
    window.open(url, "_blank");
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await request.post(API_ENDPOINTS.INVOICES.GENERATE_MANUAL, formData);
      if (res.success) {
        toast.success("Invoice baru berhasil diterbitkan!");
        setIsManualModalOpen(false);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-600" />
            Invoice & Tagihan Pembelajaran
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sistem otomatis menghasilkan tagihan pada setiap milestone <span className="font-bold text-primary-700">4, 8, dan 12 pertemuan</span> selesai.
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Terbitkan Tagihan Manual
          </button>
        )}
      </div>

      {/* Auto Milestone Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-sm">Siklus Tagihan Otomatis Per 4 Pertemuan</p>
            <p className="text-xs text-amber-100 mt-0.5">
              Setiap kali tutor mencatat absensi Hadir ke-4, 8, 12, sistem otomatis menerbitkan invoice dan siap dikirim via WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari no invoice, nama siswa, orang tua..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Semua Status Pembayaran</option>
          <option value="unpaid">Belum Lunas</option>
          <option value="paid">Lunas</option>
          <option value="pending_verification">Menunggu Verifikasi</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Invoice</th>
                  <th className="py-3.5 px-4">Siswa & Wali</th>
                  <th className="py-3.5 px-4">Paket Pertemuan</th>
                  <th className="py-3.5 px-4">Jatuh Tempo</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-800">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{inv.student_name}</p>
                      <p className="text-[11px] text-slate-500">Wali: {inv.parent_name}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                        {inv.milestone_name || `Paket ${inv.sessions_count} Sesi`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                      {formatRupiah(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {inv.status === "paid" ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Lunas
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> Belum Lunas
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendWA(inv)}
                          title="Kirim Tagihan ke WA Orang Tua"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">WA</span>
                        </button>

                        <button
                          onClick={() => handleOpenPreview(inv.id)}
                          title="Lihat / Cetak Invoice"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>

                        {role === "admin" && inv.status !== "paid" && (
                          <button
                            onClick={() => handleMarkAsPaid(inv.id)}
                            title="Tandai Sudah Lunas"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
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
            icon={Receipt}
            title="Tidak Ada Tagihan"
            description="Belum ada invoice yang diterbitkan untuk filter saat ini."
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

      {/* Invoice Printable Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Rincian Dokumen Invoice Rumbala"
        subtitle="Dapat diunduh dalam format PDF atau langsung dikirim via WhatsApp"
        maxWidth="max-w-4xl"
      >
        <PrintableInvoice invoice={selectedInvoice} onMarkAsPaid={role === "admin" ? handleMarkAsPaid : undefined} />
      </Modal>

      {/* Manual Generate Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Terbitkan Tagihan Manual"
        subtitle="Buat tagihan kustom untuk pembayaran khusus atau cicilan"
      >
        <form onSubmit={handleSaveManual} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Siswa *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => {
                const sId = e.target.value;
                const s = students.find((item) => item.id == sId);
                setFormData({
                  ...formData,
                  student_id: sId,
                  amount: s ? s.tuition_fee_per_session * formData.sessions_count : formData.amount
                });
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_grade} - {s.parent_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Keterangan Paket *
              </label>
              <input
                type="text"
                required
                value={formData.milestone_name}
                onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                placeholder="Contoh: Paket 4 Pertemuan (Sesi 1-4)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jumlah Sesi (Pertemuan) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.sessions_count}
                onChange={(e) => setFormData({ ...formData, sessions_count: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

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
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jatuh Tempo Pembayaran *
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Khusus
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan tambahan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? "Menerbitkan..." : "Terbitkan Invoice"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
