import React, { useState, useEffect, useCallback } from "react";
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
  GraduationCap,
  MessageCircle,
  Mail,
  Building2,
  Car,
  Layers,
  Award,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

const AVAILABLE_UNITS = [
  "Unit Riscon Rancaekek",
  "Unit Panorama Jatinangor",
  "Rumah Belajar Pusat"
];

const AVAILABLE_CLASS_TYPES = [
  "Semi Privat",
  "Privat di Tempat Les",
  "Online Privat",
  "Online Semi Privat",
  "Privat Home Visit"
];

const DEFAULT_PROGRAM_OPTIONS = [
  "Cermat Matematika",
  "Prisma",
  "English BEC",
  "Calistung",
  "Ngaji / Tahfidz",
  "Bimbel Tematik SD",
  "Sains & IPA"
];

export default function TutorList() {
  const [tutors, setTutors] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create/Edit Tutor Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subjects: ["Cermat Matematika"],
    units_teaching: ["Unit Riscon Rancaekek"],
    class_types: ["Semi Privat", "Privat di Tempat Les"],
    fee_per_session: 75000,
    status: "active",
    bio: "",
    rates: []
  });
  const [isSaving, setIsSaving] = useState(false);

  // Manage Specific Rates Modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedTutorForRate, setSelectedTutorForRate] = useState(null);
  const [rateForm, setRateForm] = useState({
    program_name: "Cermat Matematika",
    class_type: "Semi Privat",
    duration_minutes: 90,
    rate_per_session: 75000,
    transport_fee: 0,
    notes: ""
  });
  const [isSavingRate, setIsSavingRate] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availablePrograms = Array.from(
    new Set([
      ...programsList.map((p) => p.name).filter(Boolean),
      ...DEFAULT_PROGRAM_OPTIONS
    ])
  );

  const fetchOptions = async () => {
    try {
      const pRes = await request.get(API_ENDPOINTS.PROGRAMS.LIST);
      if (pRes.success) setProgramsList(pRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.TUTORS.LIST, {
        page,
        limit,
        search,
        status: statusFilter
      });
      if (res.success) {
        setTutors(res.data || []);
        setTotal(res.pagination?.total || res.data?.length || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat data tutor");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const handleOpenCreateModal = () => {
    setEditingTutor(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subjects: ["Cermat Matematika"],
      units_teaching: ["Unit Riscon Rancaekek"],
      class_types: ["Semi Privat", "Privat di Tempat Les"],
      fee_per_session: 75000,
      status: "active",
      bio: "",
      rates: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tutor) => {
    setEditingTutor(tutor);
    const unitsArr = tutor.units_teaching
      ? tutor.units_teaching.split(",").map((u) => u.trim()).filter(Boolean)
      : ["Unit Riscon Rancaekek"];
    const classArr = tutor.class_types
      ? tutor.class_types.split(",").map((c) => c.trim()).filter(Boolean)
      : ["Semi Privat"];
    const subjectsArr = tutor.subjects
      ? tutor.subjects.split(",").map((s) => s.trim()).filter(Boolean)
      : ["Cermat Matematika"];

    setFormData({
      name: tutor.name,
      email: tutor.email || "",
      phone: tutor.phone,
      subjects: subjectsArr,
      units_teaching: unitsArr,
      class_types: classArr,
      fee_per_session: tutor.fee_per_session || 75000,
      status: tutor.status || "active",
      bio: tutor.bio || "",
      rates: tutor.rates || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        subjects: Array.isArray(formData.subjects)
          ? formData.subjects.join(", ")
          : (formData.subjects || ""),
        units_teaching: Array.isArray(formData.units_teaching)
          ? formData.units_teaching.join(", ")
          : (formData.units_teaching || ""),
        class_types: Array.isArray(formData.class_types)
          ? formData.class_types.join(", ")
          : (formData.class_types || "")
      };

      if (editingTutor) {
        const res = await request.put(API_ENDPOINTS.TUTORS.UPDATE(editingTutor.id), payload);
        if (res.success) {
          toast.success("Data tutor berhasil diperbarui!");
          setIsModalOpen(false);
          fetchTutors();
        }
      } else {
        const res = await request.post(API_ENDPOINTS.TUTORS.CREATE, payload);
        if (res.success) {
          toast.success("Data tutor baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchTutors();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data tutor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.TUTORS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success("Data tutor berhasil dihapus.");
        setDeleteTarget(null);
        fetchTutors();
      }
    } catch (err) {
      toast.error("Gagal menghapus data tutor");
    } finally {
      setIsDeleting(false);
    }
  };

  // Subject/Program checkbox toggle
  const toggleSubject = (subject) => {
    const current = Array.isArray(formData.subjects)
      ? formData.subjects
      : (formData.subjects ? formData.subjects.split(",").map((s) => s.trim()).filter(Boolean) : []);
    const exists = current.includes(subject);
    const updated = exists
      ? current.filter((s) => s !== subject)
      : [...current, subject];
    setFormData({
      ...formData,
      subjects: updated
    });
  };

  // Unit checkbox toggle
  const toggleUnit = (unit) => {
    const exists = formData.units_teaching.includes(unit);
    setFormData({
      ...formData,
      units_teaching: exists
        ? formData.units_teaching.filter((u) => u !== unit)
        : [...formData.units_teaching, unit]
    });
  };

  // Class type checkbox toggle
  const toggleClassType = (type) => {
    const exists = formData.class_types.includes(type);
    setFormData({
      ...formData,
      class_types: exists
        ? formData.class_types.filter((t) => t !== type)
        : [...formData.class_types, type]
    });
  };

  // Manage Rates
  const handleOpenManageRates = (tutor) => {
    setSelectedTutorForRate(tutor);
    setRateForm({
      program_name: programsList[0]?.name || "Cermat Matematika",
      class_type: "Semi Privat",
      duration_minutes: 90,
      rate_per_session: tutor.fee_per_session || 75000,
      transport_fee: 0,
      notes: ""
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!selectedTutorForRate) return;
    try {
      setIsSavingRate(true);
      const res = await request.post(API_ENDPOINTS.TUTORS.ADD_RATE(selectedTutorForRate.id), rateForm);
      if (res.success) {
        toast.success("Tarif honor per program berhasil ditambahkan!");
        // Refresh tutor rate in state
        const updatedRes = await request.get(API_ENDPOINTS.TUTORS.DETAIL(selectedTutorForRate.id));
        if (updatedRes.success) setSelectedTutorForRate(updatedRes.data);
        fetchTutors();
      }
    } catch (err) {
      toast.error("Gagal menambahkan tarif honor");
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleDeleteRate = async (rateId) => {
    if (!selectedTutorForRate) return;
    try {
      const res = await request.delete(API_ENDPOINTS.TUTORS.DELETE_RATE(selectedTutorForRate.id, rateId));
      if (res.success) {
        toast.success("Tarif honor berhasil dihapus.");
        const updatedRes = await request.get(API_ENDPOINTS.TUTORS.DETAIL(selectedTutorForRate.id));
        if (updatedRes.success) setSelectedTutorForRate(updatedRes.data);
        fetchTutors();
      }
    } catch (err) {
      toast.error("Gagal menghapus tarif");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
            Pendidik & Edukator
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Data Tutor Pengajar & Struktur Honor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data tutor, program yang diampu, unit mengajar, jenis kelas, tarif per program, dan tambahan transport Privat Home Visit.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Tutor Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nama tutor, mapel, no. telepon..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-semibold"
        >
          <option value="">Semua Status</option>
          <option value="active">Tutor Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Tutor Cards Grid */}
      {loading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : tutors.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {tutors.map((tutor) => (
            <div
              key={tutor.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                      {tutor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-base text-slate-900">{tutor.name}</h2>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tutor.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tutor.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Tutor ID: #{tutor.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(tutor)}
                      title="Edit Tutor"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tutor)}
                      title="Hapus Tutor"
                      className="p-1.5 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact & Bio */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                  <button
                    onClick={() => {
                      const url = createWhatsAppUrl(tutor.phone, `Halo Tutor ${tutor.name}`);
                      window.open(url, "_blank");
                    }}
                    className="flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> {tutor.phone}
                  </button>
                  {tutor.email && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5" /> {tutor.email}
                    </span>
                  )}
                </div>

                {/* Units & Class Types */}
                <div className="mt-4 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Program & Keahlian:
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs">
                      {tutor.subjects || "Cermat Matematika"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Unit Mengajar:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(tutor.units_teaching || "Unit Riscon Rancaekek").split(",").map((u, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400" /> {u.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Jenis Kelas yang Dapat Diajar:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(tutor.class_types || "Semi Privat").split(",").map((c, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            c.includes("Home Visit")
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {c.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rates Breakdown */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-700 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Struktur Honor Mengajar ({tutor.rates?.length || 1} Tarif)
                    </span>
                    <button
                      onClick={() => handleOpenManageRates(tutor)}
                      className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
                    >
                      + Atur Tarif Khusus
                    </button>
                  </div>

                  {tutor.rates && tutor.rates.length > 0 ? (
                    <div className="space-y-1.5">
                      {tutor.rates.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <p className="font-bold text-slate-800">
                              {r.program_name} &bull; <span className="text-slate-500">{r.class_type}</span>
                            </p>
                            {parseFloat(r.transport_fee) > 0 && (
                              <p className="text-[10px] text-purple-600 font-semibold flex items-center gap-1">
                                <Car className="w-3 h-3" /> +Transport Home Visit: {formatRupiah(r.transport_fee)}
                              </p>
                            )}
                          </div>
                          <span className="font-extrabold text-emerald-700">{formatRupiah(r.rate_per_session)}/sesi</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tarif Standar (Default):</span>
                      <span className="font-extrabold text-emerald-700">
                        {formatRupiah(tutor.fee_per_session)}/sesi
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 italic text-[11px]">
                  {tutor.bio || "Edukator bersertifikasi Rumbala"}
                </span>
                <button
                  onClick={() => handleOpenManageRates(tutor)}
                  className="px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold text-xs transition-colors"
                >
                  Kelola Tarif Honor &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Tidak Ada Data Tutor"
          description="Belum ada data tutor pengajar yang tersimpan."
          actionText="Tambah Tutor Baru"
          onAction={handleOpenCreateModal}
        />
      )}

      {/* Modal 1: Create/Edit Tutor Profile */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTutor ? "Ubah Data Tutor" : "Tambah Tutor Pengajar Baru"}
        subtitle="Lengkapi unit mengajar, jenis kelas, program, dan tarif dasar"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Lengkap Tutor *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Sarah Azzahra, S.Pd"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                No. WhatsApp *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email Tutor
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sarah.tutor@rumbala.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Keaktifan
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="active">Aktif Mengajar</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Program & Keahlian Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Pilihan Keahlian Program / Mata Pelajaran *
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Bisa pilih lebih dari satu</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availablePrograms.map((progName) => {
                const isChecked = Array.isArray(formData.subjects)
                  ? formData.subjects.includes(progName)
                  : (formData.subjects || "").includes(progName);
                return (
                  <label
                    key={progName}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSubject(progName)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{progName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Unit Mengajar Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Pilihan Unit Cabang Mengajar *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_UNITS.map((unit) => (
                <label
                  key={unit}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    formData.units_teaching.includes(unit)
                      ? "bg-primary-50 border-primary-300 text-primary-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.units_teaching.includes(unit)}
                    onChange={() => toggleUnit(unit)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span>{unit}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Class Types Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Pilihan Jenis Kelas yang Dapat Diajar *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_CLASS_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    formData.class_types.includes(type)
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.class_types.includes(type)}
                    onChange={() => toggleClassType(type)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tarif Honor Dasar (Bebas Input Nominal, Contoh: 5000, 7500, 50000) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={formData.fee_per_session}
              onChange={(e) => setFormData({ ...formData, fee_per_session: e.target.value })}
              placeholder="Contoh: 5000, 7500, 80000"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-emerald-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Nominal bebas tanpa batasan kelipatan (misal: fee per anak/sesi Rp 5.000 atau Rp 7.500). Untuk tarif beda per program, atur via tombol &quot;Kelola Tarif Honor&quot;.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Biografi Singkat & Pengalaman Mengajar
            </label>
            <textarea
              rows={2}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Latar belakang pendidikan, spesialisasi, atau sertifikasi..."
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
              {isSaving ? "Menyimpan..." : editingTutor ? "Perbarui Tutor" : "Simpan Tutor"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Manage Rates & Transport per Program */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title={`Atur Tarif Honor: ${selectedTutorForRate?.name}`}
        subtitle="Konfigurasi honor berbeda berdasarkan program, jenis kelas, dan tambahan transport Home Visit"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* List Existing Rates */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Daftar Tarif Honor Terdaftar:
            </h3>

            {selectedTutorForRate?.rates && selectedTutorForRate.rates.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                {selectedTutorForRate.rates.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {r.program_name} &bull; <span className="text-primary-700">{r.class_type}</span> ({r.duration_minutes || 90}m)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Fee Mengajar: <strong>{formatRupiah(r.rate_per_session)}</strong>
                        {parseFloat(r.transport_fee) > 0 && (
                          <span className="text-purple-700 font-bold ml-2">
                            + Transport: {formatRupiah(r.transport_fee)}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-emerald-700">
                        Total: {formatRupiah(parseFloat(r.rate_per_session) + parseFloat(r.transport_fee || 0))}
                      </span>
                      <button
                        onClick={() => handleDeleteRate(r.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Hapus tarif ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada tarif spesifik, masih menggunakan default.</p>
            )}
          </div>

          {/* Add New Rate Form */}
          <form onSubmit={handleSaveRate} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary-600" />
              Tambah Tarif Program / Jenis Kelas Baru:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Program Bimbingan *
                </label>
                <select
                  value={rateForm.program_name}
                  onChange={(e) => setRateForm({ ...rateForm, program_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                >
                  {availablePrograms.map((pName) => (
                    <option key={pName} value={pName}>
                      {pName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Jenis Kelas *
                </label>
                <select
                  value={rateForm.class_type}
                  onChange={(e) => {
                    const ct = e.target.value;
                    setRateForm({
                      ...rateForm,
                      class_type: ct,
                      transport_fee: ct === "Privat Home Visit" ? 25000 : 0
                    });
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                >
                  <option value="Semi Privat">Semi Privat</option>
                  <option value="Privat di Tempat Les">Privat di Tempat Les</option>
                  <option value="Online Privat">Online Privat</option>
                  <option value="Privat Home Visit">Privat Home Visit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Fee Mengajar / Sesi (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={rateForm.rate_per_session}
                  onChange={(e) => setRateForm({ ...rateForm, rate_per_session: e.target.value })}
                  placeholder="Contoh: 5000, 7500, 75000"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Uang Transport Home Visit (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateForm.transport_fee}
                  onChange={(e) => setRateForm({ ...rateForm, transport_fee: e.target.value })}
                  placeholder="Contoh: 25000"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold text-purple-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Durasi Sesi (Menit)
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  step="any"
                  value={rateForm.duration_minutes}
                  onChange={(e) => setRateForm({ ...rateForm, duration_minutes: parseInt(e.target.value) || 90 })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingRate}
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingRate ? "Menyimpan..." : "+ Tambahkan Tarif Ini"}
              </button>
            </div>
          </form>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsRateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Tutor"
        message={`Apakah Anda yakin ingin menghapus tutor "${deleteTarget?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
