import type { Role } from "@shared/types";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Team Leads",
  WORKER: "Team"
};

export function roleLabel(role?: Role | string | null): string {
  if (!role) return "";
  return ROLE_LABEL[role as Role] ?? role;
}
