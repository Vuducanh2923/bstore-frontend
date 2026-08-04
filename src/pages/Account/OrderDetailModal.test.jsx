/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import OrderDetailModal from "./OrderDetailModal";

describe("OrderDetailModal", () => {
  it("shows the retry action for an unpaid VNPAY order", () => {
    render(
      <MemoryRouter>
        <OrderDetailModal
          actionPending={false}
          errorMessage=""
          loading={false}
          onCancelOrder={vi.fn()}
          onClose={vi.fn()}
          onRetryPayment={vi.fn()}
          order={{
            id: 44,
            payment_method: "vnpay",
            payment_status: "unpaid",
            status: "pending",
          }}
          paymentPending={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Thanh toán VNPAY" })).toBeVisible();
  });
});
