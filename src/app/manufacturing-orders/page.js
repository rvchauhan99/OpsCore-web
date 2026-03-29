"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  IconTrash,
  IconPencil,
  IconFileDescription,
  IconClipboardList,
  IconPlayerPlay,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import manufacturingOrderService from "@/services/manufacturingOrderService";

const STATUS_COLORS = {
  draft: "secondary",
  released: "outline",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

const PRIORITY_COLORS = {
  low: "secondary",
  normal: "outline",
  high: "default",
  urgent: "destructive",
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "released", label: "Released" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function ManufacturingOrderForm({ defaultValues = {}, onSubmit, onCancel, loading, serverError }) {
  const [form, setForm] = useState({
    product_id: defaultValues.product_id || "",
    bom_id: defaultValues.bom_id || "",
    sales_order_id: defaultValues.sales_order_id || "",
    planned_qty: defaultValues.planned_qty || "1",
    priority: defaultValues.priority || "normal",
    planned_start: defaultValues.planned_start || "",
    planned_end: defaultValues.planned_end || "",
    notes: defaultValues.notes || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const baseInput = "w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      product_id: form.product_id ? parseInt(form.product_id) : null,
      bom_id: form.bom_id ? parseInt(form.bom_id) : null,
      sales_order_id: form.sales_order_id ? parseInt(form.sales_order_id) : null,
      planned_qty: parseFloat(form.planned_qty) || 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {serverError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Product ID *</label>
          <input className={baseInput} type="number" value={form.product_id} onChange={(e) => set("product_id", e.target.value)} required placeholder="Product ID" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">BOM ID</label>
          <input className={baseInput} type="number" value={form.bom_id} onChange={(e) => set("bom_id", e.target.value)} placeholder="BOM ID (optional)" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned Qty *</label>
          <input className={baseInput} type="number" step="0.01" value={form.planned_qty} onChange={(e) => set("planned_qty", e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Priority</label>
          <select className={baseInput} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned Start</label>
          <input className={baseInput} type="date" value={form.planned_start} onChange={(e) => set("planned_start", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned End</label>
          <input className={baseInput} type="date" value={form.planned_end} onChange={(e) => set("planned_end", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Sales Order ID</label>
          <input className={baseInput} type="number" value={form.sales_order_id} onChange={(e) => set("sales_order_id", e.target.value)} placeholder="SO link (optional)" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea className={baseInput} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}

export default function ManufacturingOrdersPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};

  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: ["search", "status", "priority"] });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [statusUpdate, setStatusUpdate] = useState({ open: false, record: null, status: null });

  const filterParams = useMemo(
    () => Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")),
    [filters]
  );

  const fetcher = useCallback(async (params) => {
    const res = await manufacturingOrderService.getManufacturingOrders({ ...params, ...filterParams });
    const r = res?.result ?? res;
    return {
      data: r?.data ?? [],
      meta: { total: r?.total ?? 0, page: params.page, pages: 0, limit: params.limit },
    };
  }, [filterParams, reloadTrigger]);

  const handleStatusChange = async (record, newStatus) => {
    try {
      await manufacturingOrderService.updateManufacturingOrderStatus(record.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      setReloadTrigger((p) => p + 1);
      if (selectedRecord?.id === record.id) {
        setSelectedRecord((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (editRecord?.id) {
        await manufacturingOrderService.updateManufacturingOrder(editRecord.id, payload);
        toast.success("Manufacturing Order updated");
      } else {
        await manufacturingOrderService.createManufacturingOrder(payload);
        toast.success("Manufacturing Order created");
      }
      setShowModal(false);
      setEditRecord(null);
      setReloadTrigger((p) => p + 1);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await manufacturingOrderService.deleteManufacturingOrder(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      toast.success("Manufacturing Order deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(() => [
    {
      field: "mo_number",
      label: "MO Number",
      sortable: true,
      render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{row.mo_number}</code>,
    },
    {
      field: "product",
      label: "Product",
      render: (row) => <span className="text-sm font-medium">{row.product?.name || `Product #${row.product_id}`}</span>,
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={STATUS_COLORS[row.status] || "secondary"} className="text-xs capitalize">
          {row.status?.replace("_", " ")}
        </Badge>
      ),
    },
    {
      field: "priority",
      label: "Priority",
      render: (row) => (
        <Badge variant={PRIORITY_COLORS[row.priority] || "secondary"} className="text-xs capitalize">
          {row.priority}
        </Badge>
      ),
    },
    {
      field: "planned_qty",
      label: "Qty",
      render: (row) => (
        <span className="text-sm">{parseFloat(row.produced_qty || 0).toFixed(0)} / {parseFloat(row.planned_qty || 0).toFixed(0)}</span>
      ),
    },
    {
      field: "planned_start",
      label: "Dates",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.planned_start ? formatDate(row.planned_start) : "—"} → {row.planned_end ? formatDate(row.planned_end) : "—"}
        </span>
      ),
    },
    {
      field: "actions",
      label: "Actions",
      isActionColumn: true,
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedRecord(row); setSidebarOpen(true); }}>
            <IconFileDescription className="size-4" />
          </Button>
          {perm.can_update && row.status === "draft" && (
            <Button variant="ghost" size="icon" className="size-8 text-blue-600" title="Release" onClick={() => handleStatusChange(row, "released")}>
              <IconPlayerPlay className="size-4" />
            </Button>
          )}
          {perm.can_update && row.status === "released" && (
            <Button variant="ghost" size="icon" className="size-8 text-orange-500" title="Start" onClick={() => handleStatusChange(row, "in_progress")}>
              <IconPlayerPlay className="size-4" />
            </Button>
          )}
          {perm.can_update && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditRecord(row); setServerError(null); setShowModal(true); }}>
              <IconPencil className="size-4" />
            </Button>
          )}
          {perm.can_delete && (
            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setRecordToDelete(row); setDeleteDialogOpen(true); }}>
              <IconTrash className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [perm, handleStatusChange]);

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="space-y-3 pr-1">
        <div className="flex items-center gap-2">
          <IconClipboardList className="size-5 text-primary" />
          <p className="font-semibold">{r.mo_number}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={STATUS_COLORS[r.status]}>{r.status?.replace("_", " ")}</Badge>
          <Badge variant={PRIORITY_COLORS[r.priority]}>{r.priority}</Badge>
        </div>
        {[
          ["Product", r.product?.name || `#${r.product_id}`],
          ["BOM", r.bom ? `${r.bom.name} v${r.bom.version}` : "—"],
          ["Qty", `${r.produced_qty ?? 0} of ${r.planned_qty}`],
          ["Planned Start", r.planned_start ? formatDate(r.planned_start) : "—"],
          ["Planned End", r.planned_end ? formatDate(r.planned_end) : "—"],
          ["Actual Start", r.actual_start ? formatDate(r.actual_start) : "—"],
          ["Actual End", r.actual_end ? formatDate(r.actual_end) : "—"],
          ["Notes", r.notes || "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="text-sm">{value}</p>
          </div>
        ))}
        {r.workOrders?.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Work Orders ({r.workOrders.length})</p>
            <div className="space-y-1">
              {r.workOrders.map((wo) => (
                <div key={wo.id} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/40">
                  <code className="text-xs">{wo.wo_number}</code>
                  <Badge variant="secondary" className="text-xs">{wo.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [selectedRecord]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Manufacturing Orders"
        addButtonLabel={perm.can_create ? "New MO" : undefined}
        onAddClick={perm.can_create ? () => { setEditRecord(null); setServerError(null); setShowModal(true); } : undefined}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 150px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy={sortBy || "created_at"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zero) => setPage(zero + 1)}
            onRowsPerPageChange={setLimit}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zero) => setPage(zero + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100]}
          />
        </div>

        <DetailsSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setSelectedRecord(null); }} title="MO Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); setEditRecord(null); setServerError(null); } }}>
          <DialogContent className="max-w-xl w-full">
            <div className="pb-2">
              <DialogTitle>{editRecord?.id ? "Edit Manufacturing Order" : "New Manufacturing Order"}</DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ManufacturingOrderForm
                defaultValues={editRecord || {}}
                onSubmit={handleFormSubmit}
                onCancel={() => { setShowModal(false); setEditRecord(null); setServerError(null); }}
                loading={submitting}
                serverError={serverError}
              />
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Manufacturing Order</AlertDialogTitle>
              <AlertDialogDescription>
                Delete <strong>{recordToDelete?.mo_number}</strong>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="sm" loading={deleting} onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
