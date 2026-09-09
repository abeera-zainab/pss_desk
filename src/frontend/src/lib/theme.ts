// Shared visual tokens for the Niftac Workspace light theme.
// Mirrors the palette/shapes established on Login.tsx (mint gradient,
// glass surfaces, ink/mute text) so every page stays visually consistent.
// Import these instead of redefining class strings per-file.

export const colors = {
  ink: "#0D1219",
  mute: "#5B6472",
  mint: "#0E9C86",
  mintLight: "#34E7C6",
  red: "#E24B4A",
  amber: "#BA7517",
  border: "rgba(13,18,25,0.08)"
} as const;

export const mintGradient = "linear-gradient(155deg,#34E7C6,#0E9C86)";

// Glass card surface - used for stat tiles, list containers, kanban columns.
export const card = "rounded-2xl border border-[#0D1219]/10 bg-white/70 backdrop-blur-xl";

// Slightly lighter glass, for nested/inner containers (e.g. kanban columns).
export const cardSubtle = "rounded-2xl border border-[#0D1219]/10 bg-white/60 backdrop-blur-xl";

// Form field label - small caps caption above an input.
export const label = "flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-widest text-[#5B6472]";

// Text input / select / textarea.
export const input =
  "rounded-xl border border-[#0D1219]/10 bg-white/60 px-3 py-2 text-sm normal-case tracking-normal text-[#0D1219] outline-none transition-colors focus:border-[#34E7C6] focus:bg-[#34E7C6]/5";

// Secondary pill button (outline, glass) - e.g. "Upload file".
export const btn =
  "rounded-full border border-[#0D1219]/10 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-[#0D1219] backdrop-blur-xl transition-colors hover:border-[#34E7C6]";

// Primary pill button (mint gradient) - e.g. "Sign in", "Create task".
export const btnDark =
  "rounded-full bg-[linear-gradient(155deg,#34E7C6,#0E9C86)] px-4 py-2.5 text-xs font-bold tracking-tight text-[#05070B] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400";

// Destructive pill button (solid red) - e.g. "Reject", "Check out".
export const btnDanger =
  "rounded-full bg-[#E24B4A] px-4 py-2.5 text-xs font-bold tracking-tight text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400";

// Page heading - used at the top of every screen.
export const heading = "text-[22px] font-bold tracking-tight text-[#0D1219]";

// Section eyebrow - small uppercase label above a group (e.g. "Case files").
export const eyebrow = "text-[11px] font-medium uppercase tracking-widest text-[#5B6472]";

// Accent link text (mint).
export const link = "font-medium text-[#0E9C86] hover:underline";

// Table header row.
export const tableHead =
  "border-b border-[#0D1219]/10 bg-[#0D1219]/[0.02] text-left text-[11px] uppercase tracking-widest text-[#5B6472]";

// Hover row background (mint tint) - for interactive table/list rows.
export const rowHover = "transition-colors hover:bg-[#34E7C6]/5";

// ---- Extended palette - soft, decent accents (not oversaturated) ----
export const accents = {
  mint: { from: "#6EE7C8", to: "#22B79A", glow: "rgba(34,183,154,0.20)" },
  violet: { from: "#C4B5FD", to: "#8B7CF6", glow: "rgba(139,124,246,0.18)" },
  amber: { from: "#FDE39B", to: "#F2B94D", glow: "rgba(242,185,77,0.18)" },
  rose: { from: "#FDA9B4", to: "#F0697D", glow: "rgba(240,105,125,0.16)" },
  sky: { from: "#93D5F6", to: "#4FA8DE", glow: "rgba(79,168,222,0.18)" }
} as const;

export function accentGradient(key: keyof typeof accents) {
  return `linear-gradient(155deg, ${accents[key].from} 0%, ${accents[key].to} 100%)`;
}

// Soft, light page background - subtle, not heavy.
export const pageBackground =
  "radial-gradient(circle at 15% 0%, rgba(110,231,200,0.06) 0%, transparent 45%), " +
  "radial-gradient(circle at 100% 20%, rgba(196,181,253,0.05) 0%, transparent 40%), " +
  "radial-gradient(circle at 50% 100%, rgba(147,213,246,0.05) 0%, transparent 50%), " +
  "#FAFBFB";