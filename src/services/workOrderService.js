import apiClient from "./apiClient";

export const getWorkOrders = (params = {}) =>
  apiClient.get("/work-orders", { params }).then((r) => r.data);

export const getWorkOrderById = (id) =>
  apiClient.get(`/work-orders/${id}`).then((r) => r.data);

export const createWorkOrder = (payload) =>
  apiClient.post("/work-orders", payload).then((r) => r.data);

export const updateWorkOrder = (id, payload) =>
  apiClient.put(`/work-orders/${id}`, payload).then((r) => r.data);

export const updateWorkOrderStatus = (id, status, notes) =>
  apiClient.patch(`/work-orders/${id}/status`, { status, notes }).then((r) => r.data);

export const deleteWorkOrder = (id) =>
  apiClient.delete(`/work-orders/${id}`).then((r) => r.data);

export default {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  updateWorkOrderStatus,
  deleteWorkOrder,
};
