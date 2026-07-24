import { formatWarrantyDate, WARRANTY_STATUSES } from "../../utils/warranty";

export default function WarrantyTimeline({ items = [] }) {
  if (!items.length) return null;
  return <ol className="processing-history-timeline warranty-timeline">
    {items.map((item, index) => <li key={item.id || index}>
      <time>{formatWarrantyDate(item.created_at || item.time, true)}</time>
      <strong>{item.label || WARRANTY_STATUSES[item.status] || item.status}</strong>
      {item.note ? <p>{item.note}</p> : null}
    </li>)}
  </ol>;
}
