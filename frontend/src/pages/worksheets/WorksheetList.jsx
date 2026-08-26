import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { FileText, Plus, Download, Trash2, BookOpen, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

export default function WorksheetList() {
  const { role } = useAuth();
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "Matematika",
    grade_level: "Kelas 5 SD"
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorksheets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.WORKSHEETS.LIST, {
        page,
        limit,
        search,
        subject: subjectFilter
      });
      if (res.success) {
        setWorksheets(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat modul worksheet");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, subjectFilter]);

  useEffect(() => {
    fetchWorksheets();
  }, [fetchWorksheets]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.subject) return;

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("subject", formData.subject);
      data.append("grade_level", formData.grade_level);
      if (selectedFile) {
        data.append("file", selectedFile);
      }

      const res = await request.upload(API_ENDPOINTS.WORKSHEETS.CREATE, data);
      if (res.success) {
        toast.success("Worksheet berhasil diunggah!");
        setIsModalOpen(false);
        setFormData({ title: "", description: "", subject: "Matematika", grade_level: "Kelas 5 SD" });
        setSelectedFile(null);
        fetchWorksheets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengunggah worksheet");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.WORKSHEETS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Worksheet berhasil dihapus.");
        setDeleteTarget(null);
        fetchWorksheets();
      }
    } catch (err) {
      toast.error("Gagal menghapus worksheet");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Worksheet & Modul Pembelajaran
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bank lembar kerja soal, modul pengayaan materi, dan arsip dokumen tugas les.
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Upload Worksheet Baru
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari judul modul, mata pelajaran, materi..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Semua Mata Pelajaran</option>
          <option value="Matematika">Matematika</option>
          <option value="Bahasa Inggris">Bahasa Inggris</option>
          <option value="Fisika">Fisika</option>
          <option value="IPA">IPA</option>
        </select>
      </div>

      {/* Grid of Worksheets */}
      <div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat berkas worksheet...</div>
        ) : worksheets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worksheets.map((ws) => (
              <div
                key={ws.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full inline-block">
                      {ws.subject}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{ws.grade_level}</span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-800 mt-2 leading-snug">
                    {ws.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {ws.description || "Lembar kerja latihan soal dan modul pembahasan terpadu."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDate(ws.created_at)}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={ws.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh PDF
                    </a>

                    {role !== "parent" && (
                      <button
                        onClick={() => setDeleteTarget(ws)}
                        title="Hapus Modul"
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Tidak Ada Worksheet"
            description="Belum ada lembar kerja atau materi yang diunggah."
            actionText={role !== "parent" ? "Upload Worksheet Baru" : undefined}
            onAction={role !== "parent" ? () => setIsModalOpen(true) : undefined}
          />
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Lembar Kerja / Worksheet Baru"
        subtitle="Materi bahan ajar untuk siswa dan tutor"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Judul Worksheet / Modul *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Modul Pengayaan Operasi Pecahan"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mata Pelajaran *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Contoh: Matematika"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tingkatan Kelas *
              </label>
              <input
                type="text"
                required
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                placeholder="Contoh: Kelas 5 SD"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Deskripsi Materi
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi cakupan materi atau instruksi pengerjaan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Dokumen File (PDF / Gambar / Doc)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                <div className="flex text-xs text-slate-600">
                  <label className="relative cursor-pointer rounded-md font-bold text-primary-600 hover:text-primary-500">
                    <span>Pilih file dari perangkat</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  {selectedFile ? selectedFile.name : "PDF, PNG, JPG hingga 15MB"}
                </p>
              </div>
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
              disabled={isUploading}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isUploading ? "Mengunggah..." : "Simpan Worksheet"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Worksheet"
        message={`Apakah Anda yakin ingin menghapus worksheet "${deleteTarget?.title}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
