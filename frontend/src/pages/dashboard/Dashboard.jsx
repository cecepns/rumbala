import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import TutorDashboard from "./TutorDashboard";
import ParentDashboard from "./ParentDashboard";

export default function Dashboard() {
  const { role } = useAuth();

  if (role === "admin") {
    return <AdminDashboard />;
  }

  if (role === "tutor") {
    return <TutorDashboard />;
  }

  return <ParentDashboard />;
}
