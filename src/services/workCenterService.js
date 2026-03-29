import apiClient from "./apiClient";

export const getWorkCenters = (params = {}) =>
  apiClient.get("/work-centers", { params }).then((r) => r.data);

export const getWorkCenterById = (id) =>
  apiClient.get(`/work-centers/${id}`).then((r) => r.data);

export const createWorkCenter = (payload) =>
  apiClient.post("/work-centers", payload).then((r) => r.data);

export const updateWorkCenter = (id, payload) =>
  apiClient.put(`/work-centers/${id}`, payload).then((r) => r.data);

export const deleteWorkCenter = (id) =>
  apiClient.delete(`/work-centers/${id}`).then((r) => r.data);

export default {
  getWorkCenters,
  getWorkCenterById,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
};
