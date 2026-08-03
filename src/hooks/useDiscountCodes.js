import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/discountCodeApi";
import { normalizeDiscountCode, normalizeDiscountList } from "../utils/discountCodes";

export const discountKeys = { all:["admin","discount-codes"], detail:(id)=>["admin","discount-code",String(id)] };
export function useDiscountCodes(params) {
  return useQuery({ queryKey:[...discountKeys.all,params], queryFn:async()=>normalizeDiscountList(
    await api.getDiscountCodes(params), params.page, params.per_page) });
}
export function useDiscountCode(id) {
  return useQuery({ enabled:Boolean(id), queryKey:discountKeys.detail(id),
    queryFn:async()=>normalizeDiscountCode(await api.getDiscountCodeDetail(id)) });
}
export function useDiscountMutation(mutationFn) {
  const client=useQueryClient();
  return useMutation({ mutationFn, onSuccess:async()=>client.invalidateQueries({queryKey:discountKeys.all}) });
}
