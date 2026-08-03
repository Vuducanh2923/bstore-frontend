/* @vitest-environment jsdom */
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api, {
  API_ERROR_EVENT,
  FORBIDDEN_EVENT,
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
  clearAuthSession,
  setAuthSession,
} from "./api";

function rejectWith(status) {
  return (config) => Promise.reject(new AxiosError(
    `HTTP ${status}`,
    undefined,
    config,
    undefined,
    { status, data: {}, headers: {}, config },
  ));
}

function seedSession() {
  setAuthSession("access-token", { id: 1, role: "CUSTOMER" }, "refresh-token");
}

describe("authentication response policy", () => {
  beforeEach(() => {
    clearAuthSession();
    vi.restoreAllMocks();
  });

  it("logs out and removes both tokens when the session is truly expired", async () => {
    setAuthSession("expired-token", { id: 1, role: "CUSTOMER" });
    const unauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized, { once: true });

    await expect(api.get("/auth/me", { adapter: rejectWith(401) })).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it("keeps the session and only reports forbidden access for 403", async () => {
    seedSession();
    const forbidden = vi.fn();
    window.addEventListener(FORBIDDEN_EVENT, forbidden, { once: true });

    await expect(api.get("/admin", { adapter: rejectWith(403) })).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe("refresh-token");
    expect(forbidden).toHaveBeenCalledOnce();
  });

  it("keeps the session and exposes a retry action when auth service returns 503", async () => {
    seedSession();
    const apiError = vi.fn();
    window.addEventListener(API_ERROR_EVENT, apiError, { once: true });

    await expect(api.get("/auth/me", { adapter: rejectWith(503) })).rejects.toBeTruthy();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("access-token");
    expect(apiError.mock.calls[0][0].detail.message)
      .toBe("Hệ thống xác thực đang tạm thời không khả dụng.");
    expect(apiError.mock.calls[0][0].detail.retry).toEqual(expect.any(Function));
  });

  it("does not log out on gateway timeout", async () => {
    seedSession();
    await expect(api.get("/auth/me", { adapter: rejectWith(504) })).rejects.toBeTruthy();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe("refresh-token");
  });
});
