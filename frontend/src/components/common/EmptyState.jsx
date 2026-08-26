import React from "react";
import { FolderSearch } from "lucide-react";

export default function EmptyState({
  icon: Icon = FolderSearch,
  title = "Belum Ada Data",
  description = "Tidak ada data yang cocok dengan pencarian atau filter yang dipilih.",
  actionText,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-4">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
