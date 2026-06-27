import { useCallback, useEffect, useMemo, useState } from "react";
import StatusMessage from "../../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../../services/api";
import brandApi from "../../../services/brandApi";
import BrandFilter from "./BrandFilter";
import BrandForm from "./BrandForm";
import {
  ADMIN_BRAND_PAGE_SIZE,
  normalizeBrand,
  normalizeBrandPagination,
} from "./BrandService";
import BrandSearch from "./BrandSearch";
import BrandTable from "./BrandTable";

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function brandMatchesSearch(brand, search) {
  const query = normalizeSearchText(search);

  if (!query) {
    return true;
  }

  return [brand.name, brand.slug, brand.description, brand.status].some((value) =>
    normalizeSearchText(value).includes(query),
  );
}

function getBrandPayloadSource(payload) {
  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
}

export default function BrandPage() {
  const [brands, setBrands] = useState([]);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(() =>
    normalizeBrandPagination({}, 1),
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const payload = await brandApi.getAdminBrands({
        limit: ADMIN_BRAND_PAGE_SIZE,
        page,
        per_page: ADMIN_BRAND_PAGE_SIZE,
        search: search.trim() || undefined,
        status: status || undefined,
      });
      const source = getBrandPayloadSource(payload);
      const list = readCollection(source, ["brands"])
        .map(normalizeBrand)
        .filter((brand) => !status || brand.status === status)
        .filter((brand) => brandMatchesSearch(brand, search));

      setBrands(list);
      setPagination(normalizeBrandPagination(source, page));
    } catch (error) {
      setBrands([]);
      setPagination(normalizeBrandPagination({}, page));
      setMessage(getApiErrorMessage(error, "Không tải được danh sách nhãn hàng."));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timerId = window.setTimeout(loadBrands, 180);
    return () => window.clearTimeout(timerId);
  }, [loadBrands]);

  const pageSummary = useMemo(() => {
    if (!pagination.total) {
      return `${brands.length} nhãn hàng`;
    }

    const start = (pagination.currentPage - 1) * pagination.perPage + 1;
    const end = Math.min(
      pagination.total,
      start + Math.max(brands.length - 1, 0),
    );

    return `${start}-${end}/${pagination.total} nhãn hàng`;
  }, [brands.length, pagination]);

  const openCreateForm = () => {
    setEditingBrand(null);
    setFormOpen(true);
  };

  const openEditForm = (brand) => {
    setEditingBrand(brand);
    setFormOpen(true);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleSaveBrand = async (payload) => {
    setSaving(true);
    setMessage("");

    try {
      if (editingBrand?.id) {
        await brandApi.updateBrand(editingBrand.id, payload);
        setMessage("Đã cập nhật nhãn hàng.");
      } else {
        await brandApi.createBrand(payload);
        setMessage("Đã thêm nhãn hàng.");
      }

      setFormOpen(false);
      setEditingBrand(null);
      await loadBrands();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Không lưu được nhãn hàng."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (brand) => {
    if (!brand?.id || !window.confirm(`Xóa nhãn hàng "${brand.name}"?`)) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await brandApi.deleteBrand(brand.id);
      setMessage("Đã xóa nhãn hàng.");
      await loadBrands();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Không xóa được nhãn hàng."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (brand) => {
    if (!brand?.id) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await brandApi.toggleStatus(brand.id);
      setMessage(brand.active ? "Đã khóa nhãn hàng." : "Đã mở khóa nhãn hàng.");
      await loadBrands();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Không đổi được trạng thái nhãn hàng."));
    } finally {
      setSaving(false);
    }
  };

  const canGoPrevious = pagination.currentPage > 1;
  const canGoNext = pagination.currentPage < pagination.lastPage;

  return (
    <section className="admin-dashboard admin-dashboard--brands brand-admin-page">
      <div className="admin-page-heading">
        <div>
          <h1>Quản lý nhãn hàng</h1>
          <p>Quản lý logo, mô tả và trạng thái thương hiệu hiển thị trên BStore.</p>
        </div>
        <button
          className="admin-primary-action"
          disabled={saving}
          onClick={openCreateForm}
          type="button"
        >
          + Thêm
        </button>
      </div>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <div className="brand-admin-toolbar">
        <BrandSearch onChange={handleSearchChange} value={search} />
        <BrandFilter onChange={handleStatusChange} value={status} />
      </div>

      <BrandTable
        brands={brands}
        loading={loading}
        onDelete={handleDeleteBrand}
        onEdit={openEditForm}
        onToggleStatus={handleToggleStatus}
      />

      <div className="admin-pagination brand-pagination">
        <span>{pageSummary}</span>
        <div>
          <button
            disabled={!canGoPrevious || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Truoc
          </button>
          <span>
            Trang {pagination.currentPage}/{pagination.lastPage}
          </span>
          <button
            disabled={!canGoNext || loading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      </div>

      {formOpen ? (
        <BrandForm
          brand={editingBrand}
          onClose={() => {
            setFormOpen(false);
            setEditingBrand(null);
          }}
          onSubmit={handleSaveBrand}
          saving={saving}
        />
      ) : null}
    </section>
  );
}
