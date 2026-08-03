import { formatCurrency } from "../../../utils/formatters";

function initials(value) {
  return String(value || "BS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "completed", "delivered", "paid"].includes(value)) return "success";
  if (["shipping", "processing", "confirmed"].includes(value)) return "info";
  if (["pending", "created"].includes(value)) return "warning";
  if (["cancelled", "canceled", "suspended", "failed"].includes(value)) return "danger";
  return "neutral";
}

function StatusPill({ children }) {
  return (
    <span className={`admin-pill admin-pill--${statusClass(children)}`}>
      {children}
    </span>
  );
}

export default function DashboardOverview({
  dashboard,
  onExportRevenue,
  onNavigateToOrder,
  onRevenueRangeChange,
  onTabChange,
  orders,
  products,
  revenueRange,
  revenueRanges,
}) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Monitor your store's performance across all metrics.</p>
        </div>
        <div className="admin-heading-actions">
          <label className="admin-revenue-range">
            <span>Khoảng thời gian</span>
            <select
              aria-label="Khoảng thời gian doanh thu"
              onChange={(event) => onRevenueRangeChange(Number(event.target.value))}
              value={revenueRange}
            >
              {revenueRanges.map((range) => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </label>
          <button
            className="admin-primary-action"
            disabled={dashboard.revenueOrders.length === 0}
            onClick={onExportRevenue}
            type="button"
          >
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="dashboard-hero-grid">
        <article className="dashboard-card revenue-card">
          <div className="card-title-row">
            <h2>Doanh thu</h2>
            <div>
              <strong>{formatCurrency(dashboard.totalRevenue)}</strong>
              <span>
                {dashboard.revenueChange >= 0 ? "+" : ""}
                {dashboard.revenueChange.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {dashboard.revenueBars.map((bar, index) => (
              <div
                className="bar-column"
                key={`${bar.label}-${index}`}
                title={`${bar.label}: ${formatCurrency(bar.amount)}`}
              >
                <span className={bar.amount > 0 ? "active" : ""} style={{ height: `${bar.height}%` }} />
                <small>{bar.label}</small>
              </div>
            ))}
          </div>
        </article>

        <div className="side-metric-stack">
          <article className="dashboard-card side-metric">
            <span className="metric-icon metric-icon--blue">▢</span>
            <div>
              <small>Monthly Target</small>
              <span>Total Orders</span>
              <strong>{orders.length}</strong>
              <div className="progress-line"><i style={{ width: "78%" }} /></div>
            </div>
          </article>
          <article className="dashboard-card side-metric">
            <span className="metric-icon metric-icon--green">◉</span>
            <div>
              <small>New This Week</small>
              <span>Active Users</span>
              <strong>{dashboard.activeUsers}</strong>
              <p>↗ 8% increase from last week</p>
            </div>
          </article>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <article className="dashboard-card recent-orders">
          <div className="card-title-row">
            <h2>Recent Orders</h2>
            <button onClick={() => onTabChange("orders")} type="button">View All</button>
          </div>
          <table className="admin-clean-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Amount</th><th>Action</th></tr>
            </thead>
            <tbody>
              {orders.slice(0, 3).map((order) => (
                <tr key={order.id}>
                  <td className="admin-link">#ORD-{order.id}</td>
                  <td><div className="admin-person"><span>{initials(order.customerName)}</span>{order.customerName}</div></td>
                  <td><StatusPill>{order.status}</StatusPill></td>
                  <td>{formatCurrency(order.total)}</td>
                  <td>
                    <button
                      aria-label={`Xem chi tiết đơn hàng ORD-${order.id}`}
                      className="admin-row-action"
                      onClick={() => onNavigateToOrder(order.id)}
                      type="button"
                    >•••</button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? <tr><td colSpan="5">Chưa có đơn hàng từ backend.</td></tr> : null}
            </tbody>
          </table>
        </article>

        <article className="dashboard-card top-products">
          <h2>Top Products</h2>
          <div className="top-product-list">
            {products.slice(0, 3).map((product) => (
              <div className="top-product-row" key={product.id}>
                <div className="top-product-image">
                  {product.imageUrl ? <img alt={product.name} src={product.imageUrl} /> : <span>□</span>}
                </div>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                  <b>{formatCurrency(product.price)}</b>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onTabChange("inventory")} type="button">Manage Inventory</button>
        </article>
      </div>

      <div className="dashboard-kpi-row">
        <article><span className="metric-icon metric-icon--blue">▤</span><div><small>Active Products</small><strong>{products.length}</strong></div></article>
        <article><span className="metric-icon metric-icon--green">◇</span><div><small>Live Banners</small><strong>{dashboard.activeBanners}</strong></div></article>
        <article><span className="metric-icon metric-icon--orange">▱</span><div><small>Pending Delivery</small><strong>{dashboard.pendingOrders + dashboard.shippedOrders}</strong></div></article>
      </div>
    </>
  );
}
