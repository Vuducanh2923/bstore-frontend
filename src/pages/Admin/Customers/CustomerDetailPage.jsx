import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PaymentStatusBadge from "../../../components/PaymentStatusBadge";
import StatusBadge from "../../../components/StatusBadge";
import StatusMessage from "../../../components/StatusMessage";
import { readCollection } from "../../../services/api";
import { adminService } from "../../../services/bstoreService";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { formatCurrency, resolveMediaUrl } from "../../../utils/formatters";

function formatDate(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatAddress(address) {
  if (!address) {
    return "Chưa cập nhật";
  }

  if (typeof address === "string") {
    return address;
  }

  return [
    address.address,
    address.ward,
    address.district,
    address.province,
  ].filter(Boolean).join(", ") || "Chưa cập nhật";
}

function normalizeCustomer(payload = {}) {
  const customer = payload.customer || payload.user || payload.data || payload || {};
  const addresses = Array.isArray(customer.user_addresses)
    ? customer.user_addresses
    : Array.isArray(customer.addresses)
      ? customer.addresses
      : readCollection(customer, ["user_addresses", "addresses"]);
  const orders = Array.isArray(customer.orders)
    ? customer.orders
    : Array.isArray(customer.order_history)
      ? customer.order_history
      : readCollection(customer, ["orders"]);

  return {
    addresses,
    avatar:
      customer.avatar_url ||
      customer.avatarUrl ||
      customer.avatar ||
      customer.image_url ||
      "",
    dateOfBirth: customer.date_of_birth || customer.dateOfBirth || "",
    defaultShippingAddress:
      customer.default_shipping_address ||
      customer.defaultShippingAddress ||
      addresses.find((address) => address.is_default)?.address ||
      "",
    email: customer.email || "",
    fullName: customer.full_name || customer.fullName || customer.name || "Khách hàng",
    gender: customer.gender || "",
    orders,
    phone: customer.phone || "",
    status: String(customer.status || "active").toLowerCase(),
  };
}

function normalizeOrder(order = {}) {
  return {
    createdAt: order.created_at || order.createdAt || "",
    finalAmount: Number(order.final_amount || order.finalAmount || order.total || 0),
    id: order.id ?? order.order_id ?? order.orderId ?? order.order_code,
    items: Array.isArray(order.order_items)
      ? order.order_items
      : Array.isArray(order.items)
        ? order.items
        : [],
    orderCode: order.order_code || order.orderCode || order.code || order.id || "",
    paymentStatus: order.payment_status || order.paymentStatus || "",
    paymentStatusLabel: order.payment_status_label || order.paymentStatusLabel || "",
    status: order.status || "",
    statusLabel: order.status_label || order.statusLabel || "",
  };
}

function normalizeOrderItem(item = {}) {
  const variant = item.product_variant || item.variant || {};
  const product = item.product || variant.product || {};
  const quantity = Number(item.quantity || item.qty || 0);
  const price = Number(item.price || item.unit_price || item.unitPrice || 0);

  return {
    color: item.color || variant.color || "",
    price,
    productName:
      item.product_name ||
      item.productName ||
      product.name ||
      variant.product_name ||
      "Sản phẩm",
    quantity,
    ram: item.ram || variant.ram || "",
    storage: item.storage || variant.storage || "",
    subtotal: Number(item.subtotal || item.total || price * quantity),
  };
}

function CustomerAvatar({ customer }) {
  const avatarUrl = customer.avatar ? resolveMediaUrl(customer.avatar) : "";

  if (avatarUrl) {
    return <img alt={customer.fullName} src={avatarUrl} />;
  }

  return customer.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "KH";
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignored = false;

    async function loadCustomer() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await adminService.getCustomer(id);

        if (!ignored) {
          setCustomer(normalizeCustomer(payload));
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(getStatusErrorMessage(error, "Không thể tải chi tiết customer."));
          setCustomer(null);
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      ignored = true;
    };
  }, [id]);

  const toggleOrder = (orderId) => {
    setExpandedOrders((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  return (
    <section className="admin-dashboard admin-management-page">
      <div className="admin-page-heading">
        <div>
          <h1>Chi tiết customer</h1>
          <p>Thông tin liên lạc, địa chỉ giao hàng và lịch sử mua hàng.</p>
        </div>
        <Link className="secondary-button" to="/admin/customers">
          Quay lại
        </Link>
      </div>

      {loading ? <div className="admin-table-wrap">Đang tải chi tiết customer...</div> : null}
      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      {!loading && !customer && !errorMessage ? (
        <div className="empty-state">
          <h2>Không tìm thấy dữ liệu</h2>
        </div>
      ) : null}

      {!loading && customer ? (
        <div className="customer-detail-grid">
          <section className="dashboard-card customer-contact-card">
            <h2>Thông tin liên lạc</h2>
            <div className="customer-contact-layout">
              <div className="customer-avatar">
                <CustomerAvatar customer={customer} />
              </div>
              <dl>
                <div>
                  <dt>Họ tên</dt>
                  <dd>{customer.fullName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{customer.email || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{customer.phone || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Giới tính</dt>
                  <dd>{customer.gender || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Ngày sinh</dt>
                  <dd>{formatDate(customer.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <StatusBadge value={customer.status} />
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="dashboard-card customer-address-card">
            <h2>Địa chỉ giao hàng</h2>
            <div className="default-address-box">
              <span>Mặc định</span>
              <p>{formatAddress(customer.defaultShippingAddress)}</p>
            </div>
            <div className="address-list">
              {customer.addresses.map((address, index) => (
                <article key={address.id || index}>
                  <strong>
                    {address.receiver_name || address.receiverName || `Địa chỉ ${index + 1}`}
                  </strong>
                  <span>{address.receiver_phone || address.receiverPhone || ""}</span>
                  <p>{formatAddress(address)}</p>
                </article>
              ))}
              {customer.addresses.length === 0 ? (
                <p className="muted-text">Chưa có địa chỉ giao hàng.</p>
              ) : null}
            </div>
          </section>

          <section className="dashboard-card customer-orders-card">
            <h2>Lịch sử mua hàng</h2>
            {customer.orders.length === 0 ? (
              <div className="empty-state">
                <h2>Chưa có đơn hàng</h2>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table customer-order-detail-table">
                  <thead>
                    <tr>
                      <th>Order code</th>
                      <th>Ngày tạo</th>
                      <th>Tổng tiền</th>
                      <th>Đơn hàng</th>
                      <th>Thanh toán</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map(normalizeOrder).map((order) => (
                      <tr key={order.id || order.orderCode}>
                        <td className="admin-link">#{order.orderCode}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{formatCurrency(order.finalAmount)}</td>
                        <td>
                          <StatusBadge label={order.statusLabel} value={order.status} />
                        </td>
                        <td>
                          <PaymentStatusBadge
                            label={order.paymentStatusLabel}
                            value={order.paymentStatus}
                          />
                        </td>
                        <td>
                          <button onClick={() => toggleOrder(order.id)} type="button">
                            {expandedOrders[order.id] ? "Thu gọn" : "Mở rộng"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="expanded-order-list">
                  {customer.orders.map(normalizeOrder).map((order) =>
                    expandedOrders[order.id] ? (
                      <article key={`items-${order.id}`} className="expanded-order-card">
                        <h3>Order items #{order.orderCode}</h3>
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Color</th>
                                <th>RAM</th>
                                <th>Storage</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map(normalizeOrderItem).map((item, index) => (
                                <tr key={`${item.productName}-${index}`}>
                                  <td>{item.productName}</td>
                                  <td>{item.color || "-"}</td>
                                  <td>{item.ram || "-"}</td>
                                  <td>{item.storage || "-"}</td>
                                  <td>{item.quantity}</td>
                                  <td>{formatCurrency(item.price)}</td>
                                  <td>{formatCurrency(item.subtotal)}</td>
                                </tr>
                              ))}
                              {order.items.length === 0 ? (
                                <tr>
                                  <td colSpan="7">Không có sản phẩm trong đơn hàng.</td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
