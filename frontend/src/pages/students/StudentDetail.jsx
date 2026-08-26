import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, formatDate, formatTime, createWhatsAppUrl } from "../../utils/helpers";
import { TableSkeleton } from "../../components/common/Skeleton";
import {
  ArrowLeft,
  User,
  Phone,
  School,
  BookOpen,
  Calendar,
  CheckCircle,
  Receipt,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("journals"); // journals | attendances | invoices | schedules

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.STUDENTS.DETAIL(id));
      if (res.success) {
        setStudent(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat profil siswa");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">Data siswa tidak ditemukan.</p>
        <Link to="/students" className="mt-3 inline-block text-xs font-bold text-primary-600">
          Kembali ke Data Siswa
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Siswa
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/progress`}
            className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Progress Belajar
          </Link>
          <Link
            to={`/ai-reports`}
            className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate AI Report
          </Link>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-md">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-800">{student.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {student.status === "active" ? "Siswa Aktif" : "Non-Aktif"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {student.class_grade} • {student.school}
            </p>
            <p className="text-xs font-semibold text-primary-700 mt-0.5">
              Mata Pelajaran: {student.subjects}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t sm:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-xs w-full md:w-auto">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Orang Tua / Wali</span>
            <span className="font-bold text-slate-800">{student.parent_name}</span>
            <button
              onClick={() => {
                const url = createWhatsAppUrl(student.parent_phone, `Halo Bapak/Ibu ${student.parent_name}`);
                window.open(url, "_blank");
              }}
              className="flex items-center gap-1 text-emerald-600 font-bold text-[11px] mt-0.5"
            >
              <MessageCircle className="w-3 h-3" /> {student.parent_phone}
            </button>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Tarif per Sesi</span>
            <span className="font-bold text-slate-800">{formatRupiah(student.tuition_fee_per_session)}</span>
            <span className="text-[11px] text-slate-400 block">per 1.5 jam</span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Sesi Selesai</span>
            <span className="font-extrabold text-indigo-600 text-sm">{student.total_sessions_completed || 0} Pertemuan</span>
            <span className="text-[10px] text-slate-400 block">Milestone 4/8/12</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        {[
          { key: "journals", label: `Jurnal Pembelajaran (${student.journals?.length || 0})` },
          { key: "attendances", label: `Riwayat Absensi (${student.attendances?.length || 0})` },
          { key: "invoices", label: `Tagihan & Invoice (${student.invoices?.length || 0})` },
          { key: "schedules", label: `Jadwal Les (${student.schedules?.length || 0})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-1 transition-all border-b-2 ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        {activeTab === "journals" && (
          <div className="space-y-4">
            {student.journals?.length > 0 ? (
              student.journals.map((j) => (
                <div key={j.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{j.topic}</span>
                    <span className="font-semibold text-slate-500">{formatDate(j.date)}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed"><span className="font-semibold">Target Capaian:</span> {j.targets_achieved}</p>
                  <p className="text-slate-600"><span className="font-semibold">Catatan Tutor:</span> {j.progress_notes}</p>
                  {j.homework && (
                    <p className="text-indigo-700 font-medium"><span className="font-semibold">Pekerjaan Rumah (PR):</span> {j.homework}</p>
                  )}
                  {j.score && (
                    <div className="pt-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                        Nilai Sesi: {j.score}/100
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">Belum ada catatan jurnal pembelajaran.</p>
            )}
          </div>
        )}

        {activeTab === "attendances" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Sesi Ke</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Jam Belajar</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Konfirmasi Ortu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student.attendances?.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-3 font-bold text-indigo-700">Pertemuan #{a.session_number}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{formatDate(a.date)}</td>
                    <td className="py-3 px-3 text-slate-600">{formatTime(a.start_time)} - {formatTime(a.end_time)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {a.parent_confirmed ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Terkonfirmasi
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Menunggu
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-3">
            {student.invoices?.map((inv) => (
              <div key={inv.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{inv.invoice_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {inv.status === "paid" ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium mt-1">{inv.milestone_name}</p>
                  <p className="text-slate-400 text-[11px]">Jatuh Tempo: {formatDate(inv.due_date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900 block">{formatRupiah(inv.amount)}</span>
                  <Link
                    to={`/invoices`}
                    className="text-primary-600 font-bold text-xs hover:underline mt-1 inline-block"
                  >
                    Buka Rincian Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "schedules" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.schedules?.map((sc) => (
              <div key={sc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                <span className="font-bold text-slate-800 text-sm block">{sc.subject}</span>
                <p className="text-slate-600">📅 {sc.day_of_week}, {formatTime(sc.start_time)} - {formatTime(sc.end_time)} WIB</p>
                <p className="text-slate-500">👩‍🏫 Tutor: <span className="font-semibold text-slate-700">{sc.tutor_name}</span></p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
                  {sc.location_type === "online" ? "🌐 Online Zoom" : "🏠 Offline di Rumah"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
