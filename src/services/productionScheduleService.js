import apiClient from "./apiClient";

export const getProductionSchedule = (params = {}) =>
  apiClient.get("/production-schedule", { params }).then((r) => r.data);

export const createScheduleEntry = (payload) =>
  apiClient.post("/production-schedule", payload).then((r) => r.data);

export const updateScheduleEntry = (id, payload) =>
  apiClient.put(`/production-schedule/${id}`, payload).then((r) => r.data);

export const deleteScheduleEntry = (id) =>
  apiClient.delete(`/production-schedule/${id}`).then((r) => r.data);

export default {
  getProductionSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
};
