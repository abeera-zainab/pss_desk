import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../lib/api";
import { ErrorText } from "../components/ui";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faLock, 
  faEye, 
  faEyeSlash,
  faRocket,
  faShieldAlt,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import pssLogo from "../assets/pss-logo-removebg-preview.png";

// Keyframes for animations
function LoginKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.15); }
        50% { box-shadow: 0 0 30px 8px rgba(99, 102, 241, 0.08); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
    `}</style>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ 
        background: "#F8FAFC",
      }}
    >
      <LoginKeyframes />

      {/* Decorative background elements - Light */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ 
          background: "conic-gradient(from 0deg, #6366F1, #8B5CF6, #EC4899, #F59E0B, #6366F1)",
          animation: "fadeUp 10s linear infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ 
          background: "conic-gradient(from 180deg, #3B82F6, #06B6D4, #10B981, #8B5CF6, #6366F1)",
          animation: "fadeUp 15s linear infinite reverse",
        }}
      />

      <div className="flex w-full max-w-[440px] flex-col items-center" style={{ animation: "fadeUp 0.6s ease-out both" }}>
        {/* Logo - Pure Image */}
        <img 
          src={pssLogo} 
          alt="PSS Logo" 
          className="h-23 w-23 object-contain mb-4"
          style={{
            filter: "drop-shadow(0 8px 32px rgba(99, 102, 241, 0.15))",
            animation: "float 4s ease-in-out infinite",
          }}
        />

        {/* Title */}
        <h1 
          className="text-[28px] font-bold tracking-tight text-center"
          style={{ 
            color: "#1A1D23",
          }}
        >
          PSS WORKSPACE
        </h1>
        <p className="mt-1.5 text-[13px] text-center flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
          <FontAwesomeIcon icon={faShieldAlt} className="text-[10px] text-indigo-400" />
          Sign in to continue
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full rounded-3xl p-8 bg-white shadow-sm"
          style={{
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}
        >
          {/* Email Field */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#64748B" }}
            >
              <FontAwesomeIcon icon={faEnvelope} className="text-[10px] text-indigo-400" />
              Office Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              autoComplete="username"
              className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                color: "#1A1D23",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#6366F1";
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#64748B" }}
            >
              <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-400" />
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-2xl px-4 py-3 pr-16 text-[15px] outline-none transition-all duration-200"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  color: "#1A1D23",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366F1";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-200"
                style={{ color: "#64748B" }}
              >
                <FontAwesomeIcon 
                  icon={showPassword ? faEyeSlash : faEye} 
                  className="text-[12px]" 
                />
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <ErrorText message={error} />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-2xl py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300 hover:shadow-lg active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faRocket} className="text-sm" />
                Sign in
                <FontAwesomeIcon icon={faArrowRight} className="text-xs opacity-70" />
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 flex items-center gap-4 text-[11px]" style={{ color: "#94A3B8" }}>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faShieldAlt} className="text-[8px] text-indigo-400" />
            Secure
          </span>
          <span className="w-px h-3" style={{ background: "#E2E8F0" }} />
          <span>Internal use only</span>
          <span className="w-px h-3" style={{ background: "#E2E8F0" }} />
          <span>v2.0</span>
        </div>
      </div>
    </div>
  );
}