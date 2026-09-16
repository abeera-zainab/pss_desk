import { useEffect, useState } from "react";
import type { Role, TaskType, UserDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { Badge, Modal, ErrorText, Spinner } from "../components/ui";
import { formatDate } from "../lib/format";
import { ROLE_LABEL } from "../lib/roles";
import { colors, card, label, input, heading, tableHead, rowHover } from "../lib/theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faUsers, 
  faUser, 
  faEnvelope, 
  faLayerGroup, 
  faCalendarAlt,
  faCrown,
  faUserTie,
  faHardHat,
  faRocket,
  faSearch,
  faUserPlus,
  faShieldAlt,
  faCircle,
  faClock,
  faTimes,
  faCheck,
  faUserCog
} from '@fortawesome/free-solid-svg-icons';

// Keyframes for initial page load only
function UsersKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  );
}

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-indigo-100 text-indigo-700",
  MANAGER: "bg-emerald-100 text-emerald-700",
  WORKER: "bg-blue-100 text-blue-700"
};

const ROLE_ICON: Record<Role, any> = {
  ADMIN: faCrown,
  MANAGER: faUserTie,
  WORKER: faHardHat
};

const DOMAIN_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "PSS_DEFENSIVE", label: "PSS Defensive" },
  { value: "PSS_OPS", label: "PSS OPS" },
  { value: "PSS_OFFENSIVE", label: "PSS Offensive" },
  { value: "PSS_PRODUCT", label: "PSS Product" }
];

type UserTab = "ALL" | Role | TaskType;

const USER_TABS: { value: UserTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Team Leads" },
  { value: "WORKER", label: "Team" },
  ...DOMAIN_OPTIONS
];

