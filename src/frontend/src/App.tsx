import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Role } from "@shared/types";
import { useAuth } from "./store/auth";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import KanbanBoard from "./pages/KanbanBoard";
import Cases from "./pages/Cases";
import IntelFolderPage from "./pages/IntelFolderPage";
import CaseDetail from "./pages/CaseDetail";
import CaseReportViewer from "./pages/CaseReportViewer";
import TaskDetail from "./pages/TaskDetail";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import ReportsHome from "./pages/ReportsHome";
import ReportsAttendance from "./pages/ReportsAttendance";
import ReportsPerformance from "./pages/ReportsPerformance";

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const ready = useAuth((s) => s.ready);

  useEffect(() => {
    useAuth.getState().init();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="board" element={<KanbanBoard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="intelligence/:slug" element={<IntelFolderPage />} />
        <Route path="cases/:id/files/:fileId" element={<CaseReportViewer />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave" element={<Leave />} />
        <Route path="reports" element={<ReportsHome />} />
        <Route path="reports/attendance" element={<ReportsAttendance />} />
        <Route path="reports/performance" element={<ReportsPerformance />} />
        
        <Route
          path="users"
          element={
            <RequireRole roles={["ADMIN"]}>
              <Users />
            </RequireRole>
          }
        />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}