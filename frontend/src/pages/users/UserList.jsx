import React, { useState, useEffect, useCallback } from "react";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatCard from "../../components/common/StatCard";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import {
  Users,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Search,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import toast from "react-hot-toast";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admin: 0, tutor: 0, parent: 0 });
  const [tutorsList, setTutorsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "parent",
    phone: "",
    linked_tutor_id: "",
    linked_student_ids: []
  });

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("password123");
  const [isResetting, setIsResetting] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Options (Tutors & Students for linking)
  const fetchLinkOptions = async () => {
    try {
      const [tutorRes, studentRes] = await Promise.all([
        request.get(API_ENDPOINTS.TUTORS.LIST),
        request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 200 })
      ]);
      if (tutorRes.success) setTutorsList(tutorRes.data || []);
      if (studentRes.success) setStudentsList(studentRes.data || []);
    } catch (err) {
      console.error("Error fetching link options:", err);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.USERS.LIST, {
        page,
        limit,
        search,
        role: roleFilter,
      });

      if (res.success) {
        setUsers(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) {
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err) {
      toast.error(err.message || "Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchLinkOptions();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "password123",
      role: "tutor",
      phone: "",
      linked_tutor_id: "",
      linked_student_ids: []
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    const linkedIds = user.linked_student_ids
      ? user.linked_student_ids.split(",").map((id) => parseInt(id.trim()))
      : [];

    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "parent",
      phone: user.phone || "",
      linked_tutor_id: user.linked_tutor_id || "",
      linked_student_ids: linkedIds
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenReset = (user) => {
    setResetTargetUser(user);
    setNewPassword("password123");
    setResetModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.role) {
      toast.error("Mohon lengkapi data yang wajib diisi.");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("Password wajib diisi untuk akun baru.");
      return;
    }

    try {
      setIsSaving(true);
      let res;
      if (editingUser) {
        res = await request.put(API_ENDPOINTS.USERS.UPDATE(editingUser.id), formData);
      } else {
        res = await request.post(API_ENDPOINTS.USERS.CREATE, formData);
      }

      if (res.success) {
        toast.success(res.message || "Data pengguna berhasil disimpan.");
        setIsModalOpen(false);
        fetchUsers();
        fetchLinkOptions();
      }
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan data pengguna.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    try {
      setIsResetting(true);
      const res = await request.post(API_ENDPOINTS.USERS.RESET_PASSWORD(resetTargetUser.id), {
        new_password: newPassword,
      });
      if (res.success) {
        toast.success(res.message || "Password berhasil direset.");
        setResetModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || "Gagal mereset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await request.delete(API_ENDPOINTS.USERS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success(res.message || "Akun pengguna berhasil dihapus.");
        setDeleteTarget(null);
        fetchUsers();
        fetchLinkOptions();
      }
    } catch (err) {
      toast.error(err.message || "Gagal menghapus pengguna.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    const id = parseInt(studentId);
    setFormData((prev) => {
      const exists = prev.linked_student_ids.includes(id);
      return {
        ...prev,
        linked_student_ids: exists
          ? prev.linked_student_ids.filter((item) => item !== id)
          : [...prev.linked_student_ids, id],
      };
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Administrator
          </span>
        );
      case "tutor":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            Tutor Pengajar
          </span>
        );
      case "parent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
            Orang Tua / Wali
          </span>
        );
      default:
        return <span className="text-xs font-medium text-slate-500 capitalize">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100/80 text-sky-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Pengguna &amp; Akun
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola akun otentikasi login untuk Administrator, Tutor Pengajar, dan Orang Tua Siswa.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pengguna"
          value={stats.total || 0}
          subtitle="Semua Akun Terdaftar"
          icon={Users}
          colorClass="bg-sky-50 text-sky-600 border-sky-100"
        />
        <StatCard
          title="Administrator"
          value={stats.admin || 0}
          subtitle="Akses Penuh Sistem"
          icon={ShieldCheck}
          colorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
        />
        <StatCard
          title="Tutor Pengajar"
          value={stats.tutor || 0}
          subtitle="Portal Absensi & Nilai"
          icon={GraduationCap}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard
          title="Orang Tua / Wali"
          value={stats.parent || 0}
          subtitle="Portal Pantau Belajar"
          icon={HeartHandshake}
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => {
                setRoleFilter("");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === ""
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Semua ({stats.total || 0})
            </button>
            <button
              onClick={() => {
                setRoleFilter("admin");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "admin"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Admin ({stats.admin || 0})
            </button>
            <button
              onClick={() => {
                setRoleFilter("tutor");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "tutor"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Tutor ({stats.tutor || 0})
            </button>
            <button
              onClick={() => {
                setRoleFilter("parent");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "parent"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Orang Tua ({stats.parent || 0})
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <DebouncedSearch
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Cari nama, username, email, no HP..."
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : users.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Pengguna"
            description={
              search || roleFilter
                ? "Tidak ada data pengguna yang cocok dengan kriteria pencarian Anda."
                : "Belum ada akun pengguna yang terdaftar di sistem."
            }
            actionLabel="Tambah Pengguna Baru"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4">Kontak (Email / HP)</th>
                  <th className="py-3.5 px-4">Profil Terhubung</th>
                  <th className="py-3.5 px-4">Terdaftar</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase text-xs">
                          {user.name ? user.name.substring(0, 2) : "US"}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Linked Profile */}
                    <td className="py-3.5 px-4">
                      {user.role === "tutor" ? (
                        user.linked_tutor_name ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/60 font-semibold">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{user.linked_tutor_name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum terhubung tutor</span>
                        )
                      ) : user.role === "parent" ? (
                        user.linked_students_names ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 font-semibold">
                            <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                            <span className="truncate max-w-[160px]" title={user.linked_students_names}>
                              Anak: {user.linked_students_names}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum terhubung siswa</span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Akses Sistem Utama</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReset(user)}
                          title="Reset Password"
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit Pengguna"
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          title="Hapus Pengguna"
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              limit={limit}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              totalItems={total}
            />
          </div>
        )}
      </div>

      {/* Modal Create / Edit User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit Akun Pengguna" : "Tambah Pengguna Baru"}
        subtitle={
          editingUser
            ? `Perbarui data akun otentikasi untuk ${editingUser.name}`
            : "Buat akun login baru untuk Admin, Tutor, atau Orang Tua Siswa."
        }
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Peran / Role Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Peran Pengguna (Role) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === "admin"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === "admin"}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="sr-only"
                />
                <ShieldCheck className="w-5 h-5 mb-1 text-indigo-600" />
                <span className="text-xs">Administrator</span>
              </label>

              <label
                className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === "tutor"
                    ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="tutor"
                  checked={formData.role === "tutor"}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="sr-only"
                />
                <GraduationCap className="w-5 h-5 mb-1 text-emerald-600" />
                <span className="text-xs">Tutor Pengajar</span>
              </label>

              <label
                className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === "parent"
                    ? "border-amber-600 bg-amber-50/70 text-amber-900 font-bold ring-2 ring-amber-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="parent"
                  checked={formData.role === "parent"}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="sr-only"
                />
                <HeartHandshake className="w-5 h-5 mb-1 text-amber-600" />
                <span className="text-xs">Orang Tua / Wali</span>
              </label>
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Azzahra, S.Pd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="081234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Username & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username Login *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. tutor.sarah"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="sarah@rumbala.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Password (Required for create, optional for edit) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {editingUser ? "Ganti Password (Kosongkan jika tidak diubah)" : "Password Login *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required={!editingUser}
                placeholder={editingUser ? "Masukkan password baru jika ingin mengubah" : "Minimal 6 karakter"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!editingUser && (
              <p className="text-[11px] text-slate-400 mt-1">
                Default: <span className="font-mono text-slate-600 font-bold">password123</span>
              </p>
            )}
          </div>

          {/* Dynamic Profile Linking */}
          {formData.role === "tutor" && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Hubungkan dengan Profil Tutor
              </label>
              <select
                value={formData.linked_tutor_id}
                onChange={(e) => setFormData({ ...formData, linked_tutor_id: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Pilih Profil Tutor (Opsional) --</option>
                {tutorsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-700 leading-tight">
                Menghubungkan akun ini akan mengizinkan tutor melihat jadwal dan mengisi absensi muridnya.
              </p>
            </div>
          )}

          {formData.role === "parent" && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                Hubungkan dengan Siswa / Anak
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white rounded-lg border border-amber-200">
                {studentsList.length === 0 ? (
                  <p className="text-xs text-slate-400">Tidak ada data siswa</p>
                ) : (
                  studentsList.map((st) => {
                    const isSelected = formData.linked_student_ids.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        onClick={() => handleStudentSelect(st.id)}
                        className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-amber-100/70 text-amber-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span>
                          {st.name} <span className="text-[11px] text-slate-400">({st.class_grade || "SD"})</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-amber-700 leading-tight">
                Orang tua dapat melihat perkembangan belajar, jadwal, laporan AI, dan tagihan invoice untuk anak yang dipilih.
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-primary-600/20"
            >
              {isSaving ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Buat Akun Pengguna"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Quick Reset Password */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password Pengguna"
        subtitle={`Atur password baru untuk akun ${resetTargetUser?.name} (@${resetTargetUser?.username})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  toast.success("Password disalin ke clipboard!");
                }}
                title="Salin Password"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setNewPassword("password123")}
                className="text-[11px] font-bold text-sky-600 hover:underline"
              >
                Gunakan "password123"
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setNewPassword(`rumbala${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[11px] font-bold text-purple-600 hover:underline"
              >
                Generate Acak
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isResetting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-amber-600/20"
            >
              {isResetting ? "Memproses..." : "Reset Password Sekarang"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun pengguna "${deleteTarget?.name}" (@${deleteTarget?.username})? Pengguna ini tidak akan bisa login lagi ke sistem.`}
        confirmText={isDeleting ? "Menghapus..." : "Ya, Hapus Akun"}
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
