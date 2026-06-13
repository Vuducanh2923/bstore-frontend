import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { adminService, uploadService } from "../../services/bstoreService";
import {
  formatCurrency,
  normalizeProduct,
  resolveMediaUrl,
  slugify,
} from "../../utils/formatters";

const emptyProductForm = {
  name: "",
  slug: "",
  categoryId: "",
  brandId: "",
  price: "",
  imageUrl: "",
  description: "",
  sku: "",
};

const chartBars = [
  { day: "Mon", value: 46 },
  { day: "Tue", value: 70 },
  { day: "Wed", value: 58 },
  { day: "Thu", value: 92 },
  { day: "Fri", value: 100, active: true },
  { day: "Sat", value: 76 },
  { day: "Sun", value: 64 },
];

function normalizeOrder(order = {}) {
  return {
    id: order.id || order.orderId || order.order_id,
    customerName:
      order.receiver_name ||
      order.customer?.name ||
      order.customerName ||
      "Khách hàng",
    paymentMethod: order.payment_method || order.paymentMethod || "COD",
    status: String(order.status || "pending").toLowerCase(),
    paymentStatus: order.payment_status || "pending",
    total: Number(order.final_amount || order.total_amount || order.total || 0),
  };
}

function normalizeUser(user = {}) {
  return {
    id: user.id,
    name: user.full_name || user.name || "User",
    email: user.email || "",
    phone: user.phone || "Chưa cập nhật",
    roleId: String(user.role_id || user.role?.id || ""),
    role: user.role?.name || (Number(user.role_id) === 1 ? "Admin" : "Customer"),
    status: user.status || "active",
    raw: user,
  };
}

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

  if (["delivered", "completed", "active", "shipped"].includes(value)) {
    return "success";
  }

  if (["shipping", "processing", "confirmed"].includes(value)) {
    return "info";
  }

  if (["pending", "created"].includes(value)) {
    return "warning";
  }

  if (["cancelled", "canceled", "suspended", "failed"].includes(value)) {
    return "danger";
  }

  return "neutral";
}

