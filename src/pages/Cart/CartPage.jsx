import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

function quantityLimit(item) {
  const value = Number(item.product?.availableQuantity);
  return Number.isFinite(value) ? Math.max(0, value) : 100;
}

export default function CartPage() {
  const { error, items, loading, removeItem, updateQuantity } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [draftQuantities, setDraftQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  const draftQuantity = (item) => Number(draftQuantities[item.id] ?? item.quantity);

  const handleQuantity = (item, quantity) => {
    const limit = quantityLimit(item);
    const nextQuantity = Math.min(limit, Math.max(1, Number(quantity) || 1));

    setDraftQuantities((current) => ({ ...current, [item.id]: nextQuantity }));
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.id);
      showToast("Đã xoá sản phẩm khỏi giỏ.", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Không xoá được sản phẩm."), "error");
    }
  };

  const handleCheckout = async () => {
    const changedItems = items.filter((item) => draftQuantity(item) !== item.quantity);

    setSaving(true);
    try {
      for (const item of changedItems) {
        await updateQuantity(item.id, draftQuantity(item), { refresh: false });
      }

      if (changedItems.length) {
        await updateQuantity(null, null, { refreshOnly: true });
      }

      navigate("/checkout");
    } catch (err) {
      showToast(
        getApiErrorMessage(err, "Không thể cập nhật giỏ hàng. Vui lòng kiểm tra tồn kho."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * draftQuantity(item),
    0,
  );

  return (
    <main className="container cart-page">
      <section className="page-heading">
        <span>Shopping Cart</span>
        <h1>Giỏ hàng của bạn</h1>
      </section>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {loading ? <StatusMessage>Đang tải giỏ hàng...</StatusMessage> : null}
      {!loading && items.length === 0 ? (
        <section className="empty-state">
          <h2>Giỏ hàng đang trống</h2>
          <p>Hãy chọn sản phẩm yêu thích trước khi đặt hàng.</p>
          <Link className="primary-button" to="/products">Tiếp tục mua sắm</Link>
        </section>
      ) : null}
      {items.length > 0 ? (
        <div className="cart-layout">
          <section className="cart-list">
            {items.map((item) => {
              const quantity = draftQuantity(item);
              const limit = quantityLimit(item);

              return (
                <article className="cart-row" key={item.id}>
                  <div className="cart-image">
                    {item.product.imageUrl ? (
                      <img alt={item.product.name} src={item.product.imageUrl} />
                    ) : <span>□</span>}
                  </div>
                  <div>
                    <strong>{item.product.name}</strong>
                    <p>{item.product.category}</p>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                  <div className="quantity-stepper">
                    <button disabled={quantity <= 1} onClick={() => handleQuantity(item, quantity - 1)} type="button">−</button>
                    <input max={limit} min="1" onChange={(event) => handleQuantity(item, event.target.value)} type="number" value={quantity} />
                    <button disabled={quantity >= limit} onClick={() => handleQuantity(item, quantity + 1)} type="button">+</button>
                  </div>
                  <button className="text-button" onClick={() => handleRemove(item)} type="button">Xoá</button>
                </article>
              );
            })}
          </section>
          <aside className="summary-panel">
            <h2>Tóm tắt đơn hàng</h2>
            <div><span>Tạm tính</span><strong>{formatCurrency(totalAmount)}</strong></div>
            <div><span>Vận chuyển</span><strong>Miễn phí</strong></div>
            <div className="summary-total"><span>Tổng cộng</span><strong>{formatCurrency(totalAmount)}</strong></div>
            <button className="primary-button" disabled={saving} onClick={handleCheckout} type="button">
              {saving ? "Đang cập nhật..." : "Thanh toán"}
            </button>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
