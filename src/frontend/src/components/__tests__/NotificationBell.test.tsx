import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import NotificationBell from "../NotificationBell";

vi.mock("../../store/notifications", () => ({
  useNotifications: () => ({
    items: [
      { id: "1", message: "You were assigned a task", read: false, type: "TASK_ASSIGNED", userId: "u", createdAt: new Date().toISOString() }
    ],
    unread: 1,
    markRead: vi.fn()
  })
}));

describe("NotificationBell", () => {
  it("shows the unread count badge", () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
