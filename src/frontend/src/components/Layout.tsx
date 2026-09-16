import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";
import NotificationBell from "./NotificationBell";
import AttendanceWidget from "../pages/AttendanceWidget";
import { roleLabel } from "../lib/roles";
// Import your logo
import pssLogo from "../assets/pss-logo-removebg-preview.png";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartBar, 
  faColumns, 
  faFolderOpen, 
  faUsers, 
  faCalendarAlt, 
  faBell, 
  faUser, 
  faClock, 
  faUmbrellaBeach, 
  faFileAlt, 
  faSignOutAlt,
  faThumbsUp
} from '@fortawesome/free-solid-svg-icons';

type NavItem = { to: string; label: string; icon?: any };
type NavGroup = { label: string; icon?: any; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

const navByRole: Record<string, NavEntry[]> = {
  ADMIN: [
    { to: "/", label: "Dashboard", icon: faChartBar },
    { to: "/board", label: "Kanban Board", icon: faColumns },
    { label: "Cases", icon: faFolderOpen, items: [
      { to: "/cases", label: "All cases" },
      { to: "/intelligence/osint", label: "Initial OSINT" },
      { to: "/intelligence/geoint", label: "GEOINT" },
      { to: "/intelligence/threat-alert", label: "Threat Alert" }
    ] },
    { to: "/users", label: "User Management", icon: faUsers },
    { label: "HR", icon: faCalendarAlt, items: [
      { to: "/attendance", label: "Time tracking" },
      { to: "/leave", label: "Leave" },
      { to: "/reports", label: "Reports" }
    ] },
    { to: "/notifications", label: "Notifications", icon: faBell },
    { to: "/profile", label: "Profile", icon: faUser }
  ],
  MANAGER: [
    { to: "/", label: "Dashboard", icon: faChartBar },
    { to: "/board", label: "Kanban Board", icon: faColumns },
    { label: "Cases", icon: faFolderOpen, items: [
      { to: "/cases", label: "All cases" },
      { to: "/intelligence/osint", label: "Initial OSINT" },
      { to: "/intelligence/geoint", label: "GEOINT" },
      { to: "/intelligence/threat-alert", label: "Threat Alert" }
    ] },
    { label: "HR", icon: faCalendarAlt, items: [
      { to: "/attendance", label: "Time tracking" },
      { to: "/leave", label: "Leave" },
      { to: "/reports", label: "Reports" }
    ] },
    { to: "/notifications", label: "Notifications", icon: faBell },
    { to: "/profile", label: "Profile", icon: faUser }
  ],
  WORKER: [
    { to: "/", label: "Dashboard", icon: faChartBar },
    { to: "/board", label: "Kanban Board", icon: faColumns },
    { label: "Cases", icon: faFolderOpen, items: [
      { to: "/cases", label: "All cases" },
      { to: "/intelligence/osint", label: "Initial OSINT" },
      { to: "/intelligence/geoint", label: "GEOINT" },
      { to: "/intelligence/threat-alert", label: "Threat Alert" }
    ] },
    { label: "HR", icon: faCalendarAlt, items: [
      { to: "/attendance", label: "Time tracking" },
      { to: "/leave", label: "Leave" },
      { to: "/reports", label: "Reports" }
    ] },
    { to: "/notifications", label: "Notifications", icon: faBell },
    { to: "/profile", label: "Profile", icon: faUser }
  ]
};

// Professional color palette
const colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  sidebarBg: '#FFFFFF',
  sidebarHover: '#F1F5F9',
  sidebarActive: '#EEF2FF',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
};

