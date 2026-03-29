import apiClient from "./apiClient";

/**
 * Legacy quotation PDF templates (solar-era). OpsCore B2B does not expose this API yet.
 * Stub keeps company profile branch dialog from breaking the build.
 */
export async function listTemplates() {
  try {
    const r = await apiClient.get("/quotation-templates");
    return r.data;
  } catch {
    return { result: [] };
  }
}

export default { listTemplates };
