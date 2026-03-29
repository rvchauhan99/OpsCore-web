"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  IconTrash,
  IconPencil,
  IconFileDescription,
  IconBuildingFactory2,
  IconTool,
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
import workCenterService from "@/services/workCenterService";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
];

const TYPE_OPTIONS = [
  { value: "machine", label: "Machine" },
  { value: "labor", label: "Labor" },
  { value: "both", label: "Both" },
];

const STATUS_COLORS = {
  active: "default",
  inactive: "secondary",
  maintenance: "outline",
};

function WorkCenterForm({ defaultValues = {}, onSubmit, onCancel, loading, serverError }) {
  const [form, setForm] = useState({
    name: defaultValues.name || "",
    code: defaultValues.code || "",
    type: defaultValues.type || "machine",
    capacity_per_day: defaultValues.capacity_per_day || "",
    cost_per_hour: defaultValues.cost_per_hour || "",
    status: defaultValues.status || "active",
    location: defaultValues.location || "",
    notes: defaultValues.notes || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      capacity_per_day: form.capacity_per_day ? parseFloat(form.capacity_per_day) : null,
      cost_per_hour: form.cost_per_hour ? parseFloat(form.cost_per_hour) : 0,
    });
  };

  const baseInput = "w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {serverError && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input className={baseInput} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. CNC Mill A" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Code *</label>
          <input className={baseInput} value={form.code} onChange={(e) => set("code", e.target.value)} required placeholder="e.g. CNC-A" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select className={baseInput} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select className={baseInput} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Capacity/Day</label>
          <input className={baseInput} type="number" step="0.01" value={form.capacity_per_day} onChange={(e) => set("capacity_per_day", e.target.value)} placeholder="Units or hours" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cost/Hour (₹)</label>
          <input className={baseInput} type="number" step="0.01" value={form.cost_per_hour} onChange={(e) => set("cost_per_hour", e.target.value)} placeholder="0.00" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <input className={baseInput} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Shop Floor 1, Building B" />
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

export default function WorkCentersPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};

  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: ["search", "status"] });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter } = listingState;

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

  const fetcher = useCallback(
    async (params) => {
      const res = await workCenterService.getWorkCenters({ ...params, ...filterParams });
      const r = res?.result ?? res;
      return {
        data: r?.data ?? [],
        meta: {
          total: r?.total ?? 0,
          page: params.page,
          pages: 0,
          limit: params.limit,
        },
      };
    },
    [filterParams, reloadTrigger]
  );

  const handleAdd = () => { setEditRecord(null); setServerError(null); setShowModal(true); };
  const handleEdit = (row) => { setEditRecord(row); setServerError(null); setShowModal(true); };
  const handleDeleteClick = (row) => { setRecordToDelete(row); setDeleteDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await workCenterService.deleteWorkCenter(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      setSelectedRecord(null);
      toast.success("Work center deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (editRecord?.id) {
        await workCenterService.updateWorkCenter(editRecord.id, payload);
        toast.success("Work center updated");
      } else {
        await workCenterService.createWorkCenter(payload);
        toast.success("Work center created");
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

  const columns = useMemo(() => [
    {
      field: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <IconBuildingFactory2 className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{row.name}</span>
        </div>
      ),
    },
    { field: "code", label: "Code", render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code> },
    {
      field: "type",
      label: "Type",
      render: (row) => <span className="text-sm capitalize">{row.type}</span>,
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={STATUS_COLORS[row.status] || "secondary"} className="text-xs capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      field: "capacity_per_day",
      label: "Capacity/Day",
      render: (row) => row.capacity_per_day ? `${parseFloat(row.capacity_per_day)} units` : "—",
    },
    {
      field: "cost_per_hour",
      label: "Cost/hr (₹)",
      render: (row) => row.cost_per_hour ? `₹${parseFloat(row.cost_per_hour).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—",
    },
    { field: "location", label: "Location", render: (row) => row.location || "—" },
    {
      field: "actions",
      label: "Actions",
      isActionColumn: true,
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedRecord(row); setSidebarOpen(true); }} title="View">
            <IconFileDescription className="size-4" />
          </Button>
          {perm.can_update && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(row)} title="Edit">
              <IconPencil className="size-4" />
            </Button>
          )}
          {perm.can_delete && (
            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(row)} title="Delete">
              <IconTrash className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [perm]);

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="space-y-3 pr-1">
        <div className="flex items-center gap-2">
          <IconTool className="size-5 text-primary" />
          <p className="font-semibold text-base">{r.name}</p>
        </div>
        <Badge variant={STATUS_COLORS[r.status] || "secondary"} className="capitalize">{r.status}</Badge>
        {[
          ["Code", r.code],
          ["Type", r.type],
          ["Capacity/Day", r.capacity_per_day ? `${r.capacity_per_day} units/hrs` : "—"],
          ["Cost/Hour", r.cost_per_hour ? `₹${parseFloat(r.cost_per_hour).toFixed(2)}` : "—"],
          ["Location", r.location || "—"],
          ["Created", formatDate(r.created_at) || "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="text-sm">{value}</p>
          </div>
        ))}
        {r.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Notes</p>
            <p className="text-sm text-muted-foreground">{r.notes}</p>
          </div>
        )}
      </div>
    );
  }, [selectedRecord]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Work Centers"
        addButtonLabel={perm.can_create ? "Add Work Center" : undefined}
        onAddClick={perm.can_create ? handleAdd : undefined}
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
            sortBy={sortBy || "name"}
            sortOrder={sortOrder || "ASC"}
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

        <DetailsSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setSelectedRecord(null); }} title="Work Center Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); setEditRecord(null); setServerError(null); } }}>
          <DialogContent className="max-w-xl w-full">
            <div className="pb-2">
              <DialogTitle>{editRecord?.id ? "Edit Work Center" : "Add Work Center"}</DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WorkCenterForm
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
              <AlertDialogTitle>Delete Work Center</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{recordToDelete?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
