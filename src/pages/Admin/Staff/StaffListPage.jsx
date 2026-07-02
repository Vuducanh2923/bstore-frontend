import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../../components/StatusBadge";
import StatusMessage from "../../../components/StatusMessage";
import { useToast } from "../../../context/ToastContext";
import { readCollection } from "../../../services/api";
import { adminService } from "../../../services/bstoreService";
import {
  getStatusErrorMessage,
  getValidationErrors,
  isValidationError,
} from "../../../utils/apiErrors";
import StaffFormModal from "./StaffFormModal";

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

function readStaff(payload = {}) {
  const direct = readCollection(payload, ["staff", "users"]);

  if (direct.length) {
    return direct;
  }

  return readCollection(payload.data || {}, ["staff", "users"]);
}

function normalizeStaff(staff = {}) {
  const creator = staff.created_by || staff.creator || staff.createdBy || {};

  return {
    createdAt: staff.created_at || staff.createdAt || "",
    createdBy:
      staff.created_by_name ||
      staff.createdByName ||
      creator.full_name ||
      creator.name ||
      creator.email ||
      "Chưa cập nhật",
    email: staff.email || "",
    fullName: staff.full_name || staff.fullName || staff.name || "Staff",
    id: staff.id ?? staff.user_id ?? staff.userId,
    phone: staff.phone || "",
    raw: staff,
    status: String(staff.status || "active").toLowerCase(),
  };
}

function compactStaffPayload(form, isEditing) {
  const payload = {
    email: form.email,
    full_name: form.full_name,
    phone: form.phone,
    status: form.status,
  };

  if (!isEditing || form.password || form.password_confirmation) {
    payload.password = form.password;
    payload.password_confirmation = form.password_confirmation;
  }

  return payload;
}

function isBlocked(staff) {
  return ["blocked", "locked", "suspended"].includes(staff.status);
}

export default function StaffListPage() {
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalError, setModalError] = useState("");
  const [modalState, setModalState] = useState({ open: false, staff: null });
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [staff, setStaff] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    let ignored = false;

    async function loadStaff() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await adminService.getStaff();
        const nextStaff = readStaff(payload).map(normalizeStaff);

        if (!ignored) {
          setStaff(nextStaff);
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(getStatusErrorMessage(error, "Không thể tải danh sách staff."));
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      ignored = true;
    };
  }, [refreshKey]);

  const filteredStaff = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return staff;
    }

    return staff.filter((staffMember) =>
      [staffMember.fullName, staffMember.email, staffMember.phone]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, staff]);

  const closeModal = () => {
    if (saving) {
      return;
    }

    resetModal();
  };

  const resetModal = () => {
    setModalState({ open: false, staff: null });
    setModalError("");
    setValidationErrors({});
  };

  const openCreateModal = () => {
    setModalState({ open: true, staff: null });
    setModalError("");
    setValidationErrors({});
  };

  const openEditModal = (staffMember) => {
    setModalState({ open: true, staff: { ...staffMember.raw, id: staffMember.id } });
    setModalError("");
    setValidationErrors({});
  };

  const handleSubmit = async (form) => {
    const isEditing = Boolean(modalState.staff?.id);
    const payload = compactStaffPayload(form, isEditing);

    setSaving(true);
    setModalError("");
    setValidationErrors({});

    try {
      if (isEditing) {
        await adminService.updateStaff(modalState.staff.id, payload);
      } else {
        await adminService.createStaff(payload);
      }

      showToast(isEditing ? "Đã cập nhật staff." : "Đã thêm staff mới.", "success");
      resetModal();
      setRefreshKey((current) => current + 1);
    } catch (error) {
      if (isValidationError(error)) {
        setValidationErrors(getValidationErrors(error));
      } else {
        setModalError(getStatusErrorMessage(error, "Không thể lưu staff."));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staffMember) => {
    const nextStatus = isBlocked(staffMember) ? "active" : "blocked";

    setSavingId(staffMember.id);
    setErrorMessage("");

    try {
      await adminService.updateStaffStatus(staffMember.id, { status: nextStatus });
      showToast(
        nextStatus === "active" ? "Đã mở khóa staff." : "Đã khóa staff.",
        "success",
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(getStatusErrorMessage(error, "Không thể cập nhật trạng thái staff."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="admin-dashboard admin-management-page">
      <div className="admin-page-heading">
        <div>
          <h1>Staff</h1>
          <p>Quản lý tài khoản nhân viên và trạng thái truy cập dashboard.</p>
        </div>
        <button className="admin-primary-action" onClick={openCreateModal} type="button">
          Thêm staff
        </button>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      <div className="admin-table-wrap">
        <label className="admin-tab-search">
          <span>Tìm</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, email hoặc phone..."
            type="search"
            value={query}
          />
        </label>

        {loading ? <p className="muted-text">Đang tải danh sách staff...</p> : null}

        {!loading && filteredStaff.length === 0 ? (
          <div className="empty-state">
            <h2>Không có staff</h2>
            <p>Không tìm thấy nhân viên phù hợp.</p>
          </div>
        ) : null}

        {!loading && filteredStaff.length > 0 ? (
          <table className="admin-table staff-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Người tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember.id || staffMember.email}>
                  <td>
                    <strong>{staffMember.fullName}</strong>
                  </td>
                  <td>{staffMember.email || "Chưa cập nhật"}</td>
                  <td>{staffMember.phone || "Chưa cập nhật"}</td>
                  <td>
                    <StatusBadge value={staffMember.status} />
                  </td>
                  <td>{formatDate(staffMember.createdAt)}</td>
                  <td>{staffMember.createdBy}</td>
                  <td>
                    <button disabled={saving} onClick={() => openEditModal(staffMember)} type="button">
                      Sửa
                    </button>
                    <button
                      disabled={savingId === staffMember.id}
                      onClick={() => handleToggleStatus(staffMember)}
                      type="button"
                    >
                      {isBlocked(staffMember) ? "Mở khóa" : "Khóa"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {modalState.open ? (
        <StaffFormModal
          errorMessage={modalError}
          onClose={closeModal}
          onSubmit={handleSubmit}
          saving={saving}
          staff={modalState.staff}
          validationErrors={validationErrors}
        />
      ) : null}
    </section>
  );
}
