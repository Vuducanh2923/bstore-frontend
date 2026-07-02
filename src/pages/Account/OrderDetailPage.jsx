import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { customerOrderService } from "../../services/bstoreService";
import { getStatusErrorMessage } from "../../utils/apiErrors";
import { getOrderCode, readOrder } from "../../utils/orders";
import OrderDetailView from "./OrderDetailView";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const [state, setState] = useState({
    errorMessage: "",
    loading: true,
    order: null,
  });

  useEffect(() => {
    let ignored = false;

    async function loadOrder() {
      if (!orderId) {
        setState({
          errorMessage: "Không tìm thấy mã đơn hàng.",
          loading: false,
          order: null,
        });
        return;
      }

      setState((current) => ({
        ...current,
        errorMessage: "",
        loading: true,
      }));

      try {
        const payload = await customerOrderService.getOrder(orderId);
        const order = readOrder(payload);

        if (!ignored) {
          setState({
            errorMessage: "",
            loading: false,
            order,
          });
        }
      } catch (error) {
        const message = getStatusErrorMessage(
          error,
          "Không thể tải chi tiết đơn hàng.",
        );

        if (!ignored) {
          setState({
            errorMessage: message,
            loading: false,
            order: null,
          });
          showToast(message, "error");
        }
      }
    }

    loadOrder();

    return () => {
      ignored = true;
    };
  }, [orderId, showToast]);

  const orderCode = getOrderCode(state.order || {});

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
          errorMessage={state.errorMessage}
          loading={state.loading}
          order={state.order}
        />
      </section>
    </main>
  );
}