function SidebarKeyframes() {
  return (
    <style>{`
      @keyframes navSlideIn { 
        from { opacity: 0; transform: translateX(-20px); } 
        to { opacity: 1; transform: translateX(0); } 
      }
      @keyframes chevronDrop { 
        from { opacity: 0; transform: translateY(-8px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
      @keyframes iconPop { 
        0% { transform: scale(0) rotate(-20deg); opacity: 0; } 
        60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; } 
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes rotateGradient {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  );
}

function IconBadge({ icon, active }: { icon: any; active: boolean }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3"
      style={{
        background: active ? `${colors.primary}20` : `${colors.primary}08`,
        color: active ? colors.primary : colors.textSecondary,
        boxShadow: active ? `0 4px 16px -4px ${colors.primary}40` : "none",
        border: active ? `2px solid ${colors.primary}30` : `1px solid ${colors.border}`,
        animation: "iconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <FontAwesomeIcon icon={icon} className="text-lg" />
    </span>
  );
}

function NavGroupItem({ group, index }: { group: NavGroup; index: number }) {
  const location = useLocation();
  const containsActive = group.items.some((it) =>
    it.to === "/"
      ? location.pathname === "/"
      : location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)
  );
  const [open, setOpen] = useState(containsActive);

  return (
    <div 
      className="mb-1.5" 
      style={{ animation: `navSlideIn 0.4s ease-out ${index * 50}ms both` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
          containsActive ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"
        }`}
        style={{
          background: containsActive ? colors.sidebarActive : "transparent",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: containsActive ? "0 4px 20px rgba(99, 102, 241, 0.08)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!containsActive) {
            e.currentTarget.style.background = colors.sidebarHover;
            e.currentTarget.style.transform = "translateX(4px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!containsActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "translateX(0)";
          }
        }}
      >
        <span className="flex items-center gap-3.5">
          <IconBadge icon={group.icon || faCalendarAlt} active={containsActive} />
          <span className="text-sm font-medium">{group.label}</span>
        </span>
        <span 
          className={`text-xs transition-all duration-500 ${open ? "rotate-180" : ""}`}
          style={{ color: colors.textLight }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div 
          className="ml-5 mt-1.5 space-y-1 border-l-2 pl-4" 
          style={{ borderColor: `${colors.primary}20` }}
        >
          {group.items.map((it, i) => (
            <NavLink
              key={it.to}
              to={it.to}
              style={{ animation: `chevronDrop 0.25s ease-out ${i * 40}ms both` }}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? "text-indigo-600 bg-indigo-50/80 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/80 hover:translate-x-1"
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function TopNavLink({ item, index }: { item: NavItem; index: number }) {
  const location = useLocation();
  const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={`group flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
        isActive 
          ? "text-indigo-600" 
          : "text-slate-600 hover:text-slate-900"
      }`}
      style={{
        background: isActive ? colors.sidebarActive : "transparent",
        animation: `navSlideIn 0.4s ease-out ${index * 50}ms both`,
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: isActive ? "0 4px 20px rgba(99, 102, 241, 0.08)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = colors.sidebarHover;
          e.currentTarget.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <IconBadge icon={item.icon} active={isActive} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useRealtimeNotifications();

  const items = navByRole[user?.role || "WORKER"];
  const isReportViewer = /\/cases\/[^/]+\/files\//.test(location.pathname);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (isReportViewer) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC" }}>
      <SidebarKeyframes />

      {/* Sidebar */}
      <aside
        className="relative flex w-72 flex-shrink-0 flex-col overflow-hidden border-r px-5 py-6"
        style={{ 
          background: "#FFFFFF",
          borderColor: colors.border,
          boxShadow: "0 0 60px rgba(0,0,0,0.04)",
        }}
      >
        {/* Decorative gradient */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-5 blur-3xl"
          style={{ 
            background: "conic-gradient(from 0deg, #6366F1, #8B5CF6, #EC4899, #F59E0B, #10B981, #6366F1)",
            animation: "rotateGradient 20s linear infinite",
          }}
        />

        {/* Logo - Professional with your image */}
   <div className="relative z-10 flex flex-col items-center justify-center mb-4">
  <img 
    src={pssLogo} 
    alt="Logo" 
    className="h-20 w-20 object-contain"
  />
  <div className="text-center mt-2">
  <div 
    className="font-bold tracking-tight" 
    style={{ 
      color: '#000000',
      fontSize: '30px',
      letterSpacing: '-0.02em',
    }}
  >
    PSS
  </div>
  <div 
    className="font-medium uppercase tracking-wider" 
    style={{ 
      color: '#000000',
      fontSize: '11px',
      opacity: 0.6,
      letterSpacing: '0.1em',
    }}
  >
    Workspace
  </div>
</div>
</div>
        {/* Navigation */}
        <nav className="relative z-10 mt-2 flex-1 space-y-1 overflow-y-auto">
          {items.map((it, i) =>
            isGroup(it) ? (
              <NavGroupItem key={it.label} group={it} index={i} />
            ) : (
              <TopNavLink key={it.to} item={it} index={i} />
            )
          )}
        </nav>

        {/* User Card */}
        <div
          className="relative z-10 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg"
          style={{ 
            background: "#F8FAFC",
            border: `1px solid ${colors.border}`,
          }}
        >
          {/* Gradient accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ 
              background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
            }}
          />
          
          <div className="flex items-center gap-3 pt-1">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md transition-all duration-300 hover:scale-110"
              style={{ 
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
              }}
            >
              {(user?.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {user?.name}
                <span className="ml-1.5 text-[9px] text-green-500">
                  <FontAwesomeIcon icon={faThumbsUp} className="mr-0.5" />
                  Active
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: colors.textLight }}>
                {roleLabel(user?.role)}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] group"
            style={{ 
              borderColor: colors.border,
              color: colors.textSecondary,
              background: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FEF2F2";
              e.currentTarget.style.color = "#EF4444";
              e.currentTarget.style.borderColor = "#FCA5A5";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(239, 68, 68, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.6)";
              e.currentTarget.style.color = colors.textSecondary;
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <FontAwesomeIcon 
              icon={faSignOutAlt} 
              className="text-sm transition-transform duration-300 group-hover:translate-x-1" 
            />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
   <main className="flex-1 overflow-x-auto">
  <header className="sticky top-0 z-20 flex items-center justify-end border-b border-black/[0.06] bg-white/75 px-8 py-3 backdrop-blur-xl">
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-200 active:scale-95 bg-indigo-500 hover:bg-indigo-600">
        <AttendanceWidget />
      </div>
      <div className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-200 active:scale-95 bg-indigo-500 hover:bg-indigo-600">
        <NotificationBell />
      </div>
    </div>
  </header>
  <div className="p-8">
    <Outlet />
  </div>
</main>
    </div>
  );
}