import apiClient from "./apiClient";

export const getBoms = (params = {}) =>
  apiClient.get("/bill-of-materials", { params }).then((r) => r.data);

export const getBomById = (id) =>
  apiClient.get(`/bill-of-materials/${id}`).then((r) => r.data);

export const createBom = (payload) =>
  apiClient.post("/bill-of-materials", payload).then((r) => r.data);

export const updateBom = (id, payload) =>
  apiClient.put(`/bill-of-materials/${id}`, payload).then((r) => r.data);

export const deleteBom = (id) =>
  apiClient.delete(`/bill-of-materials/${id}`).then((r) => r.data);

export const cloneBomVersion = (id) =>
  apiClient.post(`/bill-of-materials/${id}/clone`).then((r) => r.data);

export const computeBomCost = (id, payload = {}) =>
  apiClient.post(`/bill-of-materials/${id}/compute-cost`, payload).then((r) => r.data);

export default {
  getBoms,
  getBomById,
  createBom,
  updateBom,
  deleteBom,
  cloneBomVersion,
  computeBomCost,
};
