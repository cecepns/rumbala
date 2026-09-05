import React, { useState, useEffect, useCallback } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Plus, Edit2, Trash2, BookOpen, Layers, Award, Sparkles, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ProgramMasterList() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "akademik",
    evaluation_type: "general",
    default_fee: 350000,
    default_fee_per_session: 43750,
    default_tutor_fee: 75000,
    description: "",
    status: "active"
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.PROGRAMS.LIST, {
        search,
        category: categoryFilter
      });
      if (res.success) {
        setPrograms(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat data program master");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setFormData({
      name: "",
      code: "",
      category: "akademik",
      evaluation_type: "general",
      default_fee: 350000,
      default_fee_per_session: 43750,
      default_tutor_fee: 75000,
      description: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProgram(p);
    setFormData({
      name: p.name,
      code: p.code || "",
      category: p.category || "akademik",
      evaluation_type: p.evaluation_type || "general",
      default_fee: p.default_fee || 350000,
      default_fee_per_session: p.default_fee_per_session || 43750,
      default_tutor_fee: p.default_tutor_fee || 75000,
      description: p.description || "",
      status: p.status || "active"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingProgram) {
        const res = await request.put(API_ENDPOINTS.PROGRAMS.UPDATE(editingProgram.id), formData);
        if (res.success) {
          toast.success("Program bimbingan berhasil diperbarui!");
          setIsModalOpen(false);
          fetchPrograms();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.PROGRAMS.CREATE, formData);
        if (res.success) {
          toast.success("Program bimbingan baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchPrograms();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan program");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.PROGRAMS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Program berhasil dihapus.");
        setDeleteTarget(null);
        fetchPrograms();
      }
    } catch (err) {
      toast.error("Gagal menghapus program");
    } finally {
      setIsDeleting(false);
    }
  };

  const evalBadgeColor = (type) => {
    switch (type) {
      case "math":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "english":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "prisma":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "mengaji":
      case "tahfidz":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Kurikulum & Layanan Rumbala
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Manajemen Program & Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur program bimbingan, paket 4/8/12 pertemuan, tarif SPP siswa, sistem evaluasi khusus, dan default fee tutor.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Program Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari program (Pracalis, Prisma, MTK, English, Tahfidz)..."
          onSearch={setSearch}
          className="w-full sm:w-80"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-semibold"
        >
          <option value="">Semua Kategori</option>
          <option value="akademik">Akademik & Berhitung</option>
          <option value="quran">Al-Qur'an & Tahfidz</option>
          <option value="bahasa">Bahasa (English & Arab)</option>
          <option value="pracalis">Pracalis / Usia Dini</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : programs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Program & Kode</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Model Rubrik Evaluasi</th>
                  <th className="py-3.5 px-4">Tarif Siswa (SPP/Bln)</th>
                  <th className="py-3.5 px-4">Fee Tutor / Sesi</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-extrabold text-xs">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-xs sm:text-sm">{p.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">Kode: {p.code || "RMB"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${evalBadgeColor(
                          p.evaluation_type
                        )}`}
                      >
                        Rubrik {p.evaluation_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {formatRupiah(p.default_fee)} <span className="text-[10px] font-normal text-slate-400">/ 8 sesi</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {formatRupiah(p.default_tutor_fee)} <span className="text-[10px] font-normal text-slate-400">/ sesi</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          p.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Program"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus Program"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Tidak Ada Program"
            description="Belum ada program bimbingan belajar yang tersimpan."
            actionText="Tambah Program Baru"
            onAction={handleOpenCreate}
          />
        )}
      </div>

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProgram ? "Ubah Program Bimbingan" : "Tambah Program Baru"}
        subtitle="Atur kategori, model rubrik evaluasi, tarif siswa dan fee tutor"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Program *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Cerdas Matematika"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kode Singkat Program
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Contoh: CR-MTK"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori Program
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="akademik">Akademik & Hitung</option>
                <option value="quran">Al-Qur'an & Tahfidz</option>
                <option value="bahasa">Bahasa (English & Arab)</option>
                <option value="pracalis">Pracalis / Usia Dini</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Model Rubrik Evaluasi Pembelajaran *
              </label>
              <select
                value={formData.evaluation_type}
                onChange={(e) => setFormData({ ...formData, evaluation_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="math">Cerdas Matematika (Konsep, Ketelitian, Problem Solving)</option>
                <option value="english">Bahasa inggris BEC (Vocabulary, Grammar, Reading, Speaking)</option>
                <option value="prisma">Hitung Prisma kalkulator tangan (Kecepatan, Ketepatan, Koordinasi)</option>
                <option value="mengaji">Mengaji metode umii & tilawati (Makhraj, Kelancaran, Tajwid)</option>
                <option value="tahfidz">Tahfidz (Hafalan, Murojaah, Mutqin)</option>
                <option value="general">Umum / Standard (Pracalis, Baca Tulis Abama, Bahasa Arab)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tarif SPP Siswa (8 Sesi)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.default_fee}
                onChange={(e) => setFormData({ ...formData, default_fee: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tarif Siswa / Sesi
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.default_fee_per_session}
                onChange={(e) => setFormData({ ...formData, default_fee_per_session: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Default Fee Tutor / Sesi
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.default_tutor_fee}
                onChange={(e) => setFormData({ ...formData, default_tutor_fee: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Deskripsi Singkat Program
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Fokus dan keunggulan kurikulum program ini..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : editingProgram ? "Perbarui Program" : "Simpan Program"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Program"
        message={`Apakah Anda yakin ingin menghapus program "${deleteTarget?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