function StatusPill({ children }) {
  return (
    <span className={`admin-pill admin-pill--${statusClass(children)}`}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [
      productResult,
      categoryResult,
      brandResult,
      inventoryResult,
      orderResult,
      userResult,
      roleResult,
    ] = await Promise.allSettled([
      adminService.getProducts(),
      adminService.getCategories(),
      adminService.getBrands(),
      adminService.getInventory(),
      adminService.getOrders(),
      adminService.getUsers(),
      adminService.getRoles(),
    ]);

    const productList =
      productResult.status === "fulfilled"
        ? readCollection(productResult.value, ["products"]).map(normalizeProduct)
        : [];

    if (productResult.status === "fulfilled") {
      setProducts(productList);
    }

    if (categoryResult.status === "fulfilled") {
      setCategories(readCollection(categoryResult.value, ["categories"]));
    }

    if (brandResult.status === "fulfilled") {
      setBrands(readCollection(brandResult.value, ["brands"]));
    }

    if (inventoryResult.status === "fulfilled") {
      const inventoryList = readCollection(inventoryResult.value, [
        "inventories",
        "inventory",
      ]).map((item) => {
        const variant = item.variant || {};
        const product = productList.find(
          (current) => Number(current.id) === Number(variant.product_id),
        );

        return {
          id: item.id,
          productName:
            product?.name || variant.product?.name || `Variant #${variant.id}`,
          variantLabel: [variant.color, variant.ram, variant.storage]
            .filter(Boolean)
            .join(" / "),
          quantity: Number(item.quantity || 0),
          reservedQuantity: Number(item.reserved_quantity || 0),
        };
      });

      setInventory(inventoryList);
    }

    if (orderResult.status === "fulfilled") {
      setOrders(readCollection(orderResult.value, ["orders"]).map(normalizeOrder));
    }

    if (userResult.status === "fulfilled") {
      setUsers(readCollection(userResult.value, ["users"]).map(normalizeUser));
    }

    if (roleResult.status === "fulfilled") {
      setRoles(readCollection(roleResult.value, ["roles"]));
    }

    const rejected = [
      productResult,
      categoryResult,
      brandResult,
      inventoryResult,
      orderResult,
      userResult,
      roleResult,
    ].find((result) => result.status === "rejected");

    if (rejected) {
      setMessage(
        getApiErrorMessage(
          rejected.reason,
          "Một số dữ liệu admin chưa tải được từ backend.",
        ),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(loadAdminData, 0);
    return () => window.clearTimeout(timerId);
  }, [loadAdminData]);

  const dashboard = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter((order) =>
      ["pending", "processing", "confirmed"].includes(order.status),
    ).length;
    const shippedOrders = orders.filter((order) =>
      ["shipping", "shipped"].includes(order.status),
    ).length;
    const activeInventory = inventory.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    return {
      totalRevenue,
      pendingOrders,
      shippedOrders,
      activeInventory,
      activeUsers: users.filter((user) => user.status !== "suspended").length,
    };
  }, [inventory, orders, users]);

  const handleTab = (nextTab) => {
    setSearchParams(nextTab === "dashboard" ? {} : { tab: nextTab });
  };

  const handleProductChange = (event) => {
    const { name, value } = event.target;

    setProductForm((current) => ({
      ...current,
      [name]: value,
      slug: name === "name" && !editingProductId ? slugify(value) : current.slug,
      sku:
        name === "name" && !editingProductId
          ? slugify(value).toUpperCase()
          : current.sku,
    }));
  };

  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);
    setMessage("");

    try {
      const payload = await uploadService.uploadImage(file);
      const nextImageUrl = payload.image_url || payload.path || payload.url || "";

      setProductForm((current) => ({
        ...current,
        imageUrl: nextImageUrl,
      }));
      setMessage("Đã upload ảnh sản phẩm.");
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không upload được ảnh sản phẩm."));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setEditingProductId(null);
  };

  const handleEditProduct = (product) => {
    const firstVariant = product.variants?.[0] || {};

    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      slug: product.slug || slugify(product.name),
      categoryId: product.categoryId || "",
      brandId: product.brandId || "",
      price: product.price,
      imageUrl: product.imageUrl,
      description: product.description,
      sku: firstVariant.sku || slugify(product.name).toUpperCase(),
    });
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const categoryId = productForm.categoryId || categories[0]?.id;
    const brandId = productForm.brandId || brands[0]?.id;
    const slug = productForm.slug || slugify(productForm.name);
    const price = Number(productForm.price);
    const payload = {
      category_id: Number(categoryId),
      brand_id: Number(brandId),
      name: productForm.name,
      slug,
      description: productForm.description,
      price,
      status: "active",
      variants: [
        {
          sku: productForm.sku || slug.toUpperCase(),
          price,
          status: "active",
        },
      ],
      images: productForm.imageUrl
        ? [
            {
              image_url: productForm.imageUrl,
              is_thumbnail: true,
            },
          ]
        : [],
    };

    try {
      if (editingProductId) {
        await adminService.updateProduct(editingProductId, payload);
        setMessage("Đã cập nhật sản phẩm.");
      } else {
        await adminService.createProduct(payload);
        setMessage("Đã thêm sản phẩm mới.");
      }

      resetProductForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteProduct(productId);
      setMessage("Đã xoá sản phẩm.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xoá được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const handleInventoryChange = (inventoryId, value) => {
    setInventory((current) =>
      current.map((item) =>
        item.id === inventoryId ? { ...item, quantity: Number(value) } : item,
      ),
    );
  };

  const handleSaveInventory = async (item) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateInventory(item.id, {
        quantity: Number(item.quantity),
        reserved_quantity: Number(item.reservedQuantity || 0),
      });
      setMessage("Đã cập nhật tồn kho.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được tồn kho."));
    } finally {
      setSaving(false);
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateOrder(orderId, { status });
      setMessage("Đã cập nhật trạng thái đơn hàng.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được đơn hàng."));
    } finally {
      setSaving(false);
    }
  };

  const handleUserRoleChange = async (user, roleId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateUser(user.id, {
        role_id: Number(roleId),
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                roleId: String(roleId),
                role:
                  roles.find((role) => Number(role.id) === Number(roleId))?.name ||
                  item.role,
              }
            : item,
        ),
      );
      setMessage("Đã cập nhật role người dùng.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được role người dùng."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`admin-dashboard admin-dashboard--${tab}`}>
      {loading ? <StatusMessage>Đang tải dữ liệu admin...</StatusMessage> : null}
      {message ? <StatusMessage>{message}</StatusMessage> : null}

      {tab === "dashboard" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Dashboard Overview</h1>
              <p>Monitor your store's performance across all metrics.</p>
            </div>
            <div className="admin-heading-actions">
              <button type="button">▣ Last 30 Days</button>
              <button className="admin-primary-action" type="button">
                ⇩ Export Report
              </button>
            </div>
          </div>

          <div className="dashboard-hero-grid">
            <article className="dashboard-card revenue-card">
              <div className="card-title-row">
                <h2>Total Revenue</h2>
                <div>
                  <strong>{formatCurrency(dashboard.totalRevenue)}</strong>
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="bar-chart">
                {chartBars.map((bar) => (
                  <div className="bar-column" key={bar.day}>
                    <span
                      className={bar.active ? "active" : ""}
                      style={{ height: `${bar.value}%` }}
                    />
                    <small>{bar.day}</small>
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
                  <div className="progress-line">
                    <i style={{ width: "78%" }} />
                  </div>
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
                <button onClick={() => handleTab("orders")} type="button">
                  View All
                </button>
              </div>
              <table className="admin-clean-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 3).map((order) => (
                    <tr key={order.id}>
                      <td className="admin-link">#ORD-{order.id}</td>
                      <td>
                        <div className="admin-person">
                          <span>{initials(order.customerName)}</span>
                          {order.customerName}
                        </div>
                      </td>
                      <td>
                        <StatusPill>{order.status}</StatusPill>
                      </td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>•••</td>
                    </tr>
                  ))}
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="5">Chưa có đơn hàng từ backend.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </article>

            <article className="dashboard-card top-products">
              <h2>Top Products</h2>
              <div className="top-product-list">
                {products.slice(0, 3).map((product) => (
                  <div className="top-product-row" key={product.id}>
                    <div className="top-product-image">
                      {product.imageUrl ? (
                        <img alt={product.name} src={product.imageUrl} />
                      ) : (
                        <span>□</span>
                      )}
                    </div>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      <b>{formatCurrency(product.price)}</b>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleTab("inventory")} type="button">
                Manage Inventory
              </button>
            </article>
          </div>

          <div className="dashboard-kpi-row">
            <article>
              <span className="metric-icon metric-icon--blue">▤</span>
              <div>
                <small>Active Products</small>
                <strong>{products.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--green">◇</span>
              <div>
                <small>Customer Support</small>
                <strong>99.8%</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--orange">▱</span>
              <div>
                <small>Pending Delivery</small>
                <strong>{dashboard.pendingOrders + dashboard.shippedOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--purple">☆</span>
              <div>
                <small>Store Rating</small>
                <strong>4.9/5</strong>
              </div>
            </article>
          </div>
        </>
      ) : null}

      {tab === "products" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Product Management</h1>
              <p>Create, update and organize products from the BStore API.</p>
            </div>
            <button className="admin-primary-action" type="button">
              + Create Product
            </button>
          </div>
          <div className="admin-grid">
            <form className="admin-form form-stack" onSubmit={handleSaveProduct}>
              <h2>{editingProductId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
              <label>
                Tên sản phẩm
                <input
                  name="name"
                  onChange={handleProductChange}
                  required
                  value={productForm.name}
                />
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  onChange={handleProductChange}
                  required
                  value={productForm.slug}
                />
              </label>
              <label>
                Danh mục
                <select
                  name="categoryId"
                  onChange={handleProductChange}
                  required
                  value={productForm.categoryId}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Thương hiệu
                <select
                  name="brandId"
                  onChange={handleProductChange}
                  required
                  value={productForm.brandId}
                >
                  <option value="">Chọn thương hiệu</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Giá
                <input
                  min="0"
                  name="price"
                  onChange={handleProductChange}
                  required
                  type="number"
                  value={productForm.price}
                />
              </label>
              <label>
                SKU biến thể
                <input
                  name="sku"
                  onChange={handleProductChange}
                  required
                  value={productForm.sku}
                />
              </label>
              <label>
                URL ảnh
                <input
                  name="imageUrl"
                  onChange={handleProductChange}
                  placeholder="https://... hoặc uploads/products/..."
                  value={productForm.imageUrl}
                />
              </label>
              <label>
                Tải ảnh từ máy
                <input
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleImageFile}
                  type="file"
                />
              </label>
              {productForm.imageUrl ? (
                <div className="image-preview">
                  <img
                    alt="Xem trước ảnh sản phẩm"
                    src={resolveMediaUrl(productForm.imageUrl)}
                  />
                </div>
              ) : null}
              <label>
                Mô tả
                <textarea
                  name="description"
                  onChange={handleProductChange}
                  rows="4"
                  value={productForm.description}
                />
              </label>
              <button
                className="primary-button"
                disabled={saving || uploadingImage}
                type="submit"
              >
                {saving ? "Đang lưu..." : "Lưu sản phẩm"}
              </button>
              {editingProductId ? (
                <button
                  className="secondary-button"
                  onClick={resetProductForm}
                  type="button"
                >
                  Huỷ sửa
                </button>
              ) : null}
            </form>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Thương hiệu</th>
                    <th>Giá</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id || product.name}>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.brand}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <button onClick={() => handleEditProduct(product)} type="button">
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          type="button"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === "orders" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Order Management</h1>
              <p>Review and manage customer purchases and fulfillment status.</p>
            </div>
            <div className="admin-heading-actions">
              <button type="button">⇩ Export CSV</button>
              <button className="admin-primary-action" type="button">
                + Create Order
              </button>
            </div>
          </div>
          <div className="order-metric-row">
            <article>
              <span className="metric-icon metric-icon--purple">▤</span>
              <div>
                <small>Total Orders</small>
                <strong>{orders.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--blue">▣</span>
              <div>
                <small>Pending Fulfillment</small>
                <strong>{dashboard.pendingOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--blue">▱</span>
              <div>
                <small>In Transit</small>
                <strong>{dashboard.shippedOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--red">⊗</span>
              <div>
                <small>Refund Requests</small>
                <strong>0</strong>
              </div>
            </article>
          </div>
          <div className="admin-filter-card">
            <button type="button">All Statuses⌄</button>
            <button type="button">Last 30 Days</button>
            <button type="button">All Payment Methods⌄</button>
            <button type="button">Clear all filters</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin-link">#ORD-{order.id}</td>
                    <td>
                      <div className="admin-person">
                        <span>{initials(order.customerName)}</span>
                        {order.customerName}
                      </div>
                    </td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>{order.paymentStatus || order.paymentMethod}</td>
                    <td>
                      <select
                        onChange={(event) =>
                          handleOrderStatus(order.id, event.target.value)
                        }
                        value={order.status}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="shipping">shipping</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td>•••</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "inventory" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Inventory Control</h1>
              <p>Update product stock and reserved quantities.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Biến thể</th>
                  <th>Tồn kho</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id || item.productName}>
                    <td>{item.productName}</td>
                    <td>{item.variantLabel || "Mặc định"}</td>
                    <td>
                      <input
                        min="0"
                        onChange={(event) =>
                          handleInventoryChange(item.id, event.target.value)
                        }
                        type="number"
                        value={item.quantity}
                      />
                    </td>
                    <td>
                      <button onClick={() => handleSaveInventory(item)} type="button">
                        Lưu kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "users" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>User Management</h1>
              <p>Oversee user accounts, permissions, and security policies.</p>
            </div>
            <button className="admin-primary-action" type="button">
              + Create User
            </button>
          </div>
          <div className="order-metric-row">
            <article>
              <span className="metric-icon metric-icon--blue">◉</span>
              <div>
                <small>Total Users</small>
                <strong>{users.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--green">◇</span>
              <div>
                <small>Active Now</small>
                <strong>{dashboard.activeUsers}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--orange">▣</span>
              <div>
                <small>Admins</small>
                <strong>
                  {users.filter((user) => user.role.toLowerCase().includes("admin")).length}
                </strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--red">⊘</span>
              <div>
                <small>Suspended</small>
                <strong>
                  {users.filter((user) => user.status === "suspended").length}
                </strong>
              </div>
            </article>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-person">
                        <span>{initials(user.name)}</span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{user.phone}</td>
                    <td>
                      <StatusPill>{user.status}</StatusPill>
                    </td>
                    <td>
                      <select
                        className="admin-role-select"
                        disabled={saving || roles.length === 0}
                        onChange={(event) =>
                          handleUserRoleChange(user, event.target.value)
                        }
                        value={String(user.roleId)}
                      >
                        {roles.length === 0 ? (
                          <option value={user.roleId}>{user.role}</option>
                        ) : null}
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "settings" ? (
        <div className="dashboard-card settings-card">
          <h1>Settings</h1>
          <p>Điều chỉnh endpoint backend tại file cấu hình API.</p>
          <Link className="primary-button" to="/products">
            Về cửa hàng
          </Link>
        </div>
      ) : null}
    </section>
  );
}
