import { getApiErrorMessage } from "../services/api";

export function getValidationErrors(error) {
  const data = error?.response?.data || {};
  const errors = data.errors || data.validation_errors || {};

  return Object.entries(errors).reduce((acc, [field, value]) => {
    if (Array.isArray(value)) {
      acc[field] = value.filter(Boolean).join(" ");
      return acc;
    }

    if (value && typeof value === "object") {
      acc[field] = Object.values(value).flat().filter(Boolean).join(" ");
      return acc;
    }

    acc[field] = String(value || "");
    return acc;
  }, {});
}

export function getFieldError(errors = {}, field) {
  return errors[field] || errors[`data.${field}`] || "";
}

export function getStatusErrorMessage(error, fallback) {
  const status = Number(error?.response?.status || 0);

  if (status === 403) {
    return "Bạn không có quyền truy cập.";
  }

  if (status === 404) {
    return "Không tìm thấy dữ liệu.";
  }

  return getApiErrorMessage(error, fallback);
}

export function isValidationError(error) {
  return Number(error?.response?.status || 0) === 422;
}
