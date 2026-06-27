import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../../../components/BrandCard";
import {
  createBrandPayload,
  validateBrandLogoFile,
} from "./BrandService";

function createFormState(brand) {
  return {
    description: brand?.description || "",
    logoUrl: brand?.logo || "",
    name: brand?.name || "",
    status: brand?.active === false ? "inactive" : "active",
  };
}

export default function BrandForm({
  brand,
  onClose,
  onSubmit,
  saving,
}) {
  const [form, setForm] = useState(() => createFormState(brand));
  const [logoFile, setLogoFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const previewBrand = useMemo(
    () => ({
      logo: localPreviewUrl || form.logoUrl,
      name: form.name || "Brand",
    }),
    [form.logoUrl, form.name, localPreviewUrl],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleLogoFile = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = validateBrandLogoFile(file);

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    if (validationError) {
      setLogoFile(null);
      setLocalPreviewUrl("");
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");
    setLogoFile(file);
    setLocalPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setError("Tên nhãn hàng là bắt buộc.");
      return;
    }

    setError("");
    onSubmit(createBrandPayload({ ...form, name }, logoFile));
  };

  return (
    <div className="brand-form-backdrop" role="presentation">
      <form className="admin-form brand-form-drawer" onSubmit={handleSubmit}>
        <div className="brand-form-heading">
          <div>
            <span>Brand</span>
            <h2>{brand ? "Sửa nhãn hàng" : "Thêm nhãn hàng"}</h2>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            x
          </button>
        </div>

        {error ? <p className="admin-helper-text brand-form-error">{error}</p> : null}

        <label>
          Tên nhãn hàng
          <input
            name="name"
            onChange={handleChange}
            required
            value={form.name}
          />
        </label>

        <label>
          Logo URL
          <input
            name="logoUrl"
            onChange={handleChange}
            placeholder="https://... hoặc storage/brands/logo.png"
            value={form.logoUrl}
          />
        </label>

        <label>
          Tải Logo lên
          <input
            accept=".jpg,.jpeg,.png,.svg,.webp,image/jpeg,image/png,image/svg+xml,image/webp"
            onChange={handleLogoFile}
            type="file"
          />
        </label>

        <div className="brand-logo-preview">
          <BrandLogo brand={previewBrand} />
          <span>Xem trước Logo</span>
        </div>

        <label>
          Mô tả
          <textarea
            name="description"
            onChange={handleChange}
            rows="4"
            value={form.description}
          />
        </label>

        <label>
          Trạng thái
          <select name="status" onChange={handleChange} value={form.status}>
            <option value="active">Đang hiển thị</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </label>

        <div className="brand-form-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Đang lưu..." : "Lưu nhãn hàng"}
          </button>
        </div>
      </form>
    </div>
  );
}
