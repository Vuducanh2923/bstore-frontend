/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrderListPage from "./OrderListPage";

const { adminService, showToast } = vi.hoisted(() => ({
  showToast: vi.fn(),
  adminService: {
    assignOrder: vi.fn(),
    cancelOrder: vi.fn(),
    decideCancelRequest: vi.fn(),
    getOrder: vi.fn(),
    getOrders: vi.fn(),
    updateOrderPaymentStatus: vi.fn(),
    updateOrderStatus: vi.fn(),
    updateRefundStatus: vi.fn(),
  },
}));

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, role: "ADMIN", name: "Admin" } }),
}));
vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ showToast }),
}));
vi.mock("../../../services/bstoreService", () => ({ adminService }));

function order(overrides = {}) {
  return {
    id: 123,
    order_code: "ORD-123",
    customer_name: "Nguyễn Văn A",
    customer_email: "a@example.com",
    payment_method: "cod",
    payment_status: "unpaid",
    status: "processing",
    final_amount: 125000,
    created_at: "2026-08-04T01:00:00+07:00",
    ...overrides,
  };
}

function renderPage(currentOrder) {
  adminService.getOrders.mockResolvedValue({
    data: [currentOrder],
    pagination: { page: 1, totalPages: 1 },
  });
  adminService.getOrder.mockResolvedValue(currentOrder);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrderListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openOrderDetail() {
  const buttons = await screen.findAllByRole("button", { name: "Xem chi tiết" });
  fireEvent.click(buttons.at(-1));
  return screen.findByRole("combobox", { name: "Trạng thái thanh toán" });
}

describe("admin order payment status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it("confirms COD details, cancels safely, and prevents duplicate requests", async () => {
    let resolveUpdate;
    adminService.updateOrderPaymentStatus.mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve;
    }));
    renderPage(order());
    const select = await openOrderDetail();
    expect(select).toHaveValue("unpaid");
    expect(within(select).getAllByRole("option").map((item) => item.value)).toEqual(["unpaid", "paid"]);

    fireEvent.change(select, { target: { value: "paid" } });
    let confirmation = screen.getAllByRole("dialog").at(-1);
    expect(within(confirmation).getByText("#ORD-123")).toBeInTheDocument();
    expect(within(confirmation).getByText("Chưa thanh toán", { selector: "dd" })).toBeInTheDocument();
    expect(within(confirmation).getByText("Đã thanh toán", { selector: "dd" })).toBeInTheDocument();

    fireEvent.click(within(confirmation).getByRole("button", { name: "Đóng" }));
    expect(adminService.updateOrderPaymentStatus).not.toHaveBeenCalled();
    expect(select).toHaveValue("unpaid");

    fireEvent.change(select, { target: { value: "paid" } });
    confirmation = screen.getAllByRole("dialog").at(-1);
    const confirmButton = within(confirmation).getByRole("button", { name: "Cập nhật" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(adminService.updateOrderPaymentStatus).toHaveBeenCalledOnce());
    expect(adminService.updateOrderPaymentStatus).toHaveBeenCalledWith(123, "paid");
    expect(within(confirmation).getByRole("button", { name: "Đang xử lý..." })).toBeDisabled();

    const updatedOrder = order({
      paid_at: "2026-08-04T02:00:00+07:00",
      payment_status: "paid",
    });
    adminService.getOrder.mockResolvedValue(updatedOrder);
    adminService.getOrders.mockResolvedValue({
      data: [updatedOrder],
      pagination: { page: 1, totalPages: 1 },
    });
    resolveUpdate({ payment_status: "paid", paid_at: updatedOrder.paid_at });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Đã cập nhật trạng thái thanh toán.", "success"));
    await waitFor(() => expect(screen.getAllByText("Đã thanh toán").length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText("02:00 04/08/2026")).toBeInTheDocument();
    expect(screen.getAllByText("Đang xử lý").length).toBeGreaterThan(0);
  });

  it("keeps the COD modal and old value when the backend rejects the update", async () => {
    adminService.updateOrderPaymentStatus.mockRejectedValue({
      response: { status: 409, data: { message: "Dữ liệu vừa được cập nhật bởi quản trị viên khác." } },
    });
    renderPage(order());
    const select = await openOrderDetail();
    fireEvent.change(select, { target: { value: "paid" } });
    const confirmation = screen.getAllByRole("dialog").at(-1);
    fireEvent.click(within(confirmation).getByRole("button", { name: "Cập nhật" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      "Dữ liệu vừa được cập nhật bởi quản trị viên khác.",
      "error",
    ));
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(select).toHaveValue("unpaid");
  });

  it("shows VNPay status without allowing a manual update", async () => {
    renderPage(order({ payment_method: "vnpay", payment_status: "pending" }));
    const select = await openOrderDetail();

    expect(select).toBeDisabled();
    expect(screen.getByText("Trạng thái thanh toán VNPay được xác nhận tự động từ cổng thanh toán."))
      .toBeInTheDocument();
    expect(adminService.updateOrderPaymentStatus).not.toHaveBeenCalled();
  });
});
