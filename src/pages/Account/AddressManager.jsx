import { useCallback, useEffect, useState } from "react";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import { readCollection } from "../../services/api";
import { profileService } from "../../services/bstoreService";
import {
  getStatusErrorMessage,
  getValidationErrors,
  isValidationError,
} from "../../utils/apiErrors";
import AddressFormModal from "./AddressFormModal";

function normalizeAddress(address = {}) {
  return {
    address: address.address || "",
    district: address.district || "",
    id: address.id ?? address.address_id ?? address.addressId,
    isDefault: Boolean(address.is_default ?? address.isDefault),
    province: address.province || "",
    raw: address,
    receiverName: address.receiver_name || address.receiverName || "",
    receiverPhone: address.receiver_phone || address.receiverPhone || "",
    ward: address.ward || "",
  };
}

function formatAddress(address) {
  return [address.address, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");
}

export default function AddressManager() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalError, setModalError] = useState("");
  const [modalState, setModalState] = useState({ address: null, open: false });
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const payload = await profileService.getAddresses();
      setAddresses(readCollection(payload, ["addresses"]).map(normalizeAddress));
    } catch (error) {
      setErrorMessage(getStatusErrorMessage(error, "Không thể tải địa chỉ giao hàng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignored = false;

    async function loadInitialAddresses() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await profileService.getAddresses();
        const nextAddresses = readCollection(payload, ["addresses"]).map(normalizeAddress);

        if (!ignored) {
          setAddresses(nextAddresses);
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(
            getStatusErrorMessage(error, "Không thể tải địa chỉ giao hàng."),
          );
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadInitialAddresses();

    return () => {
      ignored = true;
    };
  }, []);

  const closeModal = () => {
    if (saving) {
      return;
    }

    resetModal();
  };

  const resetModal = () => {
    setModalState({ address: null, open: false });
    setModalError("");
    setValidationErrors({});
  };

  const openCreateModal = () => {
    setModalState({ address: null, open: true });
    setModalError("");
    setValidationErrors({});
  };

  const openEditModal = (address) => {
    setModalState({ address: { ...address.raw, id: address.id }, open: true });
    setModalError("");
    setValidationErrors({});
  };

  const handleSubmit = async (form) => {
    const editingAddress = modalState.address;

    setSaving(true);
    setModalError("");
    setValidationErrors({});

    try {
      if (editingAddress?.id) {
        await profileService.updateAddress(editingAddress.id, form);
      } else {
        await profileService.createAddress(form);
      }

      showToast("Lưu địa chỉ giao hàng thành công.", "success");
      resetModal();
      await loadAddresses();
    } catch (error) {
      if (isValidationError(error)) {
        setValidationErrors(getValidationErrors(error));
      } else {
        setModalError(getStatusErrorMessage(error, "Không thể lưu địa chỉ."));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address) => {
    if (!window.confirm("Xóa địa chỉ giao hàng này?")) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await profileService.deleteAddress(address.id);
      showToast("Đã xóa địa chỉ giao hàng.", "success");
      await loadAddresses();
    } catch (error) {
      setErrorMessage(getStatusErrorMessage(error, "Không thể xóa địa chỉ."));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (address) => {
    setSaving(true);
    setErrorMessage("");

    try {
      await profileService.setDefaultAddress(address.id);
      showToast("Đã đặt địa chỉ mặc định.", "success");
      await loadAddresses();
    } catch (error) {
      setErrorMessage(
        getStatusErrorMessage(error, "Không thể đặt địa chỉ mặc định."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-panel">
      <div className="account-panel-heading">
        <div>
          <h2>Địa chỉ giao hàng</h2>
          <p>Quản lý địa chỉ nhận hàng và địa chỉ mặc định.</p>
        </div>
        <button className="primary-button" onClick={openCreateModal} type="button">
          Thêm địa chỉ
        </button>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      {loading ? <p className="muted-text">Đang tải địa chỉ giao hàng...</p> : null}

      {!loading && addresses.length === 0 ? (
        <div className="empty-state">
          <h2>Chưa có địa chỉ giao hàng</h2>
          <p>Thêm địa chỉ để đặt hàng nhanh hơn trong lần mua tiếp theo.</p>
          <button className="primary-button" onClick={openCreateModal} type="button">
            Thêm địa chỉ
          </button>
        </div>
      ) : null}

      {!loading && addresses.length > 0 ? (
        <div className="address-grid">
          {addresses.map((address) => (
            <article className="address-card" key={address.id || formatAddress(address)}>
              <div>
                <strong>{address.receiverName || "Người nhận"}</strong>
                {address.isDefault ? (
                  <span className="status-badge status-badge--success">Mặc định</span>
                ) : null}
              </div>
              <p>{address.receiverPhone || "Chưa có số điện thoại"}</p>
              <p>{formatAddress(address) || "Chưa cập nhật địa chỉ"}</p>
              <div className="address-actions">
                <button disabled={saving} onClick={() => openEditModal(address)} type="button">
                  Sửa
                </button>
                {!address.isDefault ? (
                  <button
                    disabled={saving}
                    onClick={() => handleSetDefault(address)}
                    type="button"
                  >
                    Đặt mặc định
                  </button>
                ) : null}
                <button
                  className="danger-button"
                  disabled={saving}
                  onClick={() => handleDelete(address)}
                  type="button"
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {modalState.open ? (
        <AddressFormModal
          address={modalState.address}
          errorMessage={modalError}
          onClose={closeModal}
          onSubmit={handleSubmit}
          saving={saving}
          validationErrors={validationErrors}
        />
      ) : null}
    </section>
  );
}
