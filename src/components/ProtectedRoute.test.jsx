/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { USER_ROLES } from "../utils/formatters";

let authState;
vi.mock("../context/AuthContext", () => ({ useAuth: () => authState }));

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/" element={<div>Trang chủ</div>} />
        <Route path="/admin" element={(
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF]}>
            <div>Admin hợp lệ</div>
          </ProtectedRoute>
        )} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("admin authorization guard", () => {
  beforeEach(() => {
    authState = { initialized: true, isAuthenticated: true, user: null };
  });

  it("returns an unauthorized signed-in user to Home", async () => {
    authState.user = { role: USER_ROLES.CUSTOMER };
    renderAdminRoute();
    await waitFor(() => expect(screen.getByText("Trang chủ")).toBeInTheDocument());
  });

  it("allows a valid admin into Admin", () => {
    authState.user = { role: USER_ROLES.ADMIN };
    renderAdminRoute();
    expect(screen.getByText("Admin hợp lệ")).toBeInTheDocument();
  });
});
