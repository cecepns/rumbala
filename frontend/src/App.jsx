import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ParentPortalProvider } from "./context/ParentPortalContext";
import { Toaster } from "react-hot-toast";

// Common Layout
import Navbar from "./components/common/Navbar";
import Sidebar from "./components/common/Sidebar";

// Pages
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import StudentList from "./pages/students/StudentList";
import StudentDetail from "./pages/students/StudentDetail";
import ChildProfile from "./pages/students/ChildProfile";
import TutorList from "./pages/tutors/TutorList";
import TutorProfile from "./pages/tutors/TutorProfile";
import ScheduleList from "./pages/schedules/ScheduleList";
import AttendanceList from "./pages/attendance/AttendanceList";
import RescheduleList from "./pages/reschedule/RescheduleList";
import JournalList from "./pages/journals/JournalList";
import AIReportGenerator from "./pages/ai-report/AIReportGenerator";
import ProgressDashboard from "./pages/progress/ProgressDashboard";
import InvoiceList from "./pages/invoices/InvoiceList";
import FinanceReport from "./pages/finances/FinanceReport";
import TutorRecapList from "./pages/tutor-recap/TutorRecapList";

// Protected Layout
function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Memuat data Rumbala...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ParentPortalProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 max-w-7xl w-full mx-auto transition-all">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<StudentList />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/child-profile" element={<ChildProfile />} />
              <Route path="/tutors" element={<TutorList />} />
              <Route path="/tutor-profile" element={<TutorProfile />} />
              <Route path="/schedules" element={<ScheduleList />} />
              <Route path="/attendance" element={<AttendanceList />} />
              <Route path="/reschedule" element={<RescheduleList />} />
              <Route path="/journals" element={<JournalList />} />
              <Route path="/ai-reports" element={<AIReportGenerator />} />
              <Route path="/progress" element={<ProgressDashboard />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/finances" element={<FinanceReport />} />
              <Route path="/tutor-recaps" element={<TutorRecapList />} />
              <Route path="/tutor-recap" element={<Navigate to="/tutor-recaps" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ParentPortalProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#1e293b",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "10px 16px",
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
