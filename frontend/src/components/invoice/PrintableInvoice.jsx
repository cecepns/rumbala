import React from "react";
import { formatRupiah, formatDate, createWhatsAppUrl, WA_TEMPLATES } from "../../utils/helpers";
import { Printer, MessageCircle, CheckCircle, Clock, AlertCircle, ShieldCheck } from "lucide-react";

export default function PrintableInvoice({ invoice, onMarkAsPaid }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const student = {
      name: invoice.student_name,
      parent_name: invoice.parent_name,
      parent_phone: invoice.parent_phone
    };
    const message = WA_TEMPLATES.INVOICE_BILLING(invoice, student);
    const url = createWhatsAppUrl(invoice.parent_phone, message);
    window.open(url, "_blank");
  };

  const isPaid = invoice.status === "paid";

  return (
    <div className="space-y-4">
      {/* Action Bar (Not visible when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Aksi Invoice:</span>
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" /> Lunas Terverifikasi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Kirim Notif WA Orang Tua
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / Simpan PDF
          </button>

          {!isPaid && onMarkAsPaid && (
            <button
              onClick={() => onMarkAsPaid(invoice.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Tandai Lunas
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Paper Sheet */}
      <div className="printable-area bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Rumbala" className="h-16 w-auto object-contain" />
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">RUMBALA</h2>
              <p className="text-xs text-slate-500 font-medium">Lembaga Bimbingan Belajar & Les Privat</p>
              <p className="text-[11px] text-slate-400 mt-1">WA: 0812-1278-8313 | info@rumbala.com</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600">INVOICE PEMBELAJARAN</span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{invoice.invoice_number}</h3>
            <div className="mt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                  isPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {isPaid ? "LUNAS" : "BELUM LUNAS"}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Meta Info */}
        <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-100 text-xs">
          <div>
            <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Ditagihkan Kepada:</p>
            <p className="text-sm font-bold text-slate-800">{invoice.parent_name || "Bapak/Ibu Orang Tua"}</p>
            <p className="text-slate-600 mt-0.5">Wali dari: <span className="font-semibold text-slate-800">{invoice.student_name}</span></p>
            <p className="text-slate-500">{invoice.class_grade} - {invoice.school}</p>
            <p className="text-slate-500 font-medium mt-1">No. WhatsApp: {invoice.parent_phone}</p>
          </div>

          <div className="text-right space-y-1">
            <div>
              <span className="text-slate-400 font-medium">Periode SPP: </span>
              <span className="font-extrabold text-primary-700">{invoice.period_month || "Agustus 2026"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Progres Sesi: </span>
              <span className="font-semibold text-slate-800">{invoice.sessions_completed || 0} / {invoice.package_sessions || 8} Pertemuan</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Tanggal Terbit: </span>
              <span className="font-semibold text-slate-700">{formatDate(invoice.created_at || new Date())}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Jatuh Tempo: </span>
              <span className="font-semibold text-red-600">{formatDate(invoice.due_date)}</span>
            </div>
            {isPaid && invoice.paid_at && (
              <div>
                <span className="text-slate-400 font-medium">Tanggal Bayar: </span>
                <span className="font-semibold text-emerald-700">{formatDate(invoice.paid_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                <th className="py-2.5 px-2">No</th>
                <th className="py-2.5 px-2">Program & Paket Pembelajaran</th>
                <th className="py-2.5 px-2 text-center">Paket Pertemuan</th>
                <th className="py-2.5 px-2 text-right">Nominal SPP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items_json && invoice.items_json.length > 0 ? (
                invoice.items_json.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-2 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <p className="font-bold text-slate-900">{item.program_name}</p>
                      <p className="text-[11px] text-slate-500">{item.unit_name || "Unit Riscon"} &bull; {item.class_type || "Semi Privat"}</p>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">
                      {item.package || 8} Pertemuan / Bulan
                    </td>
                    <td className="py-3 px-2 text-right font-extrabold text-slate-900">
                      {formatRupiah(item.fee || item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 px-2 text-slate-500">1</td>
                  <td className="py-3 px-2">
                    <p className="font-bold text-slate-900">{invoice.program_name || "Bimbingan Belajar Rumbala"}</p>
                    <p className="text-[11px] text-slate-500">Periode: {invoice.period_month || "Bulanan"}</p>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-slate-700">
                    {invoice.package_sessions || 8} Pertemuan / Bulan
                  </td>
                  <td className="py-3 px-2 text-right font-extrabold text-slate-900">
                    {formatRupiah(invoice.amount)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td colSpan="3" className="py-3 px-2 text-right font-bold text-sm text-slate-800">
                  Total Tagihan SPP:
                </td>
                <td className="py-3 px-2 text-right font-extrabold text-base text-primary-700">
                  {formatRupiah(invoice.amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Kebijakan Masa Berlaku Pertemuan */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Ketentuan Paket Pertemuan:</strong> Baik paket 4, 8, maupun 12 sesi berlaku untuk 1 (satu) bulan berjalan. Jika pertemuan melewati di bulan yang sama maka pertemuannya akan <strong>hangus</strong>. Mohon dituntaskan pertemuan tersebut di bulan yang sama.
          </p>
        </div>

        {/* Payment Transfer Information */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
              Instruksi Rekening Pembayaran Resmi:
            </p>
            <p className="text-slate-600 mt-1">Bank BCA: <span className="font-mono font-bold text-slate-900">873-556-9921</span> (a.n Rumbala Edukasi)</p>
            <p className="text-slate-500 text-[11px]">Bank Mandiri: <span className="font-mono font-bold text-slate-900">133-00-9876543-1</span> (a.n Rumbala Edukasi)</p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-slate-500">Konfirmasi Bukti Transfer:</p>
            <p className="font-bold text-primary-600">WhatsApp: 0812-1278-8313</p>
          </div>
        </div>

        {/* Signature & Note Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between text-xs">
          <div className="max-w-xs text-slate-400 text-[11px]">
            <p className="font-semibold text-slate-600">Catatan:</p>
            <p>Terima kasih atas kepercayaan Ayah/Bunda mempercayakan bimbingan belajar ananda kepada Lembaga Rumbala.</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 mb-10">Pengelola Lembaga Rumbala,</p>
            <p className="font-bold text-slate-800 border-b border-slate-800 pb-0.5">Admin Keuangan Rumbala</p>
          </div>
        </div>
      </div>
    </div>
  );
}
