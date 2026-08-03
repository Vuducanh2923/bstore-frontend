import DOMPurify from "dompurify";

const PRODUCT_DESCRIPTION_SANITIZE_OPTIONS = {
  FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "svg"],
  FORBID_ATTR: ["style"],
};

export function sanitizeProductDescription(html = "") {
  return DOMPurify.sanitize(String(html), PRODUCT_DESCRIPTION_SANITIZE_OPTIONS);
}
