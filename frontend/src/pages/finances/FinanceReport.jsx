import React, { useState, useEffect } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate } from "../../utils/helpers";
import StatCard from "../../components/common/StatCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { CircleDollarSign, Receipt, TrendingUp, Printer, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";

export default function FinanceReport() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinances();
  }, []);

  const fetchFinances = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.FINANCES.SUMMARY);
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat rekap keuangan");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-emerald-600" />
            Rekap Pembayaran & Keuangan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoring total pemasukan les, piutang tagihan siswa, dan performa omset lembaga.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="no-print inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Cetak Rekap Keuangan
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Pemasukan Lunas"
          value={formatRupiah(summary?.totalIncome || 0)}
          subtitle={`${summary?.totalPaidInvoices || 0} Invoice telah lunas`}
          icon={CircleDollarSign}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard
          title="Total Piutang Tagihan"
          value={formatRupiah(summary?.totalPending || 0)}
          subtitle={`${summary?.totalUnpaidInvoices || 0} Invoice belum dibayar`}
          icon={Receipt}
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
        <StatCard
          title="Rasio Pelunasan"
          value={
            summary?.totalPaidInvoices + summary?.totalUnpaidInvoices > 0
              ? `${Math.round(
                  (summary.totalPaidInvoices / (summary.totalPaidInvoices + summary.totalUnpaidInvoices)) *
                    100
                )}%`
              : "100%"
          }
          subtitle="Tingkat ketepatan pembayaran"
          icon={TrendingUp}
          colorClass="bg-sky-50 text-sky-600 border-sky-100"
        />
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Tren Pemasukan Lembaga Per Bulan</h3>
          <p className="text-xs text-slate-500">Omset bimbingan belajar tahun berjalan 2026</p>
        </div>

        <div className="h-64 w-full">
          {summary?.monthlyIncome?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `Rp${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [formatRupiah(val), "Pemasukan"]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="income" fill="#0284c7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Memuat data omset...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
