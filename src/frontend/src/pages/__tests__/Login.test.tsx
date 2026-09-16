import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "../Login";

const loginMock = vi.fn();
vi.mock("../../store/auth", () => ({
  useAuth: () => ({ login: loginMock, user: null })
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login", () => {
  beforeEach(() => loginMock.mockReset());

  it("submits the entered credentials", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    renderLogin();
    expect(screen.getByText("PSS WORKSPACE")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("you@company.com or username"), "admin@office.local");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(loginMock).toHaveBeenCalledWith("admin@office.local", "Password123!");
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("you@company.com or username"), "admin");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "bad");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
