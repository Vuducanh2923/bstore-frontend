import { WARRANTY_STATUSES } from "../../utils/warranty";

const tones = {
  pending: "warning", approved: "success", rejected: "danger",
  processing: "info", completed: "teal", cancelled: "neutral",
};
export default function WarrantyStatusBadge({ status, label }) {
  const value = String(status || "pending").toLowerCase();
  return <span className={`status-badge status-badge--${tones[value] || "neutral"}`}>
    {label || WARRANTY_STATUSES[value] || value}
  </span>;
}
