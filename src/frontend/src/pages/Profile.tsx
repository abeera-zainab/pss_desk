import { useState } from "react";
import { useAuth } from "../store/auth";
import { Badge, ErrorText } from "../components/ui";
import { roleLabel } from "../lib/roles";
import { api, apiError } from "../lib/api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faUserTag, 
  faClock, 
  faCheckCircle,
  faCrown,
  faUserTie,
  faHardHat,
  faRocket,
  faStar,
  faGem,
  faBolt,
  faCalendarAlt,
  faShieldAlt,
  faCircle,
  faThumbsUp,
  faUserCog,
  faBriefcase,
  faIdCard,
  faCalendarCheck,
  faAward,
  faLock,
  faAt
} from '@fortawesome/free-solid-svg-icons';

function ProfileKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 30px 8px rgba(99, 102, 241, 0.12); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes borderGlow {
        0%, 100% { border-color: rgba(99, 102, 241, 0.1); }
        50% { border-color: rgba(99, 102, 241, 0.3); }
      }
    `}</style>
  );
}

const ROLE_ICON: Record<string, any> = {
  ADMIN: faCrown,
  MANAGER: faUserTie,
  WORKER: faHardHat
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#6366F1',
  MANAGER: '#10B981',
  WORKER: '#3B82F6'
};

const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  MANAGER: 'linear-gradient(135deg, #10B981, #34D399)',
  WORKER: 'linear-gradient(135deg, #3B82F6, #60A5FA)'
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  MANAGER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  WORKER: 'bg-blue-100 text-blue-700 border-blue-200'
};

const ROLE_STATS_COLOR: Record<string, string> = {
  ADMIN: '#EEF2FF',
  MANAGER: '#ECFDF5',
  WORKER: '#EFF6FF'
};

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleIcon = ROLE_ICON[user.role] || faUser;
  const roleColor = ROLE_COLOR[user.role] || '#6366F1';
  const roleGradient = ROLE_GRADIENT[user.role] || 'linear-gradient(135deg, #6366F1, #8B5CF6)';
  const roleBadge = ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-700 border-gray-200';
  const statsBg = ROLE_STATS_COLOR[user.role] || '#F8FAFC';

  const hasManager = (user as any).managerId || (user as any).manager;

  return (
    <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center" style={{ background: "#F8FAFC" }}>
      <ProfileKeyframes />

      <div className="w-full max-w-3xl space-y-6" style={{ animation: "fadeUp 0.6s ease-out both" }}>
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white border shadow-lg hover:shadow-xl transition-shadow duration-300" style={{ borderColor: "#E2E8F0" }}>
          {/* Animated gradient background */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `conic-gradient(from 0deg, ${roleColor}, #8B5CF6, #EC4899, #F59E0B, ${roleColor})`,
              animation: 'shimmer 8s linear infinite',
            }}
          />
          
          {/* Decorative floating circles */}
          <div
            className="absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-10 blur-3xl"
            style={{ 
              background: `radial-gradient(circle, ${roleColor}, transparent)`,
              animation: 'float 6s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full opacity-10 blur-3xl"
            style={{ 
              background: `radial-gradient(circle, #8B5CF6, transparent)`,
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />

          {/* Profile Header - Increased Size */}
          <div className="relative p-8 lg:p-10">
            <div className="flex flex-col items-center text-center">
              {/* Avatar - Larger */}
              <div
                className="relative flex h-32 w-32 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: roleGradient,
                  boxShadow: `0 8px 40px ${roleColor}50`,
                  animation: 'pulseGlow 3s ease-in-out infinite',
                }}
              >
                <span className="text-4xl font-bold text-white">{initials}</span>
                {/* Status indicator */}
                <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 border-2 border-white shadow-md">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-[12px] text-white" />
                </div>
              </div>

              {/* Name and Role - Larger Text */}
              <div className="mt-5">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
                  {user.name}
                </h1>
                <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
                  <Badge className={`${roleBadge} px-4 py-1.5 text-sm font-semibold border`}>
                    <FontAwesomeIcon icon={roleIcon} className="mr-2 text-[12px]" />
                    {roleLabel(user.role)}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faCircle} className="text-[8px] text-emerald-400 animate-pulse" />
                    Active
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faIdCard} className="text-[12px] text-indigo-400" />
                    ID: {user.id?.slice(0, 8) || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Quick Stats - Larger Cards */}
              <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-2xl sm:grid-cols-4">
                <div className="rounded-2xl border px-5 py-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: "#E2E8F0", background: statsBg }}>
                  <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faBriefcase} className="text-indigo-400 text-[12px]" />
                    Role
                  </div>
                  <div className="mt-1.5 text-base font-bold" style={{ color: "#1A1D23" }}>
                    {roleLabel(user.role)}
                  </div>
                </div>
                <div className="rounded-2xl border px-5 py-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: "#E2E8F0", background: statsBg }}>
                  <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faAt} className="text-indigo-400 text-[12px]" />
                    Username
                  </div>
                  <div className="mt-1.5 text-sm font-mono font-bold truncate" style={{ color: "#1A1D23" }}>
                    {user.username || "—"}
                  </div>
                </div>
                <div className="rounded-2xl border px-5 py-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: "#E2E8F0", background: statsBg }}>
                  <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faEnvelope} className="text-indigo-400 text-[12px]" />
                    Email
                  </div>
                  <div className="mt-1.5 text-sm font-mono font-bold truncate" style={{ color: "#1A1D23" }}>
                    {user.email}
                  </div>
                </div>
                <div className="rounded-2xl border px-5 py-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: "#E2E8F0", background: statsBg }}>
                  <div className="text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
                    <FontAwesomeIcon icon={faAward} className="text-indigo-400 text-[12px]" />
                    Status
                  </div>
                  <div className="mt-1.5 text-base font-bold text-emerald-500">
                    <FontAwesomeIcon icon={faThumbsUp} className="mr-1.5 text-[12px]" />
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section - Larger */}
          <div className="relative border-t px-6 lg:px-8 py-5" style={{ borderColor: "#E2E8F0" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#64748B" }}>
              <FontAwesomeIcon icon={faRocket} className="mr-2 text-indigo-400" />
              Account Details
            </h3>
            
            <dl className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                    <FontAwesomeIcon icon={faUser} className="text-sm text-indigo-500" />
                  </div>
                  Full Name
                </dt>
                <dd className="font-semibold text-base" style={{ color: "#1A1D23" }}>{user.name}</dd>
              </div>

              <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                    <FontAwesomeIcon icon={faAt} className="text-sm text-indigo-500" />
                  </div>
                  Username
                </dt>
                <dd className="font-mono text-sm lg:text-base font-semibold" style={{ color: "#1A1D23" }}>{user.username || "—"}</dd>
              </div>
              
              <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                    <FontAwesomeIcon icon={faEnvelope} className="text-sm text-indigo-500" />
                  </div>
                  Email Address
                </dt>
                <dd className="font-mono text-sm lg:text-base font-semibold" style={{ color: "#1A1D23" }}>{user.email}</dd>
              </div>
              
              <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                    <FontAwesomeIcon icon={faShieldAlt} className="text-sm text-indigo-500" />
                  </div>
                  Role
                </dt>
                <dd className="font-semibold text-base">
                  <Badge className={`${roleBadge} px-4 py-1.5 text-sm font-semibold border`}>
                    <FontAwesomeIcon icon={roleIcon} className="mr-2 text-[11px]" />
                    {roleLabel(user.role)}
                  </Badge>
                </dd>
              </div>

              {/* User ID */}
              <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                    <FontAwesomeIcon icon={faIdCard} className="text-sm text-indigo-500" />
                  </div>
                  User ID
                </dt>
                <dd className="font-mono text-sm font-semibold" style={{ color: "#1A1D23" }}>
                  {user.id || 'N/A'}
                </dd>
              </div>

              {/* Safe Manager Section - Only show if manager exists */}
              {hasManager && (
                <div className="flex items-center justify-between py-4 text-sm lg:text-base">
                  <dt className="flex items-center gap-3" style={{ color: "#64748B" }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EEF2FF" }}>
                      <FontAwesomeIcon icon={faUserTie} className="text-sm text-indigo-500" />
                    </div>
                    Reports To
                  </dt>
                  <dd className="font-semibold text-base" style={{ color: "#1A1D23" }}>
                    {(user as any).manager?.name || (user as any).managerId || "Manager"}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Footer - Larger */}
          <div className="relative border-t px-6 lg:px-8 py-4" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faGem} className="text-sm text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#64748B" }}>
                    <span className="font-semibold" style={{ color: "#1A1D23" }}>Account</span>
                  </p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>Provisioned by administrator</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "#EEF2FF" }}>
                  <FontAwesomeIcon icon={faShieldAlt} className="text-[10px] text-indigo-400" />
                  <span className="text-[10px] font-medium" style={{ color: "#6366F1" }}>Secure</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "#D1FAE5" }}>
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-[10px] text-emerald-500" />
                  <span className="text-[10px] font-medium" style={{ color: "#059669" }}>Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm lg:p-8" style={{ borderColor: "#E2E8F0" }}>
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
        <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-400" />
        Change password
      </h3>
      <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
        Any signed-in user can update their own password.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
        {error && <ErrorText message={error} />}
        {success && <p className="text-sm font-medium text-emerald-600">{success}</p>}
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
          Current password
          <input
            className={`${field} mt-1.5`}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
          New password
          <input
            className={`${field} mt-1.5`}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
          Confirm new password
          <input
            className={`${field} mt-1.5`}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}