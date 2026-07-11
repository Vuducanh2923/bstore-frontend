import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { customerOrderService } from "../../services/bstoreService";
import { getStatusErrorMessage } from "../../utils/apiErrors";
import { getOrderCode, readOrder } from "../../utils/orders";
import OrderDetailView from "./OrderDetailView";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    enabled: Boolean(orderId),
    queryFn: async () => {
      const payload = await customerOrderService.getOrder(orderId, {
        suppressGlobalError: true,
      });
      return readOrder(payload);
    },
    queryKey: ["customer", "order", orderId],
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (reason) =>
      customerOrderService.cancelOrder(orderId, {
        cancel_reason: reason,
        reason,
      }),
    onError: (error) => {
      showToast(getStatusErrorMessage(error, "Không thể hủy đơn hàng."), "error");
    },
    onSuccess: async () => {
      showToast("Đã gửi yêu cầu hủy đơn hàng.", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "order", orderId] }),
      ]);
    },
  });

  const order = orderQuery.data || null;
  const orderCode = getOrderCode(order || {});
  const errorMessage = !orderId
    ? "Không tìm thấy mã đơn hàng."
    : orderQuery.error
      ? getStatusErrorMessage(orderQuery.error, "Không thể tải chi tiết đơn hàng.")
      : "";

  return (
    <main className="container order-detail-page">
      <section className="page-heading order-detail-page-heading">
        <div>
          <span>Tài khoản</span>
          <h1>{orderCode ? `Chi tiết đơn hàng #${orderCode}` : "Chi tiết đơn hàng"}</h1>
        </div>
        <Link className="secondary-button" to="/account#orders">
          Lịch sử mua hàng
        </Link>
      </section>

      <section className="account-panel order-detail-page-panel">
        <OrderDetailView
          actionPending={cancelOrderMutation.isPending}
          errorMessage={errorMessage}
          loading={orderQuery.isLoading || orderQuery.isFetching}
          onCancelOrder={(reason) => cancelOrderMutation.mutateAsync(reason)}
          order={order}
        />
      </section>
    </main>
  );
}
