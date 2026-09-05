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
  HelpCircle,
  Building2,
  Layers,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function StudentList() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [units, setUnits] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Tutor: Edit Learning Profile Modal
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

  // Admin: Student CRUD Modal
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
    subjects: "Pracalis",
    tuition_fee_per_session: 100000,
    status: "active",
    notes: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  // Admin: Manage Multi-Program per Student Modal
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [selectedStudentForProgram, setSelectedStudentForProgram] = useState(null);
  const [editingProgramItem, setEditingProgramItem] = useState(null);
  const [programFormData, setProgramFormData] = useState({
    program_name: "Pracalis",
    unit_name: "Unit Riscon Rancaekek",
    class_type: "Semi Privat",
    tutor_id: "",
    package_sessions: 8,
    monthly_fee: 300000,
    schedule_info: "",
    status: "active"
  });
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOptions = async () => {
    try {
      const [tRes, uRes, pRes] = await Promise.all([
        request.get(API_ENDPOINTS.TUTORS.LIST),
        request.get(API_ENDPOINTS.UNITS.LIST),
        request.get(API_ENDPOINTS.PROGRAMS.LIST)
      ]);
      if (tRes.success) setTutors(tRes.data || []);
      if (uRes.success) setUnits(uRes.data || []);
      if (pRes.success) setProgramsList(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      if (role === "tutor") {
        const res = await request.get(API_ENDPOINTS.TUTOR_STUDENTS.LIST);
        if (res.success) {
          const list = res.data || [];
          const filtered = search
            ? list.filter(
                (s) =>
                  s.name?.toLowerCase().includes(search.toLowerCase()) ||
                  s.nickname?.toLowerCase().includes(search.toLowerCase()) ||
                  s.program_name?.toLowerCase().includes(search.toLowerCase()) ||
                  s.programs?.some((p) => p.program_name?.toLowerCase().includes(search.toLowerCase()))
              )
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
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Tutor: Open Learning Profile Modal
  const handleOpenLearningProfile = (st, prog) => {
    const targetProg = prog || (st.programs && st.programs[0]) || {};
    setSelectedStudentForProfile({
      ...st,
      program_id: targetProg.id,
      program_name: targetProg.program_name || st.program_name || "Pracalis",
    });
    setLearningProfileForm({
      program_id: targetProg.id || null,
      program_name: targetProg.program_name || st.program_name || "Pracalis",
      initial_level: targetProg.initial_level || "",
      strengths: targetProg.strengths || "",
      areas_for_improvement: targetProg.areas_for_improvement || "",
      learning_targets: targetProg.learning_targets || "",
      special_needs: targetProg.special_needs || "",
      important_notes: targetProg.important_notes || st.notes || "",
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

  // Admin Student CRUD Handlers
  const handleOpenCreateStudent = () => {
    setEditingStudent(null);
    setFormData({
      name: "",
      nickname: "",
      birth_date: "",
      parent_name: "",
      parent_phone: "",
      parent_email: "",
      address: "",
      class_grade: "Kelas 1 SD",
      school: "",
      subjects: "Pracalis",
      tuition_fee_per_session: 100000,
      status: "active",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditStudent = (st) => {
    setEditingStudent(st);
    setFormData({
      name: st.name,
      nickname: st.nickname || "",
      birth_date: st.birth_date ? new Date(st.birth_date).toISOString().split("T")[0] : "",
      parent_name: st.parent_name,
      parent_phone: st.parent_phone,
      parent_email: st.parent_email || "",
      address: st.address || "",
      class_grade: st.class_grade,
      school: st.school,
      subjects: st.subjects || "Pracalis",
      tuition_fee_per_session: st.tuition_fee_per_session || 100000,
      status: st.status || "active",
      notes: st.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
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

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.STUDENTS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Data siswa berhasil dihapus.");
        setDeleteTarget(null);
        fetchStudents();
      }
    } catch (err) {
      toast.error("Gagal menghapus siswa");
    } finally {
      setIsDeleting(false);
    }
  };

  // Program Management Modal Handlers
  const handleOpenAddProgram = (student) => {
    setSelectedStudentForStudent(student);
    setEditingProgramItem(null);
    const initialProg = programsList[0] || {};
    setProgramFormData({
      student_id: student.id,
      program_name: initialProg.name || "Pracalis",
      unit_name: units[0]?.name || "Unit Riscon Rancaekek",
      class_type: "Semi Privat",
      tutor_id: tutors[0]?.id || "",
      package_sessions: 8,
      monthly_fee: initialProg.default_fee || 300000,
      schedule_info: "",
      status: "active"
    });
    setIsProgramModalOpen(true);
  };

  const setSelectedStudentForStudent = (student) => {
    setSelectedStudentForProgram(student);
  };

  const handleOpenEditProgram = (student, progItem) => {
    setSelectedStudentForProgram(student);
    setEditingProgramItem(progItem);

    // Find matching program in master program list (case-insensitive fallback)
    const matchedMaster = programsList.find((p) => p.name.trim().toLowerCase() === (progItem.program_name || "").trim().toLowerCase())
      || programsList.find((p) => p.name === progItem.program_name);

    const exactName = matchedMaster ? matchedMaster.name : (progItem.program_name || programsList[0]?.name || "Pracalis");

    setProgramFormData({
      student_id: student.id,
      program_name: exactName,
      unit_name: progItem.unit_name || units[0]?.name || "Unit Riscon Rancaekek",
      class_type: progItem.class_type || "Semi Privat",
      tutor_id: progItem.tutor_id || "",
      package_sessions: progItem.package_sessions || 8,
      monthly_fee: progItem.monthly_fee || matchedMaster?.default_fee || 300000,
      schedule_info: progItem.schedule_info || "",
      status: progItem.status || "active"
    });
    setIsProgramModalOpen(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    try {
      setIsSavingProgram(true);
      if (editingProgramItem) {
        const res = await request.put(API_ENDPOINTS.STUDENT_PROGRAMS.UPDATE(editingProgramItem.id), programFormData);
        if (res.success) {
          toast.success("Program bimbingan siswa berhasil diperbarui!");
          setIsProgramModalOpen(false);
          fetchStudents();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.STUDENT_PROGRAMS.CREATE, {
          ...programFormData,
          student_id: selectedStudentForProgram?.id
        });
        if (res.success) {
          toast.success("Program bimbingan baru berhasil ditambahkan!");
          setIsProgramModalOpen(false);
          fetchStudents();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan program siswa");
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleDeleteProgram = async (progId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus program ini dari siswa?")) return;
    try {
      const res = await request.delete(API_ENDPOINTS.STUDENT_PROGRAMS.DELETE(progId));
      if (res.success) {
        toast.success("Program siswa berhasil dihapus.");
        fetchStudents();
      }
    } catch (err) {
      toast.error("Gagal menghapus program");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            {role === "tutor" ? "Portal Tutor Pengajar" : "Manajemen Administrasi Siswa"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {role === "tutor" ? "Daftar Siswa Bimbingan Saya" : "Data Siswa & Multi-Program"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {role === "tutor"
              ? "Kelola catatan capaian awal, kekuatan, target, dan kebutuhan khusus anak didik."
              : "Satu siswa dapat mengambil lebih dari satu program (Matematika di Riscon, English di Panorama, dll) dengan data mandiri."}
          </p>
        </div>

        {role !== "tutor" && (
          <button
            onClick={handleOpenCreateStudent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Daftarkan Siswa Baru
          </button>
        )}
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nama siswa, orang tua, sekolah, no WA..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-96"
        />

        <div className="text-xs font-semibold text-slate-500">
          Total: <strong className="text-slate-800">{total}</strong> Siswa Terdata
        </div>
      </div>

      {/* Students List Container */}
      {loading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : students.length > 0 ? (
        <div className="space-y-4">
          {students.map((st) => (
            <div
              key={st.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:border-primary-200 transition-all p-5 space-y-4"
            >
              {/* Header: Student Identity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                    {st.name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">{st.name}</h2>
                      {st.nickname && (
                        <span className="text-xs font-bold text-slate-400">({st.nickname})</span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                        {st.class_grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <School className="w-3.5 h-3.5 text-slate-400" /> {st.school || "Sekolah Umum"} &bull;{" "}
                      <span>Ortu: <strong>{st.parent_name}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {role !== "tutor" && st.parent_phone && (
                    <button
                      onClick={() => {
                        const url = createWhatsAppUrl(st.parent_phone, `Halo Ayah/Bunda dari ananda ${st.name}`);
                        window.open(url, "_blank");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WA Ortu
                    </button>
                  )}

                  {role !== "tutor" && (
                    <button
                      onClick={() => handleOpenAddProgram(st)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ambil Program Lain
                    </button>
                  )}

                  {role !== "tutor" && (
                    <button
                      onClick={() => handleOpenEditStudent(st)}
                      title="Edit Data Siswa"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {role !== "tutor" && (
                    <button
                      onClick={() => setDeleteTarget(st)}
                      title="Hapus Siswa"
                      className="p-1.5 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Programs Section */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary-600" />
                  Program Bimbingan yang Diambil (Multi-Program):
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {st.programs && st.programs.length > 0 ? (
                    st.programs.map((prog, idx) => (
                      <div
                        key={prog.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-primary-300 transition-all space-y-2.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-primary-600 tracking-wider">
                                Program #{idx + 1}
                              </span>
                              <h3 className="text-sm font-extrabold text-slate-900">{prog.program_name}</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              Paket {prog.package_sessions || 8}x / Bln
                            </span>
                          </div>

                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            <p className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{prog.unit_name || "Unit Riscon Rancaekek"}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                {prog.class_type || "Semi Privat"}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              👩‍🏫 Tutor: <strong>{prog.tutor_name || "Tutor Belum Ditugaskan"}</strong>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              🗓️ Jadwal: <span>{prog.schedule_info || "Sesuai Jadwal Les"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Tarif SPP:</span>
                            <span className="font-extrabold text-slate-800">{formatRupiah(prog.monthly_fee)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                              {prog.completed_sessions_month || 0}/{prog.package_sessions || 8} Sesi
                            </span>
                            {role === "tutor" && (
                              <button
                                onClick={() => handleOpenLearningProfile(st, prog)}
                                title="Update Catatan Belajar Program Ini"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs transition-colors cursor-pointer"
                              >
                                <FileEdit className="w-3.5 h-3.5" /> Catatan
                              </button>
                            )}
                            {role !== "tutor" && (
                              <button
                                onClick={() => handleOpenEditProgram(st, prog)}
                                title="Edit Program Siswa"
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {role !== "tutor" && st.programs.length > 1 && (
                              <button
                                onClick={() => handleDeleteProgram(prog.id)}
                                title="Hapus Program Ini"
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      {role === "tutor"
                        ? "Belum ada program aktif yang ditugaskan ke Anda untuk siswa ini."
                        : "Belum ada program aktif. Klik tombol \"+ Ambil Program Lain\" untuk menambahkan."}
                    </div>
                  )}
                </div>
              </div>

              {/* Tutor Learning Profile Quick Button */}
              {role === "tutor" && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Profil Pembelajaran: {st.initial_level || "Belum diisi"}</span>
                  <button
                    onClick={() => handleOpenLearningProfile(st, st.programs && st.programs[0])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Update Catatan Belajar Siswa
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
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
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Tidak Ada Data Siswa"
          description="Belum ada data siswa yang tersimpan."
          actionText={role !== "tutor" ? "Daftarkan Siswa Baru" : undefined}
          onAction={role !== "tutor" ? handleOpenCreateStudent : undefined}
        />
      )}

      {/* Modal 1: Create/Edit Student Master Info */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? "Ubah Identitas Siswa" : "Daftarkan Siswa Baru"}
        subtitle="Lengkapi identitas anak, orang tua, dan kontak wali"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Lengkap Anak *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Keenan Alvaro Pratama"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20 font-semibold"
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
                placeholder="Contoh: Keenan"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kelas / Grade *
              </label>
              <input
                type="text"
                required
                value={formData.class_grade}
                onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                placeholder="Contoh: Kelas 5 SD / TK B"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
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
                placeholder="Contoh: SDIT Al-Madani"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Orang Tua / Wali *
              </label>
              <input
                type="text"
                required
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                placeholder="Contoh: Bunda Rina & Ayah Dimas"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor WhatsApp Orang Tua *
              </label>
              <input
                type="text"
                required
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Alamat Rumah Siswa (Digunakan juga untuk Privat Home Visit)
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Alamat perumahan / jalan tempat tinggal siswa..."
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
              {isSaving ? "Menyimpan..." : editingStudent ? "Perbarui Siswa" : "Daftarkan Siswa"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add/Edit Program for Student (Multi-Program) */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title={editingProgramItem ? "Ubah Program Siswa" : `Tambah Program: ${selectedStudentForProgram?.name}`}
        subtitle="Setiap program memiliki unit, jenis kelas, paket, tutor, dan tarif tersendiri"
      >
        <form onSubmit={handleSaveProgram} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilih Program Bimbingan *
              </label>
              <select
                value={programFormData.program_name}
                onChange={(e) => {
                  const selName = e.target.value;
                  const found = programsList.find((p) => p.name === selName);
                  setProgramFormData({
                    ...programFormData,
                    program_name: selName,
                    monthly_fee: found?.default_fee || programFormData.monthly_fee
                  });
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                {programsList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unit Cabang Belajar *
              </label>
              <select
                value={programFormData.unit_name}
                onChange={(e) => setProgramFormData({ ...programFormData, unit_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pilihan Jenis Kelas *
              </label>
              <select
                value={programFormData.class_type}
                onChange={(e) => setProgramFormData({ ...programFormData, class_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="Semi Privat">Semi Privat</option>
                <option value="Privat di Tempat Les">Privat di Tempat Les</option>
                <option value="Online Privat">Online Privat</option>
                <option value="Online Semi Privat">Online Semi Privat</option>
                <option value="Privat Home Visit">Privat Home Visit (Rumah Siswa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Paket Pertemuan / Bulan *
              </label>
              <select
                value={programFormData.package_sessions}
                onChange={(e) => setProgramFormData({ ...programFormData, package_sessions: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              >
                <option value={4}>Paket 4x Pertemuan / Bulan (1x seminggu)</option>
                <option value={8}>Paket 8x Pertemuan / Bulan (2x seminggu)</option>
                <option value={12}>Paket 12x Pertemuan / Bulan (3x seminggu)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tutor Pengajar Yang Ditugaskan
              </label>
              <select
                value={programFormData.tutor_id}
                onChange={(e) => setProgramFormData({ ...programFormData, tutor_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="">-- Pilih Tutor Pengajar --</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tarif SPP Bulanan Program Ini (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={programFormData.monthly_fee}
                onChange={(e) => setProgramFormData({ ...programFormData, monthly_fee: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Informasi Hari & Jam Jadwal
            </label>
            <input
              type="text"
              value={programFormData.schedule_info}
              onChange={(e) => setProgramFormData({ ...programFormData, schedule_info: e.target.value })}
              placeholder="Contoh: Senin & Rabu 15:30 - 17:00"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProgramModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingProgram}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingProgram ? "Menyimpan..." : editingProgramItem ? "Perbarui Program" : "Simpan Program Siswa"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Tutor Edit Learning Profile */}
      <Modal
        isOpen={!!selectedStudentForProfile}
        onClose={() => setSelectedStudentForProfile(null)}
        title={`Profil Pembelajaran: ${selectedStudentForProfile?.name}`}
        subtitle={`Program: ${selectedStudentForProfile?.program_name}`}
      >
        <form onSubmit={handleSaveLearningProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Level Awal Siswa
            </label>
            <input
              type="text"
              value={learningProfileForm.initial_level}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, initial_level: e.target.value })}
              placeholder="Contoh: Pemahaman Pecahan Dasar (Grade 5)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kekuatan & Potensi Siswa
            </label>
            <textarea
              rows={2}
              value={learningProfileForm.strengths}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, strengths: e.target.value })}
              placeholder="Daya tangkap cepat, percaya diri saat menjawab soal..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
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
              placeholder="Perlu pembiasaan menuliskan langkah runtut..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Target Pembelajaran Sesi Mendatang
            </label>
            <input
              type="text"
              value={learningProfileForm.learning_targets}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, learning_targets: e.target.value })}
              placeholder="Contoh: Menguasai KPK, FPB, dan Pecahan Campuran"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kebutuhan Khusus & Pendekatan Belajar
            </label>
            <textarea
              rows={2}
              value={learningProfileForm.important_notes}
              onChange={(e) => setLearningProfileForm({ ...learningProfileForm, important_notes: e.target.value })}
              placeholder="Gunakan gamifikasi atau media visual..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedStudentForProfile(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingProfile ? "Menyimpan..." : "Simpan Profil Pembelajaran"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStudent}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteTarget?.name}" beserta seluruh programnya?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
