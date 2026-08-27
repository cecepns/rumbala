import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatRupiah, createWhatsAppUrl } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  MessageCircle,
  School,
  BookOpen,
  Calendar,
  MapPin,
  Sparkles,
  UserCheck,
  Award,
  Target,
  FileEdit,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function StudentList() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Tutor: Edit Data Pembelajaran Siswa Modal
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);
  const [learningProfileForm, setLearningProfileForm] = useState({
    program_name: "",
    initial_level: "",
    strengths: "",
    areas_for_improvement: "",
    learning_targets: "",
    special_needs: "",
    important_notes: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Admin: CRUD Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    birth_date: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    address: "",
    class_grade: "Kelas 5 SD",
    school: "",
    subjects: "Cermat Matematika",
    tuition_fee_per_session: 100000,
    notes: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      if (role === "tutor") {
        const res = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (res.success) {
          const list = res.data || [];
          const filtered = search
            ? list.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()) || s.program_name?.toLowerCase().includes(search.toLowerCase()))
            : list;
          setStudents(filtered);
          setTotal(filtered.length);
          setTotalPages(1);
        }
      } else {
        const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, {
          page,
          limit,
          search
        });
        if (res.success) {
          setStudents(res.data || []);
          setTotal(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      toast.error("Gagal memuat data siswa");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Tutor: Open Learning Profile Modal
  const handleOpenLearningProfile = (st) => {
    setSelectedStudentForProfile(st);
    setLearningProfileForm({
      program_name: st.program_name || "Cermat Matematika",
      initial_level: st.initial_level || "",
      strengths: st.strengths || "",
      areas_for_improvement: st.areas_for_improvement || "",
      learning_targets: st.learning_targets || "",
      special_needs: st.special_needs || "",
      important_notes: st.important_notes || st.notes || "",
    });
  };

  const handleSaveLearningProfile = async (e) => {
    e.preventDefault();
    if (!selectedStudentForProfile) return;
    try {
      setIsSavingProfile(true);
      const res = await request.put(
        API_ENDPOINTS.TUTOR_STUDENTS.UPDATE_LEARNING_PROFILE(selectedStudentForProfile.id),
        learningProfileForm
      );
      if (res.success) {
        toast.success("Data pembelajaran siswa berhasil diperbarui!");
        setSelectedStudentForProfile(null);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data pembelajaran");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Admin CRUD Handlers
  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      name: "",
      nickname: "",
      birth_date: "",
      parent_name: "",
      parent_phone: "",
      parent_email: "",
      address: "",
      class_grade: "Kelas 5 SD",
      school: "",
      subjects: "Cermat Matematika",
      tuition_fee_per_session: 100000,
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      nickname: student.nickname || student.name,
      birth_date: student.birth_date ? student.birth_date.split("T")[0] : "",
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email || "",
      address: student.address || "",
      class_grade: student.class_grade,
      school: student.school,
      subjects: student.subjects,
      tuition_fee_per_session: student.tuition_fee_per_session,
      notes: student.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingStudent) {
        const res = await request.put(API_ENDPOINTS.STUDENTS.UPDATE(editingStudent.id), formData);
        if (res.success) {
          toast.success("Data siswa berhasil diperbarui!");
          setIsModalOpen(false);
          fetchStudents();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.STUDENTS.CREATE, formData);
        if (res.success) {
          toast.success("Siswa baru berhasil didaftarkan!");
          setIsModalOpen(false);
          fetchStudents();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data siswa");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.STUDENTS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Siswa berhasil dihapus.");
        setDeleteTarget(null);
        fetchStudents();
      }
    } catch (err) {
      toast.error("Gagal menghapus siswa");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "tutor" ? "Portal Tutor" : "Manajemen Lembaga"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "tutor" ? "Siswa Saya" : "Data Siswa & Program Belajar"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "tutor"
              ? "Daftar siswa bimbingan yang Anda ampu lengkap dengan unit, jenis kelas, paket, progress bulan berjalan, dan data profil pembelajaran."
              : "Kelola data master siswa, relasi akun orang tua, paket bimbingan, dan program yang diambil."}
          </p>
        </div>

        {role === "admin" ? (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-primary-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa Baru
          </button>
        ) : (
          <a
            href={createWhatsAppUrl("081212788313", `Halo Admin Rumbala, saya Tutor ${user?.name || "Rumbala"} ingin melakukan koordinasi terkait siswa bimbingan.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Hubungi Admin
          </a>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <DebouncedSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari nama siswa, sekolah, atau program..."
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold self-start sm:self-center">
          Total: <strong className="text-slate-800">{total} Siswa</strong>
        </div>
      </div>

      {/* Student List View */}
      {role === "tutor" ? (
        /* Tutor View: "Siswa Saya" Cards without CRUD / Fee */
        loading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum Ada Siswa yang Ditugaskan"
            description="Admin akan menentukan siswa asuhan dan program yang Anda ampu."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Student Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {st.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{st.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{st.class_grade} &bull; {st.school}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                      {st.completed_sessions_month || 0}/{st.package_sessions || 8} Sesi
                    </span>
                  </div>

                  {/* Tutor Info Details */}
                  <div className="mt-3 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                        <span className="text-slate-500">Program:</span>
                        <span className="font-extrabold text-slate-900">{st.program_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold">
                        {st.class_type || "Semi Privat"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">Unit:</span>
                      <span className="font-semibold text-slate-800">{st.unit_name || "Unit Riscon"}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-slate-500">Jadwal:</span>
                      <span className="font-semibold text-slate-800">{st.schedule_info || "Senin & Kamis 15.30"}</span>
                    </div>

                    {/* Data Pembelajaran Highlights */}
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 uppercase text-[10px]">Data Pembelajaran:</span>
                        <span className="text-slate-400">{st.initial_level || "Level Dasar"}</span>
                      </div>
                      {st.strengths && (
                        <p className="text-emerald-900 leading-snug">
                          <strong className="text-emerald-800">Kekuatan:</strong> {st.strengths}
                        </p>
                      )}
                      {st.learning_targets && (
                        <p className="text-sky-900 leading-snug">
                          <strong className="text-sky-800">Target:</strong> {st.learning_targets}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tutor Actions: Edit Learning Profile */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Status: <strong className="text-emerald-700 font-bold">Aktif</strong></span>
                  <button
                    onClick={() => handleOpenLearningProfile(st)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Data Pembelajaran
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Admin View: Full Table with CRUD */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum Ada Data Siswa"
              description="Tambahkan data siswa bimbingan pertama Anda sekarang."
              actionText="Tambah Siswa"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">Wali & Kontak</th>
                    <th className="px-6 py-4">Program yang Diikuti</th>
                    <th className="px-6 py-4">Sesi Selesai</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-slate-900 text-sm">{st.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{st.class_grade} &bull; {st.school}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{st.parent_name}</p>
                        <p className="text-[11px] text-slate-500">{st.parent_phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        {st.programs && st.programs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {st.programs.map((p) => (
                              <span key={p.id} className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold">
                                {p.program_name} ({p.completed_sessions_month}/{p.package_sessions})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 font-semibold">{st.subjects}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">
                        {st.total_sessions_completed || 0} Sesi
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(st)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Siswa"
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
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={setLimit}
            totalItems={total}
          />
        </div>
      )}

      {/* Modal Tutor: Edit Data Pembelajaran Siswa */}
      <Modal
        isOpen={!!selectedStudentForProfile}
        onClose={() => setSelectedStudentForProfile(null)}
        title={`Data Pembelajaran: ${selectedStudentForProfile?.name}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveLearningProfile} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900">
            <span className="font-bold flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Catatan Pembelajaran Fondasional
            </span>
            Data ini cukup diisi pada awal bimbingan atau diperbarui saat ada perkembangan signifikan, tanpa perlu diulang setiap pertemuan.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Program Belajar
            </label>
            <input
              type="text"
              value={learningProfileForm.program_name}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kemampuan / Level Awal Siswa
            </label>
            <input
              type="text"
              value={learningProfileForm.initial_level}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, initial_level: e.target.value })}
              placeholder="Contoh: Pemahaman Pecahan Dasar / Iqro 4 / Juz 30 Surah Al-Mulk"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kekuatan Siswa
              </label>
              <textarea
                rows={2}
                value={learningProfileForm.strengths}
                onChange={(e) => setLearningProfileForm({ ...learningProfileForm, strengths: e.target.value })}
                placeholder="Contoh: Logika cepat tangkap, makhraj fasih..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Bagian yang Perlu Ditingkatkan
              </label>
              <textarea
                rows={2}
                value={learningProfileForm.areas_for_improvement}
                onChange={(e) => setLearningProfileForm({ ...learningProfileForm, areas_for_improvement: e.target.value })}
                placeholder="Contoh: Ketelitian menuliskan rumus, murojaah mandiri..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Target Pembelajaran
            </label>
            <input
              type="text"
              value={learningProfileForm.learning_targets}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, learning_targets: e.target.value })}
              placeholder="Contoh: Menguasai KPK, FPB, dan Pecahan Campuran"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kebutuhan Belajar Khusus (Opsional)
              </label>
              <input
                type="text"
                value={learningProfileForm.special_needs}
                onChange={(e) => setLearningProfileForm({ ...learningProfileForm, special_needs: e.target.value })}
                placeholder="Contoh: Memerlukan visual gambar / media interaktif"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Catatan Penting Pembelajaran
              </label>
              <input
                type="text"
                value={learningProfileForm.important_notes}
                onChange={(e) => setLearningProfileForm({ ...learningProfileForm, important_notes: e.target.value })}
                placeholder="Contoh: Sangat antusias saat diberi kuis tantangan"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedStudentForProfile(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {isSavingProfile ? "Menyimpan..." : "Simpan Data Pembelajaran"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal CRUD Siswa (Admin Only) */}
      {role === "admin" && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingStudent ? "Edit Data Siswa" : "Tambah Siswa Baru"}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Keenan Alvaro"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Panggilan
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Keenan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kelas / Tingkat
                </label>
                <input
                  type="text"
                  value={formData.class_grade}
                  onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                  placeholder="Kelas 5 SD"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Asal Sekolah
                </label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  placeholder="SDIT Al-Azhar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="Ibu Ratna Sari"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  No. WhatsApp Wali
                </label>
                <input
                  type="text"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="081388776655"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Program Bimbingan
              </label>
              <input
                type="text"
                value={formData.subjects}
                onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                placeholder="Cermat Matematika, English BEC, Mengaji & Tahfidz"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Data Siswa"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus siswa ${deleteTarget?.name}? Data kehadiran dan jadwal terkait juga akan terhapus.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
