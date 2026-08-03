import { DISCOUNT_STATUSES } from "../../utils/discountCodes";
export default function DiscountStatusBadge({status}) {
  const value=String(status||"inactive").toLowerCase();
  const tone={active:"success",inactive:"neutral",expired:"danger"}[value]||"neutral";
  return <span className={`status-badge status-badge--${tone}`}>{DISCOUNT_STATUSES[value]||value}</span>;
}
