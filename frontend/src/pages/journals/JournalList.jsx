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
import { BookOpenCheck, Plus, Edit2, Trash2, CheckCircle, Calendar, User, Award } from "lucide-react";
import toast from "react-hot-toast";

export default function JournalList() {
  const { user, role } = useAuth();
  const [journals, setJournals] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Create & Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    date: new Date().toISOString().split("T")[0],
    topic: "",
    targets_achieved: "",
    score: 85,
    progress_notes: "",
    homework: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOptions = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.TUTORS.LIST, { limit: 100 })
      ]);
      if (sRes.success) setStudents(sRes.data || []);
      if (tRes.success) setTutors(tRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search
      };
      if (role === "parent" && user?.student_id) {
        params.student_id = user.student_id;
      }
      if (role === "tutor" && user?.tutor_id) {
        params.tutor_id = user.tutor_id;
      }

      const res = await request.get(API_ENDPOINTS.JOURNALS.LIST, params);
      if (res.success) {
        setJournals(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat jurnal pembelajaran");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role, user]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const handleOpenCreate = () => {
    setEditingJournal(null);
    setFormData({
      student_id: students[0]?.id || "",
      tutor_id: user?.tutor_id || tutors[0]?.id || "",
      date: new Date().toISOString().split("T")[0],
      topic: "",
      targets_achieved: "",
      score: 85,
      progress_notes: "",
      homework: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (journal) => {
    setEditingJournal(journal);
    setFormData({
      student_id: journal.student_id,
      tutor_id: journal.tutor_id,
      date: journal.date ? journal.date.split("T")[0] : new Date().toISOString().split("T")[0],
      topic: journal.topic,
      targets_achieved: journal.targets_achieved || "",
      score: journal.score || 85,
      progress_notes: journal.progress_notes || "",
      homework: journal.homework || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.topic) {
      toast.error("Siswa dan topik materi wajib diisi!");
      return;
    }

    try {
      setIsSaving(true);
      if (editingJournal) {
        const res = await request.put(API_ENDPOINTS.JOURNALS.UPDATE(editingJournal.id), formData);
        if (res.success) {
          toast.success("Jurnal mengajar berhasil diperbarui!");
          setIsModalOpen(false);
          fetchJournals();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.JOURNALS.CREATE, formData);
        if (res.success) {
          toast.success("Jurnal mengajar baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchJournals();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan jurnal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.JOURNALS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Jurnal mengajar berhasil dihapus.");
        setDeleteTarget(null);
        fetchJournals();
      }
    } catch (err) {
      toast.error("Gagal menghapus jurnal");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-primary-600" />
            Jurnal Mengajar & Aktivitas Belajar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dokumentasi materi yang diajarkan, target kompetensi, skor evaluasi, dan catatan kemajuan siswa.
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm shadow-primary-500/20 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Jurnal Baru
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <DebouncedSearch
          placeholder="Cari materi topik, nama siswa, tutor, atau target capaian..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-96"
        />
      </div>

      {/* Journals Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : journals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {journals.map((journal) => (
              <div
                key={journal.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top metadata */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full inline-block">
                        Pertemuan #{journal.session_number || 1}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-800 mt-1.5 leading-snug">
                        {journal.topic}
                      </h3>
                    </div>
                    {journal.score && (
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Skor Sesi</span>
                        <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">
                          {journal.score}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <p className="font-bold text-slate-700 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Target Capaian:
                      </p>
                      <p className="text-slate-600 pl-5 leading-relaxed">{journal.targets_achieved}</p>
                    </div>

                    {journal.progress_notes && (
                      <div>
                        <p className="font-bold text-slate-700">Catatan Perkembangan Siswa:</p>
                        <p className="text-slate-600 pl-1 leading-relaxed">{journal.progress_notes}</p>
                      </div>
                    )}

                    {journal.homework && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900">
                        <p className="font-bold text-[11px]">Tugas / Pekerjaan Rumah (PR):</p>
                        <p className="text-xs">{journal.homework}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer student, tutor, and action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[10px]">
                      {journal.student_name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{journal.student_name}</span>
                      <span className="text-[10px] text-slate-400">{journal.class_grade} • Tutor: {journal.tutor_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                      {formatDate(journal.date)}
                    </span>

                    {role !== "parent" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(journal)}
                          title="Edit Jurnal"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(journal)}
                          title="Hapus Jurnal"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpenCheck}
            title="Tidak Ada Jurnal Belajar"
            description="Belum ada jurnal materi pembelajaran yang tersimpan."
            actionText={role !== "parent" ? "+ Tambah Jurnal Baru" : undefined}
            onAction={role !== "parent" ? handleOpenCreate : undefined}
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

      {/* Create / Edit Journal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJournal ? "Ubah Jurnal Mengajar" : "Tambah Jurnal Mengajar Baru"}
        subtitle="Dokumentasikan materi, capaian target, dan evaluasi hasil belajar"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Siswa *
              </label>
              <select
                required
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Pilih Siswa</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class_grade} - {s.subjects})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tutor Pengajar *
              </label>
              <select
                required
                value={formData.tutor_id}
                onChange={(e) => setFormData({ ...formData, tutor_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Pilih Tutor</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Sesi *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Topik / Materi Pembelajaran *
              </label>
              <input
                type="text"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Contoh: Operasi Pecahan Campuran & Desimal"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Target Capaian Pembelajaran *
            </label>
            <textarea
              rows={2}
              required
              value={formData.targets_achieved}
              onChange={(e) => setFormData({ ...formData, targets_achieved: e.target.value })}
              placeholder="Contoh: Siswa mampu mengubah pecahan biasa ke desimal dan menyelesaikan soal cerita..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nilai / Skor Latihan (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tugas / Pekerjaan Rumah (PR)
              </label>
              <input
                type="text"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                placeholder="Contoh: Latihan soal no. 5-10 di buku Rumbala hal. 24"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Perkembangan & Keaktifan Siswa
            </label>
            <textarea
              rows={2}
              value={formData.progress_notes}
              onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
              placeholder="Contoh: Siswa sangat fokus hari ini, daya tangkap konsep operasi matematika meningkat..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
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
              {isSaving ? "Menyimpan..." : editingJournal ? "Perbarui Jurnal" : "Simpan Jurnal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Jurnal Mengajar"
        message={`Apakah Anda yakin ingin menghapus catatan jurnal materi "${deleteTarget?.topic}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
