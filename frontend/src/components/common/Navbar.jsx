import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Menu, LogOut, User, Sparkles, BookOpen, ShieldCheck, UserCheck, Users } from "lucide-react";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Admin Lembaga
          </span>
        );
      case "tutor":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Tutor Pengajar
          </span>
        );
      case "parent":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            Orang Tua / Siswa
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Rumbala Logo" className="h-9 w-auto object-contain drop-shadow-sm" />
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-800 leading-tight">Rumbala</h1>
            <p className="text-[11px] text-slate-500 font-medium">Bimbingan Belajar & Les Privat</p>
          </div>
        </div>
      </div>

      {/* Right side Profile & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <div className="mt-0.5">{getRoleBadge(user.role)}</div>
            </div>

            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <button
              onClick={logout}
              title="Keluar"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
