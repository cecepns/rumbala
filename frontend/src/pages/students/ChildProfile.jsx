import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParentPortal } from "../../context/ParentPortalContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatRupiah } from "../../utils/helpers";
import ParentFilterBar from "../../components/common/ParentFilterBar";
import {
  User,
  School,
  Calendar,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Award,
  Clock,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles
} from "lucide-react";

export default function ChildProfile() {
  const { role, user } = useAuth();
  const { selectedChildId, selectedChild, childrenList, setSelectedChildId } = useParentPortal();
  const [studentDetail, setStudentDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildDetail();
  }, [selectedChildId]);

  const fetchChildDetail = async () => {
    if (!selectedChildId && !user?.student_id) return;
    try {
      setLoading(true);
      const sId = selectedChildId || user?.student_id || 1;
      const res = await request.get(API_ENDPOINTS.STUDENTS.DETAIL(sId));
      if (res.success) {
        setStudentDetail(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const student = studentDetail || selectedChild;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Portal Orang Tua
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Profil & Program Belajar Anak
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Informasi lengkap identitas ananda, data wali orang tua, dan rincian program bimbingan yang aktif.
          </p>
        </div>

        {/* Multi-child switch pill */}
        {childrenList && childrenList.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {childrenList.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  c.id === selectedChildId
                    ? "bg-white text-primary-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <ParentFilterBar />

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Identitas Anak */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-sm">
              {student?.name?.charAt(0) || "A"}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Siswa Aktif
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">{student?.name || "Nama Anak"}</h2>
              <p className="text-xs text-slate-500 font-medium">Panggilan: {student?.nickname || student?.name}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Identitas Siswa
            </h3>

            <div className="flex items-center gap-3 text-slate-700">
              <School className="w-4 h-4 text-primary-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Kelas & Sekolah</p>
                <p className="font-bold text-slate-800">{student?.class_grade} &bull; {student?.school || "SD"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Calendar className="w-4 h-4 text-primary-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Tanggal Lahir</p>
                <p className="font-semibold text-slate-800">{student?.birth_date ? formatDate(student.birth_date) : "12 April 2015"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Award className="w-4 h-4 text-primary-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Total Sesi Les Selesai</p>
                <p className="font-bold text-emerald-700">{student?.total_sessions_completed || 0} Pertemuan Terlaksana</p>
              </div>
            </div>

            {student?.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Catatan Khusus</p>
                <p className="mt-0.5 text-xs italic">{student.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Data Orang Tua */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontak Resmi</span>
            <h2 className="text-base font-extrabold text-slate-900 mt-0.5">Data Orang Tua / Wali</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 text-slate-700">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Nama Orang Tua</p>
                <p className="font-bold text-slate-800 text-sm">{student?.parent_name || user?.name || "Bapak/Ibu"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">No. WhatsApp Aktif</p>
                <p className="font-bold text-slate-800">{student?.parent_phone || user?.phone || "081388776655"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Email Notifikasi</p>
                <p className="font-semibold text-slate-800">{student?.parent_email || user?.email || "wali@gmail.com"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-700">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-[10px]">Alamat Rumah</p>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {student?.address || "Perumahan Grand Riscon Rancaekek Blok C3 No 8, Bandung"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ringkasan Status & Program */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                Rumbala Learning Track
              </span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <h3 className="text-lg font-extrabold text-white mt-1">
              {student?.programs?.length || 0} Program Aktif
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Ananda terdaftar dalam program bimbingan komprehensif untuk penguatan akademik dan karakter.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            {student?.programs?.map((prog) => (
              <div key={prog.id} className="p-2.5 rounded-xl bg-white/10 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{prog.program_name}</p>
                  <p className="text-[11px] text-sky-200">{prog.unit_name}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold text-white">
                  {prog.completed_sessions_month}/{prog.package_sessions} Sesi
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400">
            Terdaftar sejak Agustus 2026 &bull; Status Akun Terverifikasi
          </div>
        </div>
      </div>

      {/* 4. Detail Program yang Diikuti */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-base font-extrabold text-slate-900">
            Rincian Program yang Diikuti Ananda
          </h3>
          <p className="text-xs text-slate-500">
            Detail Unit, Tutor Pengajar, Paket Sesi Bulanan, Jadwal, dan Progress pada masing-masing program.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {student?.programs && student.programs.length > 0 ? (
            student.programs.map((prog) => (
              <div
                key={prog.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-primary-200 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Header Program */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        {prog.unit_name}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {prog.program_name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                      {prog.completed_sessions_month}/{prog.package_sessions} Sesi
                    </span>
                  </div>

                  {/* Program Detail Specs */}
                  <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tutor Pengampu:</span>
                      <span className="font-bold text-slate-800">{prog.tutor_name || "Sarah Azzahra, S.Pd"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Paket Pertemuan:</span>
                      <span className="font-bold text-slate-800">{prog.package_sessions} Pertemuan / Bulan</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Biaya SPP Bulanan:</span>
                      <span className="font-extrabold text-primary-700">{formatRupiah(prog.monthly_fee)}</span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Jadwal Les:</span>
                      <span className="font-semibold text-slate-800 text-right">{prog.schedule_info || "Senin & Kamis 15.30 - 17.00"}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Progress Sesi Bulan Ini</span>
                      <span className="text-primary-700">
                        {Math.round(((prog.completed_sessions_month || 0) / (prog.package_sessions || 8)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round(((prog.completed_sessions_month || 0) / (prog.package_sessions || 8)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Status Program</span>
                  <span className="font-bold text-emerald-700">Aktif Berjalan</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 py-4 col-span-3 text-center">
              Belum ada data program tersimpan untuk ananda ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
