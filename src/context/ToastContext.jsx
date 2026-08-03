/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_ERROR_EVENT } from "../services/api";

const ToastContext = createContext(null);
const TOAST_DURATION = 4500;
const TOAST_EXIT_DURATION = 280;
const TOAST_META = {
  success: { icon: "✓", title: "Thành công" },
  error: { icon: "!", title: "Có lỗi xảy ra" },
  warning: { icon: "!", title: "Lưu ý" },
  info: { icon: "i", title: "Thông báo" },
};
const VIETNAMESE_MESSAGES = new Map([
  ["saved successfully", "Lưu thành công."],
  ["deleted successfully", "Xóa thành công."],
  ["updated successfully", "Cập nhật thành công."],
  ["login successful", "Đăng nhập thành công."],
  ["register successful", "Đăng ký thành công."],
  ["payment successful", "Thanh toán thành công."],
  ["something went wrong", "Đã xảy ra lỗi."],
  ["network error", "Không thể kết nối tới máy chủ."],
  ["request failed", "Yêu cầu không thành công."],
  ["loading...", "Đang xử lý..."],
  ["error", "Đã xảy ra lỗi."],
]);

function localizeToastMessage(message) {
  const text = String(message || "").trim();
  const normalized = text.toLowerCase().replace(/[.!]+$/, "");
  return VIETNAMESE_MESSAGES.get(text.toLowerCase()) ||
    VIETNAMESE_MESSAGES.get(normalized) || text || "Đã xảy ra lỗi.";
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.map((toast) =>
      toast.id === id ? { ...toast, exiting: true } : toast));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_EXIT_DURATION);
  }, []);

  const showToast = useCallback(
    (message, type = "info", options = {}) => {
      const id = `${Date.now()}-${Math.random()}`;
      const localizedMessage = localizeToastMessage(message);
      setToasts((current) => {
        const dedupeKey = options.dedupeKey || `${type}:${localizedMessage}`;
        if (current.some((toast) => toast.dedupeKey === dedupeKey)) return current;
        return [...current, {
          id,
          message: localizedMessage,
          type,
          dedupeKey,
          retry: options.retry,
        }];
      });
      window.setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast],
  );

  useEffect(() => {
    const handleApiError = (event) => {
      const message = event.detail?.message;

      if (message) {
        showToast(message, event.detail?.type || "error", {
          dedupeKey: event.detail?.dedupeKey,
          retry: event.detail?.retry,
        });
      }
    };

    window.addEventListener(API_ERROR_EVENT, handleApiError);
    return () => window.removeEventListener(API_ERROR_EVENT, handleApiError);
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <button
            className={`toast toast--${toast.type}${toast.exiting ? " toast--exiting" : ""}`}
            key={toast.id}
            aria-label={toast.retry ? `${toast.message} Thử lại` : undefined}
            onClick={() => {
              removeToast(toast.id);
              if (toast.retry) Promise.resolve(toast.retry()).catch(() => {});
            }}
            type="button"
          >
            <span className="toast__icon" aria-hidden="true">
              {(TOAST_META[toast.type] || TOAST_META.info).icon}
            </span>
            <span className="toast__content">
              <strong>{(TOAST_META[toast.type] || TOAST_META.info).title}</strong>
              <span>{toast.message}</span>
              {toast.retry ? <em>Nhấn để thử lại</em> : null}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
