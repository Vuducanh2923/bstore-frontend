import { useEffect, useMemo, useState } from "react";
import StatusMessage from "../../components/StatusMessage";
import { useToast } from "../../context/ToastContext";
import { profileService, uploadService } from "../../services/bstoreService";
import {
  getFieldError,
  getStatusErrorMessage,
  getValidationErrors,
  isValidationError,
} from "../../utils/apiErrors";
import { resolveMediaUrl } from "../../utils/formatters";

const PROFILE_FIELDS = [
  "full_name",
  "email",
  "phone",
  "gender",
  "date_of_birth",
  "address",
  "province",
  "district",
  "ward",
  "default_shipping_address",
];

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizeProfile(payload = {}) {
  return payload.profile || payload.user || payload.customer || payload.data || payload || {};
}

function createProfileForm(profile = {}) {
  return {
    address: profile.address || "",
    avatar: profile.avatar || profile.avatar_url || profile.avatarUrl || "",
    date_of_birth: toDateInputValue(profile.date_of_birth || profile.dateOfBirth),
    default_shipping_address:
      profile.default_shipping_address || profile.defaultShippingAddress || "",
    district: profile.district || "",
    email: profile.email || "",
    full_name: profile.full_name || profile.fullName || profile.name || "",
    gender: profile.gender || "",
    phone: profile.phone || "",
    province: profile.province || "",
    ward: profile.ward || "",
  };
}

function readUploadedImageUrl(payload = {}) {
  return (
    payload.image_url ||
    payload.imageUrl ||
    payload.url ||
    payload.secure_url ||
    payload.data?.image_url ||
    payload.data?.url ||
    ""
  );
}

function buildProfilePayload(form, avatar = form.avatar) {
  const payload = PROFILE_FIELDS.reduce((nextPayload, field) => {
    nextPayload[field] = form[field] ?? "";
    return nextPayload;
  }, {});

  if (avatar) {
    payload.avatar = avatar;
  }

  return payload;
}

function FieldError({ children }) {
  return children ? <small className="field-error">{children}</small> : null;
}

export default function ProfileForm() {
  const { showToast } = useToast();
  const [avatarFile, setAvatarFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState(() => createProfileForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    let ignored = false;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await profileService.getProfile();
        const profile = normalizeProfile(payload);

        if (!ignored) {
          setForm(createProfileForm(profile));
        }
      } catch (error) {
        if (!ignored) {
          setErrorMessage(
            getStatusErrorMessage(error, "Không thể tải thông tin tài khoản."),
          );
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignored = true;
    };
  }, []);

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return form.avatar ? resolveMediaUrl(form.avatar) : "";
  }, [avatarFile, form.avatar]);

  useEffect(() => {
    if (!avatarFile) {
      return undefined;
    }

    const previewUrl = avatarPreview;

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile, avatarPreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setValidationErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;

    setAvatarFile(file);
    setValidationErrors((current) => ({
      ...current,
      avatar: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setValidationErrors({});

    try {
      let avatar = form.avatar;

      if (avatarFile) {
        const uploadedImage = await uploadService.uploadImage(avatarFile);
        avatar = readUploadedImageUrl(uploadedImage);

        if (!avatar) {
          throw new Error("Không lấy được URL avatar sau khi upload.");
        }
      }

      const payload = buildProfilePayload(form, avatar);
      const updatedProfile = normalizeProfile(await profileService.updateProfile(payload));

      setForm(
        createProfileForm(
          Object.keys(updatedProfile).length ? updatedProfile : { ...form, avatar },
        ),
      );
      setAvatarFile(null);
      showToast("Cập nhật thông tin cá nhân thành công.", "success");
    } catch (error) {
      if (isValidationError(error)) {
        const nextErrors = getValidationErrors(error);
        setValidationErrors(nextErrors);

        if (nextErrors.email || nextErrors.phone) {
          setErrorMessage("Email hoặc số điện thoại đã tồn tại. Vui lòng kiểm tra lại.");
        }
      } else {
        setErrorMessage(
          getStatusErrorMessage(error, "Không thể cập nhật thông tin cá nhân."),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="account-panel">Đang tải thông tin cá nhân...</div>;
  }

  return (
    <form className="account-panel form-stack" onSubmit={handleSubmit}>
      <div className="account-panel-heading">
        <div>
          <h2>Thông tin cá nhân</h2>
          <p>Cập nhật hồ sơ và địa chỉ mặc định của tài khoản.</p>
        </div>
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      <StatusMessage tone="error">{errorMessage}</StatusMessage>

      <div className="account-avatar-editor">
        <div className="account-avatar-preview">
          {avatarPreview ? <img alt={form.full_name || "Avatar"} src={avatarPreview} /> : "BS"}
        </div>
        <label>
          Avatar
          <input accept="image/*" name="avatar" onChange={handleAvatarChange} type="file" />
          <FieldError>{getFieldError(validationErrors, "avatar")}</FieldError>
        </label>
      </div>

      <div className="account-form-grid">
        <label>
          Họ tên
          <input name="full_name" onChange={handleChange} required value={form.full_name} />
          <FieldError>{getFieldError(validationErrors, "full_name")}</FieldError>
        </label>
        <label>
          Email
          <input name="email" onChange={handleChange} required type="email" value={form.email} />
          <FieldError>{getFieldError(validationErrors, "email")}</FieldError>
        </label>
        <label>
          Số điện thoại
          <input name="phone" onChange={handleChange} value={form.phone} />
          <FieldError>{getFieldError(validationErrors, "phone")}</FieldError>
        </label>
        <label>
          Giới tính
          <select name="gender" onChange={handleChange} value={form.gender}>
            <option value="">Chưa cập nhật</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
          <FieldError>{getFieldError(validationErrors, "gender")}</FieldError>
        </label>
        <label>
          Ngày sinh
          <input
            name="date_of_birth"
            onChange={handleChange}
            type="date"
            value={form.date_of_birth}
          />
          <FieldError>{getFieldError(validationErrors, "date_of_birth")}</FieldError>
        </label>
        <label>
          Tỉnh/Thành phố
          <input name="province" onChange={handleChange} value={form.province} />
          <FieldError>{getFieldError(validationErrors, "province")}</FieldError>
        </label>
        <label>
          Quận/Huyện
          <input name="district" onChange={handleChange} value={form.district} />
          <FieldError>{getFieldError(validationErrors, "district")}</FieldError>
        </label>
        <label>
          Phường/Xã
          <input name="ward" onChange={handleChange} value={form.ward} />
          <FieldError>{getFieldError(validationErrors, "ward")}</FieldError>
        </label>
      </div>

      <label>
        Địa chỉ
        <textarea name="address" onChange={handleChange} rows="3" value={form.address} />
        <FieldError>{getFieldError(validationErrors, "address")}</FieldError>
      </label>
      <label>
        Địa chỉ giao hàng mặc định
        <textarea
          name="default_shipping_address"
          onChange={handleChange}
          rows="3"
          value={form.default_shipping_address}
        />
        <FieldError>
          {getFieldError(validationErrors, "default_shipping_address")}
        </FieldError>
      </label>
    </form>
  );
}
