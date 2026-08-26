import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../utils/request";
import { API_ENDPOINTS } from "../../utils/endpoints";
import { formatDate } from "../../utils/helpers";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { TrendingUp, Award, CheckCircle2, BookOpen, User, Calendar } from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

export default function ProgressDashboard() {
  const { user, role } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.STUDENTS.LIST, { limit: 100 });
      if (res.success && res.data?.length > 0) {
        setStudents(res.data);
        const initialId = role === "parent" && user?.student_id ? user.student_id : res.data[0].id;
        setSelectedStudentId(initialId);
        fetchProgress(initialId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgress = async (studentId) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.PROGRESS.DETAIL(studentId));
      if (res.success) {
        setProgressData(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat progress belajar");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (e) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    fetchProgress(sId);
  };

  const pieData = progressData?.attendanceStats
    ? [
        { name: "Hadir", value: progressData.attendanceStats.hadir },
        { name: "Izin", value: progressData.attendanceStats.izin },
        { name: "Sakit", value: progressData.attendanceStats.sakit },
        { name: "Alfa", value: progressData.attendanceStats.alfa }
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Student Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Progress & Capaian Akademik Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Visualisasi grafik nilai, rasio absensi, dan capaian target pembelajaran.
          </p>
        </div>

        {role !== "parent" && students.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pilih Siswa:</span>
            <select
              value={selectedStudentId}
              onChange={handleStudentChange}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500/20"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_grade})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Memuat visualisasi progress...</div>
      ) : progressData ? (
        <div className="space-y-6">
          {/* Top Summary Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Profil Pembelajar</span>
              <h3 className="text-2xl font-extrabold mt-0.5">{progressData.student.name}</h3>
              <p className="text-xs text-sky-100 mt-1">
                {progressData.student.class_grade} • {progressData.student.school} • {progressData.student.subjects}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-sky-200 block">Total Sesi</span>
                <span className="text-xl font-extrabold">{progressData.student.total_sessions_completed || 0}</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-sky-200 block">Kehadiran</span>
                <span className="text-xl font-extrabold">
                  {progressData.attendanceStats.total > 0
                    ? `${Math.round((progressData.attendanceStats.hadir / progressData.attendanceStats.total) * 100)}%`
                    : "100%"}
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Trend Line Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Tren Skor Nilai Latihan Sesi</h3>
                <p className="text-xs text-slate-500">Perkembangan nilai per pertemuan yang dicatat tutor</p>
              </div>

              <div className="h-64 w-full">
                {progressData.scoreTrends?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData.scoreTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="session" stroke="#94a3b8" fontSize={11} />
                      <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderRadius: "12px",
                          border: "none",
                          color: "#fff",
                          fontSize: "12px"
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Skor Nilai"
                        stroke="#0284c7"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#0284c7" }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Belum ada data nilai latihan.
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Distribusi Kehadiran</h3>
                <p className="text-xs text-slate-500">Rasio status kehadiran sesi</p>
              </div>

              <div className="h-52 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada data absensi.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-600 font-semibold">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Milestones (Mastery Targets) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Target Capaian & Penguasaan Materi (Milestones)</h3>
              <p className="text-xs text-slate-500">Tahapan kompetensi belajar yang sedang dikejar</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {progressData.learningMilestones?.map((milestone, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    milestone.completed
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-800">{milestone.name}</span>
                    {milestone.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {Math.round(milestone.progress)}%
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        milestone.completed ? "bg-emerald-500" : "bg-primary-500"
                      }`}
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
