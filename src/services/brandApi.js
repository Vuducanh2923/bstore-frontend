import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const toPayload = (request) => request.then(unwrapResponse);
const toBody = (request) => request.then((response) => response.data);

export const brandApi = {
  getBrands: () => toPayload(api.get(API_ENDPOINTS.brands.list)),
  getAdminBrands: (params) =>
    toBody(api.get(API_ENDPOINTS.admin.brands, { params })),
  createBrand: (payload) => toPayload(api.post(API_ENDPOINTS.admin.brands, payload)),
  updateBrand: (brandId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.brand(brandId), payload)),
  deleteBrand: (brandId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.brand(brandId))),
  toggleStatus: (brandId) =>
    toPayload(api.patch(API_ENDPOINTS.admin.brandToggleStatus(brandId))),
};

export default brandApi;
