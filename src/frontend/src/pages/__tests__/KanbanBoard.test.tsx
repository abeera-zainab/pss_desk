import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import KanbanBoard from "../KanbanBoard";

vi.mock("../../lib/api", () => ({
  api: {
    getTasks: vi.fn().mockResolvedValue({
      data: [
        { id: "1", title: "Collect docs", status: "PENDING", priority: "HIGH", caseId: "c1", assignedUserId: "u1" }
      ]
    })
  },
  apiError: (e: unknown) => String(e)
}));
vi.mock("../../lib/socket", () => ({ getSocket: () => null }));
vi.mock("../../store/auth", () => ({
  // Supports both useAuth() and useAuth(selector) call styles.
  useAuth: (sel?: any) => {
    const state = { user: { id: "u1", role: "ADMIN", name: "A", email: "a@b.c" } };
    return typeof sel === "function" ? sel(state) : state;
  }
}));

describe("KanbanBoard", () => {
  it("renders all seven status columns and loaded tasks", async () => {
    render(
      <MemoryRouter>
        <KanbanBoard />
      </MemoryRouter>
    );
    // Task loaded from the mocked API
    expect(await screen.findByText("Collect docs")).toBeInTheDocument();
    // All seven columns, matching the TaskStatus enum
    for (const label of ["Locked", "Pending", "In Progress", "Submitted", "Under Review", "Completed", "Rejected"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
