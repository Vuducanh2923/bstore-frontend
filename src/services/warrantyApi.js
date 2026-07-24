import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const payload = (request) => request.then(unwrapResponse);

export const createWarrantyRequest = (data) =>
  payload(api.post(API_ENDPOINTS.customer.warrantyRequests, data, { suppressGlobalError: true }));
export const getCustomerWarrantyRequests = (params = {}) =>
  payload(api.get(API_ENDPOINTS.customer.warrantyRequests, { params, suppressGlobalError: true }));
export const getCustomerWarrantyRequestDetail = (id) =>
  payload(api.get(API_ENDPOINTS.customer.warrantyRequest(id), { suppressGlobalError: true }));
export const cancelWarrantyRequest = (id) =>
  payload(api.put(API_ENDPOINTS.customer.warrantyRequestCancel(id), {}, { suppressGlobalError: true }));
export const getAdminWarrantyRequests = (params = {}) =>
  payload(api.get(API_ENDPOINTS.admin.warrantyRequests, { params, suppressGlobalError: true }));
export const getAdminWarrantyRequestDetail = (id) =>
  payload(api.get(API_ENDPOINTS.admin.warrantyRequest(id), { suppressGlobalError: true }));
export const approveWarrantyRequest = (id, data = {}) =>
  payload(api.put(API_ENDPOINTS.admin.warrantyApprove(id), data, { suppressGlobalError: true }));
export const rejectWarrantyRequest = (id, data) =>
  payload(api.put(API_ENDPOINTS.admin.warrantyReject(id), data, { suppressGlobalError: true }));
export const markWarrantyProcessing = (id, data = {}) =>
  payload(api.put(API_ENDPOINTS.admin.warrantyProcessing(id), data, { suppressGlobalError: true }));
export const completeWarrantyRequest = (id, data = {}) =>
  payload(api.put(API_ENDPOINTS.admin.warrantyComplete(id), data, { suppressGlobalError: true }));
