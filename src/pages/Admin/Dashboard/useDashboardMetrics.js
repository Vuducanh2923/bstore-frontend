import { useMemo } from "react";
import { isRevenueOrder, isUserLocked } from "./adminDashboardShared";

export default function useDashboardMetrics({
  banners,
  customers,
  inventory,
  orders,
  revenueRange,
}) {
  return useMemo(() => {
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setDate(rangeStart.getDate() - revenueRange + 1);
    const revenueOrders = orders.filter((order) => {
      if (!isRevenueOrder(order)) return false;
      const createdAt = new Date(order.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= rangeStart;
    });
    const totalRevenue = revenueOrders.reduce(
      (sum, order) => sum + order.total,
      0,
    );
    const previousStart = new Date(rangeStart);
    previousStart.setDate(previousStart.getDate() - revenueRange);
    const previousRevenue = orders.reduce((sum, order) => {
      if (!isRevenueOrder(order)) return sum;
      const createdAt = new Date(order.createdAt);
      return !Number.isNaN(createdAt.getTime()) &&
        createdAt >= previousStart &&
        createdAt < rangeStart
        ? sum + order.total
        : sum;
    }, 0);
    const revenueChange =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;
    const bucketCount = revenueRange === 7 ? 7 : revenueRange === 30 ? 10 : 12;
    const bucketSize = Math.ceil(revenueRange / bucketCount);
    const revenueBars = Array.from({ length: bucketCount }, (_, index) => {
      const start = new Date(rangeStart);
      start.setDate(start.getDate() + index * bucketSize);
      const end = new Date(start);
      end.setDate(end.getDate() + bucketSize);
      const amount = revenueOrders.reduce((sum, order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= start && createdAt < end ? sum + order.total : sum;
      }, 0);

      return {
        amount,
        label: new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }).format(start),
      };
    });
    const maxRevenueBar = Math.max(...revenueBars.map((bar) => bar.amount), 0);
    const pendingOrders = orders.filter((order) =>
      ["pending", "processing", "confirmed"].includes(order.status),
    ).length;
    const shippedOrders = orders.filter((order) =>
      ["shipping", "shipped"].includes(order.status),
    ).length;
    const activeInventory = inventory.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    return {
      totalRevenue,
      revenueBars: revenueBars.map((bar) => ({
        ...bar,
        height: maxRevenueBar > 0
          ? Math.max(4, (bar.amount / maxRevenueBar) * 100)
          : 0,
      })),
      revenueChange,
      revenueOrders,
      pendingOrders,
      shippedOrders,
      activeInventory,
      activeBanners: banners.filter((banner) => banner.status).length,
      activeUsers: customers.filter((user) => !isUserLocked(user)).length,
    };
  }, [banners, customers, inventory, orders, revenueRange]);
}

