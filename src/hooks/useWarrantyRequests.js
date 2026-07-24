import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as warrantyApi from "../services/warrantyApi";
import { normalizeWarranty, normalizeWarrantyList } from "../utils/warranty";

export const warrantyKeys = {
  customer: ["customer", "warranty-requests"],
  customerDetail: (id) => ["customer", "warranty-request", String(id)],
  admin: ["admin", "warranty-requests"],
  adminDetail: (id) => ["admin", "warranty-request", String(id)],
};

export function useCustomerWarranties(params) {
  return useQuery({
    queryKey: [...warrantyKeys.customer, params],
    queryFn: async () => normalizeWarrantyList(
      await warrantyApi.getCustomerWarrantyRequests(params), params.page, params.per_page,
    ),
  });
}
export function useCustomerWarrantyDetail(id) {
  return useQuery({
    enabled: Boolean(id), queryKey: warrantyKeys.customerDetail(id),
    queryFn: async () => normalizeWarranty(await warrantyApi.getCustomerWarrantyRequestDetail(id)),
  });
}
export function useAdminWarranties(params) {
  return useQuery({
    queryKey: [...warrantyKeys.admin, params],
    queryFn: async () => normalizeWarrantyList(
      await warrantyApi.getAdminWarrantyRequests(params), params.page, params.per_page,
    ),
  });
}
export function useAdminWarrantyDetail(id) {
  return useQuery({
    enabled: Boolean(id), queryKey: warrantyKeys.adminDetail(id),
    queryFn: async () => normalizeWarranty(await warrantyApi.getAdminWarrantyRequestDetail(id)),
  });
}
export function useWarrantyMutation(mutationFn) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: warrantyKeys.customer }),
      client.invalidateQueries({ queryKey: warrantyKeys.admin }),
      client.invalidateQueries({ queryKey: ["customer", "orders"] }),
      client.invalidateQueries({ queryKey: ["customer", "order"] }),
      client.invalidateQueries({ queryKey: ["admin", "warranty-request"] }),
      client.invalidateQueries({ queryKey: ["customer", "warranty-request"] }),
    ]),
  });
}
