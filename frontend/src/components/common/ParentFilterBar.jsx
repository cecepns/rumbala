import React from "react";
import { useParentPortal } from "../../context/ParentPortalContext";
import { User, BookOpen, Layers, Sparkles } from "lucide-react";

export default function ParentFilterBar({ className = "" }) {
  const {
    childrenList,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    selectedProgram,
    setSelectedProgram,
    childPrograms,
  } = useParentPortal();

  if (!childrenList || childrenList.length === 0) return null;

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Filter Portal Ortu
          </span>
          <p className="text-xs sm:text-sm font-extrabold text-slate-800">
            {selectedChild?.name || "Pilih Anak"} &bull;{" "}
            <span className="text-primary-600 font-semibold">{selectedProgram}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
        {/* Child Selector */}
        <div className="relative flex-1 sm:flex-initial min-w-[180px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <User className="w-4 h-4 text-sky-600" />
          </div>
          <select
            value={selectedChildId || ""}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
          >
            {childrenList.map((child) => (
              <option key={child.id} value={child.id}>
                Anak: {child.name} ({child.class_grade})
              </option>
            ))}
          </select>
        </div>

        {/* Program Selector */}
        <div className="relative flex-1 sm:flex-initial min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="Semua Program">Program: Semua Program ({childPrograms.length})</option>
            {childPrograms.map((prog) => (
              <option key={prog.id} value={prog.program_name}>
                {prog.program_name} ({prog.package_sessions}x/bln)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
