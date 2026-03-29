/**
 * Calls home dashboard endpoints (/home/...) used by Operations Dashboard.
 * OpsCore: solar `order` pipeline was removed; API returns zeroed / empty shapes until
 * manufacturing KPIs are implemented.
 */
import apiClient from "./apiClient";

function paramsFromFilters(filters = {}) {
  const out = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export default {
  getOrdersDashboardKpis(filters, dashboardApiBase = "/home") {
    return apiClient
      .get(`${dashboardApiBase}/dashboard-kpis`, { params: paramsFromFilters(filters) })
      .then((r) => r.data);
  },

  getOrdersDashboardPipeline(filters, dashboardApiBase = "/home") {
    return apiClient
      .get(`${dashboardApiBase}/dashboard-pipeline`, { params: paramsFromFilters(filters) })
      .then((r) => r.data);
  },

  getOrdersDashboardTrend(filters, dashboardApiBase = "/home") {
    return apiClient
      .get(`${dashboardApiBase}/dashboard-trend`, { params: paramsFromFilters(filters) })
      .then((r) => r.data);
  },

  getOrdersDashboardOrders(filters, dashboardApiBase = "/home") {
    return apiClient
      .get(`${dashboardApiBase}/dashboard-orders`, { params: paramsFromFilters(filters) })
      .then((r) => r.data);
  },

  /** Not implemented for OpsCore stub dashboard. */
  exportOrders() {
    return Promise.reject(new Error("Export is not available for this dashboard."));
  },
};
