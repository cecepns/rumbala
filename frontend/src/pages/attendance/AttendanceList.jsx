import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate, formatTime } from "../../utils/helpers";
import DebouncedSearch from "../../components/common/DebouncedSearch";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import { TableSkeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { CheckSquare, Plus, CheckCircle, Clock, XCircle, AlertCircle, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

export default function AttendanceList() {
  const { user, role } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    tutor_id: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "15:30",
    end_time: "17:00",
    status: "hadir",
    notes: "",
    // Integrated Teaching Journal
    topic: "",
    targets_achieved: "",
    score: 85,
    progress_notes: "",
    homework: ""
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const fetchAttendances = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search,
        date: dateFilter,
        status: statusFilter
      };
      if (role === "parent" && user?.student_id) {
        params.student_id = user.student_id;
      }
      if (role === "tutor" && user?.tutor_id) {
        params.tutor_id = user.tutor_id;
      }

      const res = await request.get(API_ENDPOINTS.ATTENDANCES.LIST, params);
      if (res.success) {
        setAttendances(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dateFilter, statusFilter, role, user]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const handleOpenCreate = () => {
    setFormData({
      student_id: students[0]?.id || "",
      tutor_id: user?.tutor_id || tutors[0]?.id || "",
      date: new Date().toISOString().split("T")[0],
      start_time: "15:30",
      end_time: "17:00",
      status: "hadir",
      notes: "",
      topic: "",
      targets_achieved: "",
      score: 85,
      progress_notes: "",
      homework: ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await request.post(API_ENDPOINTS.ATTENDANCES.CREATE, formData);
      if (res.success) {
        toast.success(res.message || "Absensi dan jurnal berhasil disimpan!");
        if (res.generatedInvoice) {
          toast.success(`🎉 Tagihan Baru (${res.generatedInvoice.milestone_name}) otomatis dibuat!`, { duration: 5000 });
        }
        setIsModalOpen(false);
        fetchAttendances();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan absensi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      const res = await request.put(API_ENDPOINTS.ATTENDANCES.CONFIRM(id));
      if (res.success) {
        toast.success("Kehadiran sesi berhasil dikonfirmasi!");
        fetchAttendances();
      }
    } catch (err) {
      toast.error("Gagal konfirmasi kehadiran");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "hadir":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Hadir</span>;
      case "izin":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">Izin</span>;
      case "sakit":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Sakit</span>;
      case "alfa":
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Alfa</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Absensi Sesi & Kehadiran
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Catat kehadiran sesi siswa, akumulasi pertemuan, dan konfirmasi orang tua.
          </p>
        </div>

        {role !== "parent" && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Absensi Sesi
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <DebouncedSearch
          placeholder="Cari nama siswa, tutor, materi..."
          onSearch={(val) => {
            setSearch(val);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-primary-500/20"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alfa">Alfa</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : attendances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal & Sesi</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Tutor</th>
                  <th className="py-3.5 px-4">Jam Belajar</th>
                  <th className="py-3.5 px-4">Materi Diajarkan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Konfirmasi Ortu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">{formatDate(a.date)}</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        Pertemuan #{a.session_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{a.student_name}</p>
                      <p className="text-[11px] text-slate-400">{a.class_grade}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700">{a.tutor_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}
                    </td>
                    <td className="py-3.5 px-4">
                      {a.topic ? (
                        <div>
                          <p className="font-semibold text-slate-800 line-clamp-1">{a.topic}</p>
                          {a.score && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              Skor: {a.score}/100
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Tidak ada catatan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(a.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {a.parent_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> Terkonfirmasi
                        </span>
                      ) : role === "parent" ? (
                        <button
                          onClick={() => handleConfirm(a.id)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] transition-colors"
                        >
                          Konfirmasi
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" /> Menunggu
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CheckSquare}
            title="Tidak Ada Data Absensi"
            description="Belum ada riwayat kehadiran sesi les."
            actionText={role !== "parent" ? "Catat Absensi Sesi" : undefined}
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

      {/* Attendance & Integrated Journal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Kehadiran & Jurnal Sesi"
        subtitle="Otomatis mengakumulasi milestone pertemuan (4/8/12) dan honor tutor"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-900 text-xs flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>
              Tutor dapat langsung mengisi materi jurnal dan skor latihan sekaligus pada form absensi ini.
            </span>
          </div>

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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jam Mulai *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jam Selesai *
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Status Kehadiran *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["hadir", "izin", "sakit", "alfa"].map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setFormData({ ...formData, status: st })}
                  className={`py-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                    formData.status === st
                      ? "bg-primary-600 text-white border-primary-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Journal Sub-Section */}
          {formData.status === "hadir" && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Jurnal Mengajar Sesi Ini
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Topik / Materi yang Diajarkan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Contoh: Operasi Hitung Campuran Pecahan"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

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
                  placeholder="Siswa mampu menyelesaikan soal cerita pecahan dan desimal..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Catatan Perkembangan Siswa
                  </label>
                  <textarea
                    rows={2}
                    value={formData.progress_notes}
                    onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                    placeholder="Catatan keaktifan dan fokus ananda..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tugas / PR (Pekerjaan Rumah)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    placeholder="Latihan soal no 1-5 di buku modul..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </div>
          )}

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
              {isSaving ? "Menyimpan..." : "Simpan Absensi & Jurnal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
