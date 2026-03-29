import apiClient from "./apiClient";

export const getFinanceSummary = () =>
  apiClient.get("/finance/summary").then((r) => r.data);

export default { getFinanceSummary };
