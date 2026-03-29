"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { IconTrash, IconPencil, IconCalendarEvent } from "@tabler/icons-react";
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
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/dataTableUtils";
import productionScheduleService from "@/services/productionScheduleService";

const STATUS_COLORS = { planned: "secondary", confirmed: "default", done: "outline" };

function ScheduleForm({ defaultValues = {}, onSubmit, onCancel, loading, serverError }) {
  const [form, setForm] = useState({
    manufacturing_order_id: defaultValues.manufacturing_order_id || "",
    work_center_id: defaultValues.work_center_id || "",
    scheduled_date: defaultValues.scheduled_date || "",
    hours_planned: defaultValues.hours_planned ?? "0",
    status: defaultValues.status || "planned",
    notes: defaultValues.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const baseInput =
    "w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form
      className="space-y-3 p-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          manufacturing_order_id: form.manufacturing_order_id ? parseInt(form.manufacturing_order_id, 10) : null,
          work_center_id: form.work_center_id ? parseInt(form.work_center_id, 10) : null,
          scheduled_date: form.scheduled_date,
          hours_planned: parseFloat(form.hours_planned) || 0,
          status: form.status,
          notes: form.notes || null,
        });
      }}
    >
      {serverError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date *</label>
          <input className={baseInput} type="date" required value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Hours</label>
          <input className={baseInput} type="number" step="0.25" value={form.hours_planned} onChange={(e) => set("hours_planned", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">MO ID</label>
          <input className={baseInput} type="number" value={form.manufacturing_order_id} onChange={(e) => set("manufacturing_order_id", e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Work center ID</label>
          <input className={baseInput} type="number" value={form.work_center_id} onChange={(e) => set("work_center_id", e.target.value)} placeholder="Optional" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select className={baseInput} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea className={baseInput} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default function ProductionSchedulePage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modal, setModal] = useState({ open: false, edit: null });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await productionScheduleService.getProductionSchedule(params);
      setRows(res?.data ?? res?.result?.data ?? []);
    } catch {
      toast.error("Failed to load schedule");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productionScheduleService.deleteScheduleEntry(deleteTarget.id);
      toast.success("Removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleForm = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (modal.edit?.id) {
        await productionScheduleService.updateScheduleEntry(modal.edit.id, payload);
        toast.success("Updated");
      } else {
        await productionScheduleService.createScheduleEntry(payload);
        toast.success("Created");
      }
      setModal({ open: false, edit: null });
      load();
    } catch (err) {
      setServerError(err.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Production schedule"
        addButtonLabel={perm.can_create ? "Add entry" : undefined}
        onAddClick={
          perm.can_create
            ? () => {
                setServerError(null);
                setModal({ open: true, edit: null });
              }
            : undefined
        }
      >
        <div className="flex flex-wrap items-end gap-2 px-1 pb-2">
          <div>
            <label className="text-xs text-muted-foreground block">From</label>
            <input type="date" className="border rounded-md px-2 py-1 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block">To</label>
            <input type="date" className="border rounded-md px-2 py-1 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
        <div className="border rounded-md overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">MO</th>
                <th className="text-left p-2">Work center</th>
                <th className="text-right p-2">Hrs</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Notes</th>
                <th className="text-right p-2 w-24"> </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No entries (try widening the date range).
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap">{formatDate(row.scheduled_date)}</td>
                    <td className="p-2">
                      {row.manufacturingOrder ? (
                        <code className="bg-muted px-1 rounded">{row.manufacturingOrder.mo_number}</code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2">{row.workCenter?.name || row.work_center_id || "—"}</td>
                    <td className="p-2 text-right">{row.hours_planned}</td>
                    <td className="p-2">
                      <Badge variant={STATUS_COLORS[row.status] || "secondary"} className="text-[10px] capitalize">
                        {row.status}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-[200px] truncate">{row.notes || "—"}</td>
                    <td className="p-2 text-right">
                      {perm.can_update && (
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setServerError(null); setModal({ open: true, edit: row }); }}>
                          <IconPencil className="size-3.5" />
                        </Button>
                      )}
                      {perm.can_delete && (
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteTarget(row)}>
                          <IconTrash className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={modal.open} onOpenChange={(o) => { if (!o) setModal({ open: false, edit: null }); }}>
          <DialogContent className="max-w-md w-full">
            <div className="flex items-center gap-2 pb-1">
              <IconCalendarEvent className="size-5 text-primary" />
              <DialogTitle className="text-base">{modal.edit ? "Edit entry" : "New schedule entry"}</DialogTitle>
            </div>
            <ScheduleForm
              defaultValues={modal.edit || {}}
              onSubmit={handleForm}
              onCancel={() => { setModal({ open: false, edit: null }); setServerError(null); }}
              loading={submitting}
              serverError={serverError}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete schedule entry?</AlertDialogTitle>
              <AlertDialogDescription>This removes the row for {deleteTarget ? formatDate(deleteTarget.scheduled_date) : ""}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="sm" loading={deleting} onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
