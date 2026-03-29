import apiClient from "./apiClient";

export const getManufacturingOrders = (params = {}) =>
  apiClient.get("/manufacturing-orders", { params }).then((r) => r.data);

export const getManufacturingOrderById = (id) =>
  apiClient.get(`/manufacturing-orders/${id}`).then((r) => r.data);

export const createManufacturingOrder = (payload) =>
  apiClient.post("/manufacturing-orders", payload).then((r) => r.data);

export const updateManufacturingOrder = (id, payload) =>
  apiClient.put(`/manufacturing-orders/${id}`, payload).then((r) => r.data);

export const updateManufacturingOrderStatus = (id, status) =>
  apiClient.patch(`/manufacturing-orders/${id}/status`, { status }).then((r) => r.data);

export const deleteManufacturingOrder = (id) =>
  apiClient.delete(`/manufacturing-orders/${id}`).then((r) => r.data);

export default {
  getManufacturingOrders,
  getManufacturingOrderById,
  createManufacturingOrder,
  updateManufacturingOrder,
  updateManufacturingOrderStatus,
  deleteManufacturingOrder,
};
