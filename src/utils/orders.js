import { readCollection } from "../services/api";

export function displayText(value, fallback = "") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.label ||
      value.title ||
      value.method ||
      value.code ||
      fallback
    );
  }

  return fallback;
}

export function readOrder(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const candidates = [
    payload.order,
    payload.data?.order,
    payload.data?.data?.order,
    payload.data?.data,
    payload.data,
    payload,
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate && typeof candidate === "object" && !Array.isArray(candidate),
    ) || {}
  );
}

function firstPresent(values = []) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

export function getOrderId(payload = {}) {
  const order = readOrder(payload);

  return firstPresent([
    order.id,
    order.order_id,
    order.orderId,
    order.uuid,
    order._id,
    payload.id,
    payload.order_id,
    payload.orderId,
  ]);
}

export function getOrderCode(payload = {}) {
  const order = readOrder(payload);

  return firstPresent([
    order.order_code,
    order.orderCode,
    order.code,
    order.order_number,
    order.orderNumber,
    payload.order_code,
    payload.orderCode,
    payload.code,
    getOrderId(order),
  ]);
}

export function formatAddressValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return [
      value.address,
      value.street,
      value.ward,
      value.district,
      value.province,
      value.city,
    ].filter(Boolean).join(", ");
  }

  return "";
}

export function getOrderItems(payload = {}) {
  const order = readOrder(payload);

  if (Array.isArray(order.order_items)) {
    return order.order_items;
  }

  if (Array.isArray(order.orderItems)) {
    return order.orderItems;
  }

  if (Array.isArray(order.items)) {
    return order.items;
  }

  const containers = [
    order.items,
    order.order_items,
    order.orderItems,
    order.data,
    order.data?.items,
    order.data?.order_items,
    order.data?.orderItems,
  ];

  for (const container of containers) {
    const items = readCollection(container, ["order_items", "orderItems", "items"]);

    if (items.length) {
      return items;
    }
  }

  return [];
}

export function normalizeOrderItem(item = {}) {
  const product = item.product || item.product_variant?.product || {};
  const variant = item.product_variant || item.variant || {};
  const quantity = Number(item.quantity || item.qty || 0);
  const price = Number(
    item.price || item.unit_price || item.unitPrice || variant.price || 0,
  );

  return {
    color: displayText(item.color || variant.color, ""),
    price,
    productName: displayText(
      item.product_name ||
        item.productName ||
        product.name ||
        variant.product_name,
      "Sản phẩm",
    ),
    quantity,
    ram: displayText(item.ram || variant.ram, ""),
    storage: displayText(item.storage || variant.storage, ""),
    subtotal: Number(item.subtotal || item.total || price * quantity),
  };
}

export function getReceiver(payload = {}) {
  const order = readOrder(payload);
  const customer = order.customer || {};
  const shippingAddress =
    order.shipping_address ||
    order.shippingAddress ||
    order.delivery_address ||
    order.deliveryAddress ||
    order.address ||
    order.receiver_address ||
    order.receiverAddress ||
    order.user_address ||
    order.userAddress ||
    "";

  return {
    address: formatAddressValue(shippingAddress),
    name: displayText(
      order.receiver_name ||
        order.receiverName ||
        order.shipping_name ||
        order.shippingName ||
        order.customer_name ||
        customer.full_name ||
        customer.name,
      "",
    ),
    phone: displayText(
      order.receiver_phone ||
        order.receiverPhone ||
        order.shipping_phone ||
        order.shippingPhone ||
        order.customer_phone ||
        customer.phone,
      "",
    ),
  };
}

export function getOrderTotals(payload = {}) {
  const order = readOrder(payload);
  const total = Number(order.total_amount || order.totalAmount || order.total || 0);
  const discount = Number(order.discount_amount || order.discountAmount || order.discount || 0);
  const finalAmount = Number(
    order.final_amount ||
      order.finalAmount ||
      order.grand_total ||
      order.grandTotal ||
      total,
  );

  return {
    discount,
    finalAmount,
    total,
  };
}

export function getPaymentMethod(payload = {}) {
  const order = readOrder(payload);

  return displayText(
    order.payment_method ||
      order.paymentMethod ||
      order.payment?.method ||
      order.payment?.name ||
      order.payment,
    "Chưa cập nhật",
  );
}
