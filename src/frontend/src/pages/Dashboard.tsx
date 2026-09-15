import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { Spinner, ErrorText, EmptyState } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { roleLabel } from "../lib/roles";

// Font Awesome imports - FIXED
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faFolderOpen,
  faTasks,
  faCheckCircle,
  faClock,
  faArrowRight,
  faUser,
  faChartLine,
  faHistory,
  faBriefcase,
  faCalendarCheck,
  faRocket,
  faStar,
  faChartBar,        // Replaced faTrendingUp
  faMedal,           // Replaced faAward
  faBullseye,        // Replaced faTarget
  faThumbsUp,
  faBell,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
  createdAt: string;
}
interface Stats {
  totalUsers: number;
  totalCases: number;
  activeTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  activity: Activity[];
}

// Animation keyframes
function DashboardKeyframes() {
  return (
    <style>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      @keyframes floatSlow {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-15px) rotate(5deg); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes borderGlow {
        0%, 100% { border-color: rgba(99, 102, 241, 0.1); }
        50% { border-color: rgba(99, 102, 241, 0.3); }
      }
      @keyframes iconFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(3deg); }
      }
    `}</style>
  );
}

// Count up animation
function useCountUp(target: number, durationMs = 1000) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    let raf: number;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

// Color palette - Light & Fresh
const colors = {
  primary: '#6366F1',      // Indigo
  secondary: '#8B5CF6',    // Purple
  success: '#10B981',      // Emerald
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  info: '#3B82F6',         // Blue
  pink: '#EC4899',         // Pink
  cyan: '#06B6D4',         // Cyan
  orange: '#F97316',       // Orange
  teal: '#14B8A6',         // Teal
  
  // Light backgrounds
  bgPrimary: '#EEF2FF',    // Very light indigo
  bgSecondary: '#F5F3FF',  // Very light purple
  bgSuccess: '#ECFDF5',    // Very light emerald
  bgWarning: '#FFFBEB',    // Very light amber
  bgDanger: '#FEF2F2',     // Very light red
  bgInfo: '#EFF6FF',       // Very light blue
  bgPink: '#FDF2F8',       // Very light pink
  bgCyan: '#ECFEFF',       // Very light cyan
  
  // Text colors
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  
  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

// Enhanced Tile Component - Light theme
function Tile({
  label,
  value,
  to,
  icon,
  index,
  color,
  bgColor,
  iconBg
}: {
  label: string;
  value: number;
  to?: string;
  icon: any;
  index: number;
  color: string;
  bgColor: string;
  iconBg: string;
}) {
  const animatedValue = useCountUp(value);
  const [isHovered, setIsHovered] = useState(false);

  const body = (
    <div
      className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
      style={{
        background: bgColor,
        border: `1px solid ${isHovered ? color : colors.border}`,
        animation: `fadeInUp 0.6s ease-out ${index * 80}ms both`,
        boxShadow: isHovered 
          ? `0 12px 30px -8px ${color}40` 
          : "0 2px 8px rgba(0,0,0,0.04)",
        cursor: to ? "pointer" : "default",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle shimmer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(100deg, transparent 30%, ${color}08 50%, transparent 70%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s linear infinite",
        }}
      />

      {/* Icon container */}
      <div className="relative mb-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{
            background: iconBg,
            color: color,
            boxShadow: isHovered ? `0 8px 16px -6px ${color}40` : "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <FontAwesomeIcon icon={icon} className="text-2xl" />
        </div>
      </div>

      {/* Value */}
      <div className="relative">
        <div 
          className="text-3xl font-bold tracking-tight transition-all duration-300"
          style={{ color: colors.textPrimary }}
        >
          {animatedValue}
        </div>
        <div className="mt-1 text-sm font-medium" style={{ color: colors.textSecondary }}>
          {label}
        </div>
      </div>

      {/* Arrow indicator */}
      {to && (
        <div
          className="absolute bottom-6 right-6 transform transition-all duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateX(0)" : "translateX(-8px)",
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: `${color}15` }}
          >
            <FontAwesomeIcon 
              icon={faArrowRight} 
              className="text-sm"
              style={{ color: color }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

// Activity List - Light theme
function ActivityList({ items }: { items: Activity[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300"
        style={{ 
          borderColor: colors.border,
          background: 'white',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div 
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: colors.bgPrimary }}
          >
            <FontAwesomeIcon 
              icon={faCalendarCheck} 
              className="text-3xl" 
              style={{ color: colors.primary }} 
            />
          </div>
          <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            No recent activity
          </p>
          <p className="text-xs" style={{ color: colors.textLight }}>
            Activities will appear here as you work
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border transition-all duration-300"
      style={{ 
        borderColor: colors.border,
        background: 'white',
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {items.map((a, i) => (
        <div
          key={a.id}
          className="group flex items-center gap-4 px-6 py-4 transition-all duration-200"
          style={{
            borderTop: i === 0 ? "none" : `1px solid ${colors.borderLight}`,
            animation: `slideInRight 0.4s ease-out ${i * 50}ms both`,
            background: hoveredId === a.id ? colors.bgPrimary : "transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={() => setHoveredId(a.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Activity indicator */}
          <div className="relative flex-shrink-0">
            <div
              className="h-3 w-3 rounded-full transition-all duration-300 group-hover:scale-110"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="text-sm font-semibold transition-colors duration-200"
                style={{ 
                  color: hoveredId === a.id ? colors.primary : colors.textPrimary,
                }}
              >
                {a.action.replaceAll("_", " ")}
              </span>
              <span 
                className="text-xs px-2.5 py-1 rounded-full transition-all duration-200"
                style={{ 
                  background: hoveredId === a.id ? `${colors.primary}15` : colors.borderLight,
                  color: colors.textSecondary,
                }}
              >
                {a.entityType.toLowerCase()}
              </span>
              {a.details && (
                <span className="text-sm" style={{ color: colors.textLight }}>
                  - {a.details}
                </span>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FontAwesomeIcon 
              icon={faClock} 
              className="text-xs"
              style={{ 
                color: colors.textLight,
                opacity: hoveredId === a.id ? 1 : 0.4,
              }}
            />
            <span className="text-xs whitespace-nowrap" style={{ color: colors.textLight }}>
              {formatDateTime(a.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Welcome Header - Light theme
function WelcomeHeader({ user, stats }: { user: any; stats: Stats }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div 
      className="relative mb-8 overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:shadow-xl"
      style={{
        background: `linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)`,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 4px 16px rgba(99, 102, 241, 0.08)",
        animation: "fadeInUp 0.6s ease-out both",
      }}
    >
      {/* Decorative elements */}
      <div
        className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-10"
        style={{ 
          background: `radial-gradient(circle, ${colors.primary}, transparent)`,
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full opacity-10"
        style={{ 
          background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
          animation: "floatSlow 10s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                boxShadow: "0 8px 20px -6px rgba(99, 102, 241, 0.4)",
              }}
            >
              <FontAwesomeIcon icon={faUser} className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {roleLabel(user?.role)} · {stats.totalCases} total cases
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3">
          <div
            className="rounded-2xl px-5 py-3 transition-all duration-300 hover:scale-105 hover:shadow-md"
            style={{ 
              background: 'white',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="text-xs font-medium" style={{ color: colors.textLight }}>Active Tasks</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>{stats.activeTasks}</div>
          </div>
          <div
            className="rounded-2xl px-5 py-3 transition-all duration-300 hover:scale-105 hover:shadow-md"
            style={{ 
              background: 'white',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="text-xs font-medium" style={{ color: colors.textLight }}>Pending Approvals</div>
            <div className="text-xl font-bold" style={{ color: colors.danger }}>{stats.pendingApprovals}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const HR_ENTITY_TYPES = ["ATTENDANCE", "LEAVE"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.dashboard()
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((e) => {
        setError(apiError(e));
        setIsLoading(false);
      });
  }, []);

  if (error) return <ErrorText message={error} />;
  if (isLoading || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="h-12 w-12 animate-spin rounded-full border-4"
            style={{ 
              borderColor: colors.border,
              borderTopColor: colors.primary,
            }} 
          />
          <p className="text-sm" style={{ color: colors.textSecondary }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const caseActivity = stats.activity.filter((a) => !HR_ENTITY_TYPES.includes(a.entityType));

  // Tile configurations with fresh colors
  const tiles = [
    ...(user?.role === "ADMIN" ? [{
      label: "Total Users",
      value: stats.totalUsers,
      to: "/users",
      icon: faUsers,
      color: colors.primary,
      bgColor: 'white',
      iconBg: colors.bgPrimary,
    }] : []),
    {
      label: "Total Cases",
      value: stats.totalCases,
      to: "/cases",
      icon: faFolderOpen,
      color: colors.warning,
      bgColor: 'white',
      iconBg: colors.bgWarning,
    },
    {
      label: "Active Tasks",
      value: stats.activeTasks,
      to: "/board",
      icon: faTasks,
      color: colors.info,
      bgColor: 'white',
      iconBg: colors.bgInfo,
    },
    {
      label: "Completed",
      value: stats.completedTasks,
      to: "/board",
      icon: faCheckCircle,
      color: colors.success,
      bgColor: 'white',
      iconBg: colors.bgSuccess,
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      to: "/board",
      icon: faClock,
      color: colors.danger,
      bgColor: 'white',
      iconBg: colors.bgDanger,
    }
  ];

  return (
    <div
      className="relative min-h-full overflow-hidden p-6"
      style={{ 
        background: "#F8FAFC",
      }}
    >
      <DashboardKeyframes />

      {/* Decorative background elements */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${colors.primary}, transparent)`,
          animation: "float 12s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full opacity-10 blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
          animation: "floatSlow 14s ease-in-out infinite",
        }}
      />

      <div className="relative">
        {/* Welcome Header */}
        <WelcomeHeader user={user} stats={stats} />

        {/* Metrics Grid */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.textLight }}>
              <FontAwesomeIcon icon={faChartLine} className="mr-2" />
              Key Metrics
            </h2>
            <div 
              className="h-px flex-1 ml-4"
              style={{ 
                background: `linear-gradient(to right, ${colors.border}, transparent)`,
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {tiles.map((t, i) => (
              <Tile key={t.label} {...t} index={i} />
            ))}
          </div>
        </div>

        {/* Activity Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.textLight }}>
              <FontAwesomeIcon icon={faHistory} className="mr-2" />
              Recent Activity
            </h3>
            <span 
              className="text-xs px-3 py-1 rounded-full"
              style={{ 
                background: colors.bgPrimary,
                color: colors.primary,
              }}
            >
              {caseActivity.length} events
            </span>
          </div>
          <ActivityList items={caseActivity} />
        </div>
      </div>
    </div>
  );
}