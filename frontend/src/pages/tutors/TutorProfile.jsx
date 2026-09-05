import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import {
  GraduationCap,
  BookOpen,
  MapPin,
  Users,
  Award,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  CalendarCheck
} from "lucide-react";

export default function TutorProfile() {
  const { user } = useAuth();
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutorProfile();
  }, []);

  const fetchTutorProfile = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.TUTORS.LIST);
      if (res.success && res.data) {
        const found = res.data.find(t => t.user_id === user?.id || t.email === user?.email) || res.data[0];
        setTutorData(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tutor = tutorData || {
    name: user?.name || "Sarah Azzahra, S.Pd",
    subjects: "Pracalis, Cerdas Matematika",
    units_teaching: "Unit Riscon Rancaekek, Unit Panorama Jatinangor",
    class_types: "Semi Privat, Privat, Online Privat, Online semi Privat, Privat Home Visit",
    status: "active",
    bio: "Pengajar Matematika & Tahsin berpengalaman 5 tahun dengan metode kontekstual dan fun learning.",
    phone: user?.phone || "081234567890",
    email: user?.email || "sarah.tutor@rumbala.com"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Portal Tutor Pengajar
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Profil Tutor Rumbala
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Informasi profil pengajar, unit cabang mengajar, program keahlian, dan jenis bimbingan yang diampu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tutor Identity Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center text-2xl font-extrabold shadow-sm">
              {tutor.name?.charAt(0) || "T"}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Status: Tutor Aktif
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">{tutor.name}</h2>
              <p className="text-xs text-slate-500">Tutor Bersertifikasi Rumbala</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Kontak WhatsApp</p>
                <p className="font-bold text-slate-800">{tutor.phone || "081234567890"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px]">Email Edukator</p>
                <p className="font-semibold text-slate-800">{tutor.email || "sarah.tutor@rumbala.com"}</p>
              </div>
            </div>

            {tutor.bio && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Biografi & Pendekatan Mengajar</p>
                <p className="mt-1 text-xs leading-relaxed italic">{tutor.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Units & Programs Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Programs & Units Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Program yang Diampu */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Program yang Diampu</h3>
              </div>
              <div className="space-y-1.5 pt-1">
                {(tutor.subjects || "Cermat Matematika, Mengaji & Tahfidz").split(",").map((s, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs font-bold text-indigo-900 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {s.trim()}
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Mengajar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Unit Mengajar</h3>
              </div>
              <div className="space-y-1.5 pt-1">
                {(tutor.units_teaching || "Unit Riscon Rancaekek, Unit Panorama Jatinangor").split(",").map((u, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-sky-50/50 border border-sky-100 text-xs font-bold text-sky-900 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    {u.trim()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Jenis Kelas */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Jenis Kelas Bimbingan</h3>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(tutor.class_types || "Semi Privat, Privat, Online").split(",").map((c, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-100">
                  ✓ {c.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
