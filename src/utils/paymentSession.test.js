import { describe, expect, it } from "vitest";
import { canRetryVnpayPayment } from "./paymentSession";

describe("canRetryVnpayPayment", () => {
  it("allows an unpaid VNPAY order to be paid again", () => {
    expect(canRetryVnpayPayment({
      payment_method: "VNPAY",
      payment_status: "pending",
      status: "pending",
    })).toBe(true);
  });

  it("does not allow a paid or cancelled order to be paid again", () => {
    expect(canRetryVnpayPayment({
      payment_method: "VNPAY",
      payment_status: "paid",
      status: "pending",
    })).toBe(false);
    expect(canRetryVnpayPayment({
      payment_method: "VNPAY",
      payment_status: "pending",
      status: "cancelled",
    })).toBe(false);
  });

  it("does not offer VNPAY payment for COD orders", () => {
    expect(canRetryVnpayPayment({
      payment_method: "COD",
      payment_status: "pending",
      status: "pending",
    })).toBe(false);
  });
});
