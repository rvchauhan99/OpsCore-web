import apiClient from "./apiClient";

// QC Templates
export const getQcTemplates = (params = {}) =>
  apiClient.get("/quality-control/templates", { params }).then((r) => r.data);

export const getQcTemplateById = (id) =>
  apiClient.get(`/quality-control/templates/${id}`).then((r) => r.data);

export const createQcTemplate = (payload) =>
  apiClient.post("/quality-control/templates", payload).then((r) => r.data);

export const updateQcTemplate = (id, payload) =>
  apiClient.put(`/quality-control/templates/${id}`, payload).then((r) => r.data);

export const deleteQcTemplate = (id) =>
  apiClient.delete(`/quality-control/templates/${id}`).then((r) => r.data);

// QC Checks
export const getQcChecks = (params = {}) =>
  apiClient.get("/quality-control/checks", { params }).then((r) => r.data);

export const getQcCheckById = (id) =>
  apiClient.get(`/quality-control/checks/${id}`).then((r) => r.data);

export const createQcCheck = (payload) =>
  apiClient.post("/quality-control/checks", payload).then((r) => r.data);

export const updateQcCheck = (id, payload) =>
  apiClient.put(`/quality-control/checks/${id}`, payload).then((r) => r.data);

export default {
  getQcTemplates,
  getQcTemplateById,
  createQcTemplate,
  updateQcTemplate,
  deleteQcTemplate,
  getQcChecks,
  getQcCheckById,
  createQcCheck,
  updateQcCheck,
};
