import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  CheckSquare,
  BookOpenCheck,
  Sparkles,
  TrendingUp,
  Receipt,
  CircleDollarSign,
  Award,
  CalendarClock,
  UserCheck,
  User,
  X
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role || "parent";

  // Role-specific navigation definitions
  let navigation = [];

  if (role === "parent") {
    navigation = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Jadwal Les", href: "/schedules", icon: CalendarDays },
      { name: "Riwayat Kehadiran", href: "/attendance", icon: CheckSquare },
      { name: "Izin / Reschedule", href: "/reschedule", icon: CalendarClock, badge: "Baru" },
      { name: "Jurnal Belajar", href: "/journals", icon: BookOpenCheck },
      { name: "Progress & Capaian", href: "/progress", icon: TrendingUp },
      { name: "Laporan Perkembangan", href: "/ai-reports", icon: Sparkles, badge: "Rapor" },
      { name: "Invoice & Tagihan", href: "/invoices", icon: Receipt, badge: "SPP" },
      { name: "Profil Anak", href: "/child-profile", icon: User },
    ];
  } else if (role === "tutor") {
    navigation = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Jadwal Mengajar", href: "/schedules", icon: CalendarDays },
      { name: "Siswa Saya", href: "/students", icon: Users },
      { name: "Absensi", href: "/attendance", icon: CheckSquare },
      { name: "Izin / Reschedule", href: "/reschedule", icon: CalendarClock },
      { name: "Jurnal Mengajar", href: "/journals", icon: BookOpenCheck },
      { name: "Progress Belajar", href: "/progress", icon: TrendingUp },
      { name: "Generate Laporan AI", href: "/ai-reports", icon: Sparkles, badge: "AI" },
      { name: "Rekap Mengajar & Honor", href: "/tutor-recaps", icon: Award },
      { name: "Profil Tutor", href: "/tutor-profile", icon: UserCheck },
    ];
  } else {
    // Admin navigation
    navigation = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Data Siswa", href: "/students", icon: Users },
      { name: "Data Tutor", href: "/tutors", icon: GraduationCap },
      { name: "Jadwal Les", href: "/schedules", icon: CalendarDays },
      { name: "Absensi", href: "/attendance", icon: CheckSquare },
      { name: "Izin / Reschedule", href: "/reschedule", icon: CalendarClock },
      { name: "Jurnal Mengajar", href: "/journals", icon: BookOpenCheck },
      { name: "Progress Belajar", href: "/progress", icon: TrendingUp },
      { name: "Laporan AI Siswa", href: "/ai-reports", icon: Sparkles, badge: "AI" },
      { name: "Invoice & SPP", href: "/invoices", icon: Receipt },
      { name: "Rekap Keuangan", href: "/finances", icon: CircleDollarSign },
      { name: "Rekap Honor Tutor", href: "/tutor-recaps", icon: Award },
    ];
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xl lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Rumbala" className="h-8 w-auto object-contain" />
            <span className="font-extrabold text-lg text-slate-800 tracking-tight">RUMBALA</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Capsule */}
        <div className="px-4 py-3 m-3 bg-gradient-to-r from-sky-50 to-indigo-50/70 border border-sky-100/80 rounded-xl">
          <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">Akses Portal</p>
          <p className="text-sm font-extrabold text-slate-800 truncate">{user?.name || "Pengguna"}</p>
          <p className="text-xs text-slate-500 font-medium capitalize">
            {role === "parent" ? "Orang Tua / Wali" : role === "tutor" ? "Tutor Pengajar" : "Administrator"}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-primary-600 text-white shadow-sm shadow-primary-500/30"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.badge === "AI" || item.badge === "Rapor"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-bold">Rumbala EdTech 2026</p>
          <p className="text-[10px] text-slate-400">Rumah Belajar Alfatih</p>
        </div>
      </aside>
    </>
  );
}
