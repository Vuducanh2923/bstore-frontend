import { useState } from "react";
import { Link } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { orderService, paymentService } from "../../services/bstoreService";
import { formatCurrency } from "../../utils/formatters";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, refreshCart, removeItem, totalAmount } = useCart();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    fullName: user?.full_name || user?.name || "",
    phone: user?.phone || "",
    address: "",
    note: "",
    paymentMethod: "COD",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const orderItems = items.map((item) => ({
        product_variant_id: item.variantId,
        product_name: item.productName || item.product.name,
        color: item.color,
        ram: item.ram,
        storage: item.storage,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));
      const order = await orderService.createOrder({
        user_id: user.id,
        receiver_name: form.fullName,
        receiver_phone: form.phone,
        receiver_email: user?.email || null,
        shipping_address: form.address,
        shipping_method: "standard",
        total_amount: totalAmount,
        discount_amount: 0,
        final_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        note: form.note,
        items: orderItems,
      });

      await paymentService.createPayment({
        order_id: order.id,
        payment_method: form.paymentMethod,
        payment_provider: form.paymentMethod === "ONLINE" ? "online" : "cod",
        amount: totalAmount,
        status: form.paymentMethod === "COD" ? "pending" : "created",
      });

      await Promise.allSettled(items.map((item) => removeItem(item.id)));
      await refreshCart();

      showToast("Tạo đơn hàng thành công.", "success");
      setMessage("Đơn hàng đã được tạo và gửi sang backend BStore.");
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, "Không tạo được đơn hàng.");
      setMessage(apiMessage);
      showToast(apiMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="container checkout-page">
        <section className="empty-state">
          <h1>Không có sản phẩm để thanh toán</h1>
          <Link className="primary-button" to="/products">
            Mua sắm ngay
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container checkout-page">
      <section className="page-heading">
        <span>Checkout</span>
        <h1>Thanh toán</h1>
      </section>
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      <div className="checkout-layout">
        <form className="checkout-form form-stack" onSubmit={handleSubmit}>
          <label>
            Họ tên người nhận
            <input
              name="fullName"
              onChange={handleChange}
              required
              value={form.fullName}
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="phone"
              onChange={handleChange}
              required
              value={form.phone}
            />
          </label>
          <label>
            Địa chỉ giao hàng
            <textarea
              name="address"
              onChange={handleChange}
              required
              rows="4"
              value={form.address}
            />
          </label>
          <label>
            Ghi chú
            <textarea
              name="note"
              onChange={handleChange}
              rows="3"
              value={form.note}
            />
          </label>
          <div className="payment-options">
            <label>
              <input
                checked={form.paymentMethod === "COD"}
                name="paymentMethod"
                onChange={handleChange}
                type="radio"
                value="COD"
              />
              Thanh toán COD
            </label>
            <label>
              <input
                checked={form.paymentMethod === "ONLINE"}
                name="paymentMethod"
                onChange={handleChange}
                type="radio"
                value="ONLINE"
              />
              Thanh toán Online
            </label>
          </div>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Đang tạo đơn..." : "Đặt hàng"}
          </button>
        </form>
        <aside className="summary-panel">
          <h2>Đơn hàng</h2>
          {items.map((item) => (
            <div key={item.id}>
              <span>
                {item.productName || item.product.name} x {item.quantity}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="summary-total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}
