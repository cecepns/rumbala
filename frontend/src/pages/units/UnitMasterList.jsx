import React, { useState, useEffect, useCallback } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Plus, Edit2, Trash2, MapPin, Phone, Home, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function UnitMasterList() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    status: "active"
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.UNITS.LIST, { search });
      if (res.success) {
        setUnits(res.data || []);
      }
    } catch (err) {
      toast.error("Gagal memuat data unit cabang");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUnit(u);
    setFormData({
      name: u.name,
      address: u.address || "",
      phone: u.phone || "",
      status: u.status || "active"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingUnit) {
        const res = await request.put(API_ENDPOINTS.UNITS.UPDATE(editingUnit.id), formData);
        if (res.success) {
          toast.success("Data unit berhasil diperbarui!");
          setIsModalOpen(false);
          fetchUnits();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.UNITS.CREATE, formData);
        if (res.success) {
          toast.success("Unit cabang baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchUnits();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data unit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.UNITS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Unit berhasil dihapus.");
        setDeleteTarget(null);
        fetchUnits();
      }
    } catch (err) {
      toast.error("Gagal menghapus unit");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Jaringan Operasional Cabang
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Manajemen Unit & Lokasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola unit cabang pembelajaran resmi Rumbala (Unit Riscon Rancaekek, Unit Panorama Jatinangor, dll).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Unit Baru
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nama unit cabang, alamat, kontak..."
          onSearch={setSearch}
          className="w-full sm:w-80"
        />

        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          Lokasi Privat Home Visit otomatis menggunakan alamat rumah siswa.
        </div>
      </div>

      {/* Unit Cards Grid */}
      {loading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : units.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {units.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{u.name}</h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {u.status === "active" ? "Unit Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      title="Edit Unit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      title="Hapus Unit"
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{u.address || "Alamat belum diatur."}</p>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="font-semibold text-slate-800">{u.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Unit ID: #{u.id}</span>
                <span className="text-primary-600 font-semibold">Tersinkron dengan Jadwal & SPP</span>
              </div>
            </div>
          ))}

          {/* Virtual Info Card for Home Visit */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-3 border-b border-indigo-100/60 pb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-indigo-950">Privat Home Visit (Rumah Siswa)</h3>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    Otomatis Lokasi Rumah
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-indigo-900/80 leading-relaxed">
                Untuk sesi dengan jenis kelas <strong>Privat Home Visit</strong>, lokasi secara cerdas merujuk pada alamat rumah masing-masing siswa dan sistem otomatis menghitung tarif transport honor tutor.
              </p>
            </div>
            <div className="text-[11px] font-extrabold text-indigo-700">
              ✓ Terintegrasi dengan Honor Tutor & Transport
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Tidak Ada Unit Cabang"
          description="Belum ada unit cabang belajar yang didaftarkan."
          actionText="Tambah Unit Baru"
          onAction={handleOpenCreate}
        />
      )}

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnit ? "Ubah Unit Cabang" : "Tambah Unit Cabang Baru"}
        subtitle="Lengkapi nama unit cabang, alamat lengkap, dan kontak operasional"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nama Unit Cabang *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Unit Panorama Jatinangor"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Alamat Lengkap Unit
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Alamat jalan, nomor ruko / blok perumahan, kelurahan, kecamatan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                No. Telepon / WhatsApp Unit
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 081234567801"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Operasional
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="active">Aktif Beroperasi</option>
                <option value="inactive">Nonaktif / Tutup Sementara</option>
              </select>
            </div>
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
              {isSaving ? "Menyimpan..." : editingUnit ? "Perbarui Unit" : "Simpan Unit"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Unit"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
