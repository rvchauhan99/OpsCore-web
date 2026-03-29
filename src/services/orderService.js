import apiClient from "./apiClient";
import b2bSalesOrderService from "./b2bSalesOrderService";

/**
 * Maps B2B sales order API payload to the legacy "sales order" shape still used by
 * delivery challan, warehouse queue, and some reports.
 */
export function mapB2bSalesOrderToLegacyOrderShape(apiResponse) {
    const d = apiResponse?.result ?? apiResponse;
    if (!d) return null;
    const client = d.client;
    const items = Array.isArray(d.items) ? d.items : [];
    const bom_snapshot = items.map((it) => {
        const p = it.product || {};
        const ordered = parseInt(it.quantity, 10) || 0;
        const shipped = Number(it.shipped_qty) || 0;
        const pending =
            it.pending_qty != null && !Number.isNaN(Number(it.pending_qty))
                ? Number(it.pending_qty)
                : Math.max(0, ordered - shipped);
        return {
            product_id: it.product_id,
            b2b_sales_order_item_id: it.id,
            quantity: ordered,
            planned_qty: ordered,
            shipped_qty: shipped,
            pending_qty: pending,
            returned_qty: Number(it.returned_qty) || 0,
            product_snapshot: {
                product_name: p.product_name,
                product_type_name: p.productType?.name,
                product_make_name: p.product_make_name,
                serial_required: !!p.serial_required,
                measurement_unit_name: p.measurementUnit?.unit || p.measurement_unit_name,
            },
        };
    });

    return {
        ...d,
        id: d.id,
        b2b_sales_order_id: d.id,
        order_number: d.order_no,
        customer_name: client?.client_name ?? null,
        project_cost: d.grand_total,
        order_date: d.order_date,
        planned_warehouse_id: d.planned_warehouse_id ?? d.plannedWarehouse?.id ?? null,
        planned_warehouse_name: d.plannedWarehouse?.name ?? null,
        handled_by_name: d.user?.name ?? null,
        bom_snapshot,
        status: d.status,
        quotation_id: d.quote_id,
    };
}

export async function getOrderById(id, options = {}) {
    const { signal } = options || {};
    const res = await apiClient.get(`/b2b-sales-orders/${id}`, { signal });
    const mapped = mapB2bSalesOrderToLegacyOrderShape(res.data);
    return { result: mapped };
}

export async function getPendingDeliveryOrders() {
    const res = await apiClient.get("/b2b-sales-orders/pending-delivery");
    const body = res.data;
    const rows = body?.result ?? body;
    return { result: Array.isArray(rows) ? rows : [] };
}

export async function downloadOrderPDF(id) {
    return b2bSalesOrderService.downloadB2bSalesOrderPDF(id);
}

export default {
    getOrderById,
    getPendingDeliveryOrders,
    downloadOrderPDF,
    mapB2bSalesOrderToLegacyOrderShape,
};
