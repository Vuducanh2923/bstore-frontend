import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const payload = (request) => request.then(unwrapResponse);
const quiet = { suppressGlobalError: true };

export const getDiscountCodes = (params = {}) =>
  api.get(API_ENDPOINTS.admin.discountCodes, { ...quiet, params }).then((response) => response.data);
export const getDiscountCodeDetail = (id) =>
  payload(api.get(API_ENDPOINTS.admin.discountCode(id), quiet));
export const createDiscountCode = (data) =>
  payload(api.post(API_ENDPOINTS.admin.discountCodes, data, quiet));
export const deleteDiscountCode = (id) =>
  payload(api.delete(API_ENDPOINTS.admin.discountCode(id), quiet));
export const deactivateDiscountCode = (id) =>
  payload(api.put(API_ENDPOINTS.admin.discountCodeDeactivate(id), {}, quiet));
export const previewDiscountCode = (data) =>
  payload(api.post(API_ENDPOINTS.customer.discountPreview, data, quiet));
