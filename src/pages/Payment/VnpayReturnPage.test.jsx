import { describe, expect, it } from "vitest";

import { isSettledVnpayResponse } from "./vnpayReturnUtils";

describe("VNPAY return settlement", () => {
  it("does not report success when a verified provider response is still pending locally", () => {
    expect(isSettledVnpayResponse({
      success: false,
      data: {
        verified: true,
        provider_successful: true,
        payment_status: "pending",
      },
    })).toBe(false);
  });

  it("reports success only after backend settlement", () => {
    expect(isSettledVnpayResponse({
      success: true,
      data: {
        successful: true,
        payment_status: "paid",
      },
    })).toBe(true);
  });
});
