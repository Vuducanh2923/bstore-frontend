import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  default: {
    patch: vi.fn(),
  },
  readCollection: vi.fn(),
  unwrapResponse: (response) => response.data,
}));

import api from "./api";
import { adminService } from "./bstoreService";

describe("admin order payment status API", () => {
  beforeEach(() => {
    api.patch.mockReset();
    api.patch.mockResolvedValue({ data: { payment_status: "paid" } });
  });

  it("patches the payment-status endpoint with only payment_status", async () => {
    await adminService.updateOrderPaymentStatus("ORD/123", "paid");

    expect(api.patch).toHaveBeenCalledOnce();
    expect(api.patch).toHaveBeenCalledWith(
      "/admin/orders/ORD%2F123/payment-status",
      { payment_status: "paid" },
      { suppressGlobalError: true },
    );
  });
});
