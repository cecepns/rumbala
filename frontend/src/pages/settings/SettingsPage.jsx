import React, { useState, useEffect } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import {
  Settings,
  Receipt,
  CalendarClock,
  CreditCard,
  Phone,
  Car,
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("spp");

  const [settings, setSettings] = useState({
    spp_due_date_day: "10",
    spp_invoice_prefix: "INV/RBL/",
    spp_default_period: "Agustus 2026",
    default_home_visit_transport: "25000",
    admin_whatsapp: "6281234567890",
    bank_account_info: "BCA 1234567890 a/n Rumah Belajar Rumbala",
    leave_policy_days_prior: "1",
    forfeited_unexcused_sessions: "true",
    sick_policy_note: "Pengajuan izin sakit dengan surat dokter/pemberitahuan orang tua sesi dapat dijadwalkan ulang (reschedule).",
    tutor_honor_payment_date: "25"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.SETTINGS.LIST);
      if (res.success && res.map) {
        setSettings((prev) => ({
          ...prev,
          ...res.map
        }));
      }
    } catch (err) {
      toast.error("Gagal memuat pengaturan sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await request.put(API_ENDPOINTS.SETTINGS.UPDATE, { settings });
      if (res.success) {
        toast.success("Pengaturan sistem berhasil disimpan!");
      }
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "spp", label: "Aturan SPP & Tagihan", icon: Receipt },
    { id: "reschedule", label: "Aturan Izin & Reschedule", icon: CalendarClock },
    { id: "honor", label: "Honor & Transport Tutor", icon: Award },
    { id: "contact", label: "Rekening & WhatsApp Admin", icon: Phone }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Konfigurasi Kebijakan
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Pengaturan Sistem RUMBALA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi terpusat aturan SPP bulanan, kebijakan izin/reschedule, rekening pembayaran, dan ketentuan honor tutor.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-primary-600" : "text-slate-400"}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        {/* SPP TAB */}
        {activeTab === "spp" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Ketentuan SPP & Tagihan Bulanan</h2>
                <p className="text-xs text-slate-500">Invoice diterbitkan per bulan sesuai kuota paket siswa (bukan milestone pertemuan).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Jatuh Tempo SPP Setiap Bulan *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Setiap tanggal</span>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={settings.spp_due_date_day}
                    onChange={(e) => setSettings({ ...settings, spp_due_date_day: e.target.value })}
                    className="w-24 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-center"
                  />
                  <span className="text-xs text-slate-500 font-semibold">setiap bulannya</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Format Prefix Nomor Invoice
                </label>
                <input
                  type="text"
                  value={settings.spp_invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, spp_invoice_prefix: e.target.value })}
                  placeholder="Contoh: INV/RBL/"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Aturan Paket Pembelajaran RUMBALA:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li><strong>Paket 4 Pertemuan / Bulan:</strong> 1x seminggu bimbingan.</li>
                <li><strong>Paket 8 Pertemuan / Bulan:</strong> 2x seminggu bimbingan.</li>
                <li><strong>Paket 12 Pertemuan / Bulan:</strong> 3x seminggu bimbingan intensif.</li>
                <li>Jika siswa mengambil &gt; 1 program, rincian digabungkan dalam 1 invoice bulanan terpadu.</li>
              </ul>
            </div>
          </div>
        )}

        {/* RESCHEDULE TAB */}
        {activeTab === "reschedule" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Ketentuan Izin, Sakit & Reschedule</h2>
                <p className="text-xs text-slate-500">Keputusan administratif tetap berada di bawah wewenang Admin.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batas Minimal Pengajuan Izin (Hari Sebelum Sesi)
                </label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={settings.leave_policy_days_prior}
                  onChange={(e) => setSettings({ ...settings, leave_policy_days_prior: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ketentuan Sesi Jika Alfa / Tanpa Kabar
                </label>
                <select
                  value={settings.forfeited_unexcused_sessions}
                  onChange={(e) => setSettings({ ...settings, forfeited_unexcused_sessions: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                >
                  <option value="true">Sesi Hangus (Dihitung Terpakai)</option>
                  <option value="false">Sesi Tidak Hangus</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Catatan Kebijakan Khusus Sakit
              </label>
              <textarea
                rows={2}
                value={settings.sick_policy_note}
                onChange={(e) => setSettings({ ...settings, sick_policy_note: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>
        )}

        {/* HONOR TAB */}
        {activeTab === "honor" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Ketentuan Honor Tutor & Transport Home Visit</h2>
                <p className="text-xs text-slate-500">Honor dihitung berdasarkan sesi yang benar-benar terlaksana (bukan kuota paket).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tarif Transport Standar Privat Home Visit (Rp / Sesi) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={settings.default_home_visit_transport}
                  onChange={(e) => setSettings({ ...settings, default_home_visit_transport: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Rekap & Pembayaran Honor Tutor (Tiap Bulan)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Setiap tanggal</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={settings.tutor_honor_payment_date}
                    onChange={(e) => setSettings({ ...settings, tutor_honor_payment_date: e.target.value })}
                    className="w-24 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-center"
                  />
                  <span className="text-xs text-slate-500 font-semibold">akhir bulan berjalan</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-950 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                <Award className="w-4 h-4 text-emerald-600" />
                Formula Perhitungan Honor Tutor:
              </p>
              <p className="text-xs text-slate-700 font-medium">
                <strong>Total Diterima Tutor = (Jumlah Sesi Terlaksana × Fee Sesi Program/Jenis Kelas) + (Sesi Home Visit × Uang Transport)</strong>
              </p>
            </div>
          </div>
        )}

        {/* CONTACT & PAYMENT TAB */}
        {activeTab === "contact" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Rekening Pembayaran & Kontak WhatsApp Admin</h2>
                <p className="text-xs text-slate-500">Informasi ini dicantumkan pada invoice dan reminder WhatsApp.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nomor WhatsApp Resmi Admin *
                </label>
                <input
                  type="text"
                  value={settings.admin_whatsapp}
                  onChange={(e) => setSettings({ ...settings, admin_whatsapp: e.target.value })}
                  placeholder="6281234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Info Rekening Bank Pembayaran SPP *
                </label>
                <input
                  type="text"
                  value={settings.bank_account_info}
                  onChange={(e) => setSettings({ ...settings, bank_account_info: e.target.value })}
                  placeholder="BCA 1234567890 a/n Rumah Belajar Rumbala"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </form>
    </div>
  );
}
