"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  IconTrash,
  IconPencil,
  IconFileDescription,
  IconTools,
  IconPlayerPlay,
  IconCheck,
  IconShieldCheck,
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
import workOrderService from "@/services/workOrderService";

const STATUS_COLORS = {
  pending: "secondary",
  in_progress: "default",
  completed: "default",
  qc_pending: "outline",
  qc_passed: "default",
  rejected: "destructive",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "qc_pending", label: "QC Pending" },
  { value: "qc_passed", label: "QC Passed" },
  { value: "rejected", label: "Rejected" },
];

function WorkOrderForm({ defaultValues = {}, onSubmit, onCancel, loading, serverError }) {
  const [form, setForm] = useState({
    manufacturing_order_id: defaultValues.manufacturing_order_id || "",
    work_center_id: defaultValues.work_center_id || "",
    routing_step_id: defaultValues.routing_step_id || "",
    planned_qty: defaultValues.planned_qty || "1",
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
      manufacturing_order_id: form.manufacturing_order_id ? parseInt(form.manufacturing_order_id) : null,
      work_center_id: form.work_center_id ? parseInt(form.work_center_id) : null,
      routing_step_id: form.routing_step_id ? parseInt(form.routing_step_id) : null,
      planned_qty: parseFloat(form.planned_qty) || 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {serverError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Manufacturing Order ID *</label>
          <input className={baseInput} type="number" value={form.manufacturing_order_id} onChange={(e) => set("manufacturing_order_id", e.target.value)} required placeholder="MO ID" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned Qty *</label>
          <input className={baseInput} type="number" step="0.01" value={form.planned_qty} onChange={(e) => set("planned_qty", e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Work Center ID</label>
          <input className={baseInput} type="number" value={form.work_center_id} onChange={(e) => set("work_center_id", e.target.value)} placeholder="Station / Machine ID" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Routing Step ID</label>
          <input className={baseInput} type="number" value={form.routing_step_id} onChange={(e) => set("routing_step_id", e.target.value)} placeholder="BOM Routing Step ID" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned Start</label>
          <input className={baseInput} type="date" value={form.planned_start} onChange={(e) => set("planned_start", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Planned End</label>
          <input className={baseInput} type="date" value={form.planned_end} onChange={(e) => set("planned_end", e.target.value)} />
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

export default function WorkOrdersPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};

  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: ["search", "status"] });
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

  const filterParams = useMemo(
    () => Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")),
    [filters]
  );

  const fetcher = useCallback(async (params) => {
    const res = await workOrderService.getWorkOrders({ ...params, ...filterParams });
    const r = res?.result ?? res;
    return {
      data: r?.data ?? [],
      meta: { total: r?.total ?? 0, page: params.page, pages: 0, limit: params.limit },
    };
  }, [filterParams, reloadTrigger]);

  const handleStatusChange = async (record, newStatus) => {
    try {
      await workOrderService.updateWorkOrderStatus(record.id, newStatus, "");
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
        await workOrderService.updateWorkOrder(editRecord.id, payload);
        toast.success("Work Order updated");
      } else {
        await workOrderService.createWorkOrder(payload);
        toast.success("Work Order created");
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
      await workOrderService.deleteWorkOrder(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      toast.success("Work Order deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(() => [
    {
      field: "wo_number",
      label: "WO Number",
      sortable: true,
      render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{row.wo_number}</code>,
    },
    {
      field: "mo",
      label: "MO Link",
      render: (row) => (
        <span className="text-sm font-medium">{row.manufacturingOrder?.mo_number || `MO #${row.manufacturing_order_id}`}</span>
      ),
    },
    {
      field: "work_center",
      label: "Work Center",
      render: (row) => (
        <span className="text-sm">{row.workCenter?.name || `WC #${row.work_center_id}`}</span>
      ),
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
      field: "planned_qty",
      label: "Qty",
      render: (row) => (
        <span className="text-sm text-center block">
          {parseFloat(row.completed_qty || 0).toFixed(0)} / {parseFloat(row.planned_qty || 0).toFixed(0)}
          {parseFloat(row.rejected_qty) > 0 && <span className="text-destructive ml-1">(-{parseFloat(row.rejected_qty).toFixed(0)})</span>}
        </span>
      ),
    },
    {
      field: "actions",
      label: "Actions",
      isActionColumn: true,
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedRecord(row); setSidebarOpen(true); }} title="View Details">
            <IconFileDescription className="size-4" />
          </Button>
          {perm.can_update && row.status === "pending" && (
            <Button variant="ghost" size="icon" className="size-8 text-orange-500" title="Start Operation" onClick={() => handleStatusChange(row, "in_progress")}>
              <IconPlayerPlay className="size-4" />
            </Button>
          )}
          {perm.can_update && row.status === "in_progress" && (
            <Button variant="ghost" size="icon" className="size-8 text-blue-600" title="Request QC" onClick={() => handleStatusChange(row, "qc_pending")}>
              <IconShieldCheck className="size-4" />
            </Button>
          )}
          {perm.can_update && row.status === "in_progress" && (
            <Button variant="ghost" size="icon" className="size-8 text-emerald-600" title="Complete" onClick={() => handleStatusChange(row, "completed")}>
              <IconCheck className="size-4" />
            </Button>
          )}
          {perm.can_update && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditRecord(row); setServerError(null); setShowModal(true); }}>
              <IconPencil className="size-4" />
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
          <IconTools className="size-5 text-primary" />
          <p className="font-semibold">{r.wo_number}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={STATUS_COLORS[r.status]}>{r.status?.replace("_", " ")}</Badge>
        </div>
        {[
          ["Manufacturing Order", r.manufacturingOrder?.mo_number || `#${r.manufacturing_order_id}`],
          ["Work Center", r.workCenter?.name || (r.work_center_id ? `#${r.work_center_id}` : "—")],
          ["Routing Step", r.routingStep?.step_name || (r.routing_step_id ? `#${r.routing_step_id}` : "—")],
          ["Planned Qty", r.planned_qty],
          ["Completed Qty", r.completed_qty],
          ["Rejected Qty", r.rejected_qty],
          ["Planned Start", r.planned_start ? formatDate(r.planned_start) : "—"],
          ["Planned End", r.planned_end ? formatDate(r.planned_end) : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="text-sm">{value}</p>
          </div>
        ))}
        {r.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Notes</p>
            <p className="text-sm">{r.notes}</p>
          </div>
        )}
      </div>
    );
  }, [selectedRecord]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Work Orders (Shop Floor)"
        addButtonLabel={perm.can_create ? "New WO" : undefined}
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

        <DetailsSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setSelectedRecord(null); }} title="WO Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); setEditRecord(null); setServerError(null); } }}>
          <DialogContent className="max-w-xl w-full">
            <div className="pb-2">
              <DialogTitle>{editRecord?.id ? "Edit Work Order" : "New Work Order"}</DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WorkOrderForm
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
              <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
              <AlertDialogDescription>Delete <strong>{recordToDelete?.wo_number}</strong>?</AlertDialogDescription>
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
