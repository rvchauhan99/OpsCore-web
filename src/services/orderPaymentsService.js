/**
 * Legacy solar ERP order payment receipts are not part of OpsCore.
 * B2B collections use invoices / shipments; extend this module when a receipt PDF endpoint exists.
 */
export async function downloadReceiptPDF() {
    throw new Error("Payment receipts for legacy orders are not available. Use B2B invoices where applicable.");
}

export default {
    downloadReceiptPDF,
};