export default function Users() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<UserTab>("ALL");

  function load() {
    setLoading(true);
    api
      .getUsers({ limit: 100 })
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleActive(u: UserDTO) {
    try {
      if (u.isActive) await api.deleteUser(u.id);
      else await api.updateUser(u.id, { isActive: true });
      // Update local state instantly - no reload
      setUsers(prev => prev.map(user => 
        user.id === u.id ? { ...user, isActive: !user.isActive } : user
      ));
    } catch (e) {
      alert(apiError(e));
      // Revert on error
      load();
    }
  }

  async function changeRole(u: UserDTO, role: Role) {
    try {
      await api.updateUser(u.id, { role, managerId: role === "ADMIN" ? null : u.managerId ?? null });
      setUsers((prev) => prev.map((user) => (user.id === u.id ? { ...user, role } : user)));
    } catch (e) {
      alert(apiError(e));
      // Revert on error
      load();
    }
  }

  async function toggleDomain(u: UserDTO, domain: TaskType) {
    const has = u.domains.includes(domain);
    const nextDomains = has ? u.domains.filter((d) => d !== domain) : [...u.domains, domain];
    try {
      await api.updateUser(u.id, { domains: nextDomains });
      // Update local state instantly - no reload
      setUsers(prev => prev.map(user => 
        user.id === u.id ? { ...user, domains: nextDomains } : user
      ));
    } catch (e) {
      alert(apiError(e));
      // Revert on error
      load();
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const isRoleTab = activeTab === "ALL" || activeTab === "ADMIN" || activeTab === "MANAGER" || activeTab === "WORKER";
    const matchesTab = isRoleTab
      ? activeTab === "ALL" || user.role === activeTab
      : user.domains.includes(activeTab);
    return matchesSearch && matchesTab;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'ADMIN').length;

  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <UsersKeyframes />

      {/* Header */}
      <div className="mb-6" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
                }}
              >
                <FontAwesomeIcon icon={faUsers} className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
                  User Management
                </h1>
                <p className="mt-0.5 text-sm flex items-center gap-3" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faUsers} className="text-indigo-400 text-xs" />
                    {totalUsers} total
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCircle} className="text-emerald-400 text-xs" />
                    {activeUsers} active
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCrown} className="text-amber-400 text-xs" />
                    {adminUsers} admins
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <button
            className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
            }}
            onClick={() => setShowCreate(true)}
          >
            <FontAwesomeIcon icon={faUserPlus} className="text-sm" />
            New User
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "#94A3B8" }}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-2.5 pl-10 text-sm transition-colors duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              style={{ borderColor: "#E2E8F0" }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex max-w-full flex-wrap rounded-2xl border bg-white p-1" style={{ borderColor: "#E2E8F0" }}>
              {USER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors duration-200 ${
                    activeTab === tab.value 
                      ? "text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={{
                    background: activeTab === tab.value ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="h-12 w-12 animate-spin rounded-full border-4"
              style={{ 
                borderColor: '#E2E8F0',
                borderTopColor: '#6366F1',
              }}
            />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading users...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out both" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50" style={{ borderColor: "#E2E8F0" }}>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} className="text-[10px] text-indigo-400" />
                      User
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUserCog} className="text-[10px] text-indigo-400" />
                      Username
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} className="text-[10px] text-indigo-400" />
                      Email
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-[10px] text-indigo-400" />
                      Role
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faLayerGroup} className="text-[10px] text-indigo-400" />
                      Domains
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCircle} className="text-[10px] text-indigo-400" />
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="text-[10px] text-indigo-400" />
                      Joined
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                {filteredUsers.map((u, index) => (
                  <tr 
                    key={u.id} 
                    className="hover:bg-gray-50/60"
                    style={{ animation: `slideIn 0.3s ease-out ${index * 30}ms both` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                          style={{ 
                            background: `linear-gradient(135deg, ${u.role === 'ADMIN' ? '#6366F1' : u.role === 'MANAGER' ? '#10B981' : '#3B82F6'}, ${u.role === 'ADMIN' ? '#8B5CF6' : u.role === 'MANAGER' ? '#059669' : '#2563EB'})`,
                          }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: "#1A1D23" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#64748B" }}>
                      {u.username || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#64748B" }}>
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                          className="rounded-lg border px-2 py-1 text-xs hover:border-indigo-400 transition-colors duration-200"
                          style={{ borderColor: colors.border }}
                        >
                          {(["ADMIN", "MANAGER", "WORKER"] as Role[]).map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "WORKER" || u.role === "MANAGER" ? (
                        <div className="flex flex-wrap gap-1">
                          {DOMAIN_OPTIONS.map((d) => {
                            const active = u.domains.includes(d.value);
                            return (
                              <button
                                key={d.value}
                                onClick={() => toggleDomain(u, d.value)}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors duration-200 ${
                                  active
                                    ? "bg-indigo-500 text-white shadow-sm hover:bg-indigo-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                                title={d.label}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#94A3B8" }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={u.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}>
                        <FontAwesomeIcon 
                          icon={u.isActive ? faCircle : faTimes} 
                          className={`mr-1.5 text-[9px] ${u.isActive ? 'text-emerald-500' : 'text-red-500'}`}
                        />
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                          u.isActive 
                            ? "text-red-500 hover:bg-red-50 hover:text-red-600" 
                            : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                        onClick={() => toggleActive(u)}
                      >
                        <FontAwesomeIcon 
                          icon={u.isActive ? faTimes : faCheck} 
                          className="text-[10px]" 
                        />
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faUsers} className="text-2xl text-indigo-400" />
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: "#1A1D23" }}>No users found</p>
              <p className="text-xs" style={{ color: "#64748B" }}>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("WORKER");
  const [managerId, setManagerId] = useState<string>("");
  const [domains, setDomains] = useState<TaskType[]>([]);
  const [reportsTo, setReportsTo] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setManagerId("");
    if (role === "ADMIN") {
      setReportsTo([]);
      return;
    }
    if (role === "MANAGER") {
      api.getUsers({ role: "ADMIN", limit: 100 }).then((r) => setReportsTo(r.data));
      return;
    }
    api.getManagers().then(setReportsTo);
  }, [role]);

  function toggleDomain(domain: TaskType) {
    setDomains((prev) => (prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createUser({
        name,
        username,
        email,
        password,
        role,
        managerId: role === "ADMIN" ? undefined : managerId || undefined,
        domains: role === "WORKER" || role === "MANAGER" ? domains : undefined
      });
      onCreated();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New User" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faUser} className="text-xs text-indigo-500" />
            </div>
            Full Name
          </span>
          <input 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`} 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            autoFocus 
            placeholder="Enter full name..."
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faUserCog} className="text-xs text-indigo-500" />
            </div>
            Username
          </span>
          <input 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`} 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
            minLength={3}
            maxLength={32}
            autoComplete="off"
            placeholder="login name (letters, numbers, . _ -)"
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faEnvelope} className="text-xs text-indigo-500" />
            </div>
            Email Address
          </span>
          <input 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`} 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="Enter email address..."
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faRocket} className="text-xs text-indigo-500" />
            </div>
            Temporary Password
          </span>
          <input
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Enter temporary password..."
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faShieldAlt} className="text-xs text-indigo-500" />
            </div>
            Role
          </span>
          <select 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`} 
            value={role} 
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {(["ADMIN", "MANAGER", "WORKER"] as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </label>

        {role !== "ADMIN" && (
        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
              <FontAwesomeIcon icon={faUserTie} className="text-xs text-indigo-500" />
            </div>
            Reports to {role === "MANAGER" ? "(Admin)" : "(Team Lead)"}
          </span>
          <select 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors duration-200`} 
            value={managerId} 
            onChange={(e) => setManagerId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {reportsTo.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        )}

        {(role === "WORKER" || role === "MANAGER") && (
          <div className={label}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faLayerGroup} className="text-xs text-indigo-500" />
              </div>
              Domain
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((d) => {
                const active = domains.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDomain(d.value)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-colors duration-200 ${
                      active 
                        ? "bg-indigo-500 text-white shadow-sm hover:bg-indigo-600" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ErrorText message={error} />

        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors duration-200 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={saving}
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)'
            }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faUserPlus} />
                Create User
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}