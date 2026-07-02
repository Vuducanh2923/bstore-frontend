import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const toPayload = (request) => request.then(unwrapResponse);

const orderApi = {
  createOrder: (payload) =>
    toPayload(api.post(API_ENDPOINTS.orders.create, payload)),
  getOrders: () => toPayload(api.get(API_ENDPOINTS.orders.list)),
  getOrder: (orderId) =>
    toPayload(api.get(API_ENDPOINTS.orders.detail(orderId))),
};

export { orderApi };
export default orderApi;
