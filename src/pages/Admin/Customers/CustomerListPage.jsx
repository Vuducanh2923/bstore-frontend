import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusMessage from "../../../components/StatusMessage";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { readCollection } from "../../../services/api";
import { adminService } from "../../../services/bstoreService";
import { getStatusErrorMessage } from "../../../utils/apiErrors";
import { getRole, USER_ROLES } from "../../../utils/formatters";

const EMPTY_FILTERS = {
  email: "",
  name: "",
  phone: "",
  status: "",
};

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

function compactParams(filters) {
  return Object.entries(filters).reduce((params, [key, value]) => {
    const trimmedValue = String(value || "").trim();

    if (trimmedValue) {
      params[key] = trimmedValue;
    }

    return params;
  }, {});
}

function readCustomers(payload = {}) {
  const direct = readCollection(payload, ["customers", "users"]);

  if (direct.length) {
    return direct;
  }

  return readCollection(payload.data || {}, ["customers", "users"]);
}

function normalizeCustomer(customer = {}) {
  return {
    address:
      customer.address ||
      customer.default_shipping_address ||
      customer.defaultShippingAddress ||
      customer.user_addresses?.find?.((item) => item.is_default)?.address ||
      "",
    createdAt: customer.created_at || customer.createdAt || "",
    email: customer.email || "",
    fullName: customer.full_name || customer.fullName || customer.name || "Khách hàng",
    id: customer.id ?? customer.user_id ?? customer.userId,
    phone: customer.phone || "",
    raw: customer,
    status: String(customer.status || "active").toLowerCase(),
  };
}

function isBlocked(customer) {
  return ["blocked", "locked", "suspended"].includes(customer.status);
}

export default function CustomerListPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const currentRole = getRole(user);
  const canManageCustomers = currentRole === USER_ROLES.ADMIN;
  const [customers, setCustomers] = useState([]);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let ignored = false;

    async function loadCustomers() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await adminService.getCustomers(compactParams(filters));
        const nextCustomers = readCustomers(payload).map(normalizeCustomer);

        if (!ignored) {
          setCustomers(nextCustomers);
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(
            getStatusErrorMessage(error, "Không thể tải danh sách customer."),
          );
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      ignored = true;
    };
  }, [filters, refreshKey]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setFilters(draftFilters);
  };

  const handleClearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const handleToggleStatus = async (customer) => {
    if (!canManageCustomers) {
      return;
    }

    const nextStatus = isBlocked(customer) ? "active" : "blocked";

    setSavingId(customer.id);
    setErrorMessage("");

    try {
      await adminService.updateCustomerStatus(customer.id, { status: nextStatus });
      showToast(
        nextStatus === "active" ? "Đã mở khóa customer." : "Đã khóa customer.",
        "success",
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(
        getStatusErrorMessage(error, "Không thể cập nhật trạng thái customer."),
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="admin-dashboard admin-management-page">
      <div className="admin-page-heading">
        <div>
          <h1>Customer</h1>
          <p>Tra cứu, lọc và quản lý trạng thái tài khoản khách hàng.</p>
        </div>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      <form className="admin-filter-card customer-filter-card" onSubmit={handleFilterSubmit}>
        <label>
          Tên
          <input
            name="name"
            onChange={handleFilterChange}
            placeholder="Nhập họ tên"
            value={draftFilters.name}
          />
        </label>
        <label>
          Email
          <input
            name="email"
            onChange={handleFilterChange}
            placeholder="name@example.com"
            value={draftFilters.email}
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            onChange={handleFilterChange}
            placeholder="Số điện thoại"
            value={draftFilters.phone}
          />
        </label>
        <label>
          Trạng thái
          <select name="status" onChange={handleFilterChange} value={draftFilters.status}>
            <option value="">Tất cả</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="blocked">blocked</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="admin-primary-action" type="submit">
            Tìm kiếm
          </button>
          <button onClick={handleClearFilters} type="button">
            Xóa lọc
          </button>
        </div>
      </form>

      <div className="admin-table-wrap">
        {loading ? <p className="muted-text">Đang tải danh sách customer...</p> : null}

        {!loading && customers.length === 0 ? (
          <div className="empty-state">
            <h2>Không có customer</h2>
            <p>Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : null}

        {!loading && customers.length > 0 ? (
          <table className="admin-table customer-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id || customer.email}>
                  <td>
                    <strong>{customer.fullName}</strong>
                  </td>
                  <td>{customer.email || "Chưa cập nhật"}</td>
                  <td>{customer.phone || "Chưa cập nhật"}</td>
                  <td>{customer.address || "Chưa cập nhật"}</td>
                  <td>
                    <StatusBadge value={customer.status} />
                  </td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>
                    <Link className="table-link-button" to={`/admin/customers/${customer.id}`}>
                      Chi tiết
                    </Link>
                    {canManageCustomers ? (
                      <button
                        disabled={savingId === customer.id}
                        onClick={() => handleToggleStatus(customer)}
                        type="button"
                      >
                        {isBlocked(customer) ? "Mở khóa" : "Khóa"}
                      </button>
                    ) : (
                      <span className="muted-text">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
