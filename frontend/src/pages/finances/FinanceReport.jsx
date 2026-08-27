import React, { useState, useEffect, useCallback } from "react";
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
import {
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Printer,
  Building2,
  BookOpen,
  Calendar,
  CheckCircle2,
  PieChart,
  FileSpreadsheet
} from "lucide-react";
import toast from "react-hot-toast";

export default function FinanceReport() {
  const [summary, setSummary] = useState(null);
  const [units, setUnits] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodMonth, setPeriodMonth] = useState("Agustus 2026");
  const [unitFilter, setUnitFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");

  const fetchOptions = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST)
      ]);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setPrograms(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinances = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.FINANCES.SUMMARY, {
        period_month: periodMonth,
        unit_name: unitFilter,
        program_name: programFilter
      });
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat rekap keuangan");
    } finally {
      setLoading(false);
    }
  }, [periodMonth, unitFilter, programFilter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchFinances();
  }, [fetchFinances]);

  const handlePrint = () => {
    window.print();
  };

  const totalPotensi = (summary?.totalIncome || 0) + (summary?.totalPending || 0);
  const paidRatio = totalPotensi > 0 ? Math.round(((summary?.totalIncome || 0) / totalPotensi) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Laporan Keuangan Eksekutif
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Rekap Keuangan & Pendapatan SPP
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analisis omset SPP bulanan, piutang tagihan, rasio pelunasan, dan performa keuangan per Unit & Program.
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div>
          <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
            Periode Bulan:
          </label>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
          >
            <option value="Agustus 2026">Agustus 2026</option>
            <option value="Juli 2026">Juli 2026</option>
            <option value="September 2026">September 2026</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
            Unit Cabang:
          </label>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
          >
            <option value="">Semua Unit Cabang</option>
            {units.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
            Program Bimbingan:
          </label>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
          >
            <option value="">Semua Program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Potensi Pendapatan"
          value={formatRupiah(totalPotensi)}
          subtitle="Total seluruh tagihan SPP"
          icon={CircleDollarSign}
          colorClass="bg-blue-50 text-blue-600 border-blue-100"
        />

        <StatCard
          title="Pendapatan Lunas (Kas Masuk)"
          value={formatRupiah(summary?.totalIncome || 0)}
          subtitle={`${summary?.totalPaidInvoices || 0} invoice telah lunas`}
          icon={CheckCircle2}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />

        <StatCard
          title="Piutang Belum Lunas"
          value={formatRupiah(summary?.totalPending || 0)}
          subtitle={`${summary?.totalUnpaidInvoices || 0} invoice pending`}
          icon={Receipt}
          colorClass="bg-rose-50 text-rose-600 border-rose-100"
        />

        <StatCard
          title="Rasio Pelunasan SPP"
          value={`${paidRatio}%`}
          subtitle="Persentase ketepatan bayar"
          icon={TrendingUp}
          colorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
        />
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Tren Pemasukan Lembaga Per Bulan</h2>
            <p className="text-xs text-slate-500">Histori perolehan SPP tahun berjalan 2026</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Terkonfirmasi Kas Bank
          </span>
        </div>

        <div className="h-64 w-full">
          {summary?.monthlyIncome && summary.monthlyIncome.length > 0 ? (
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
                  formatter={(val) => [formatRupiah(val), "Pemasukan SPP"]}
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
