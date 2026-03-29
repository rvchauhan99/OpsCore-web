"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  IconTrash,
  IconPencil,
  IconFileDescription,
  IconCopy,
  IconCalculator,
  IconListDetails,
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
import bomService from "@/services/bomService";

const STATUS_COLORS = {
  draft: "secondary",
  active: "default",
  obsolete: "destructive",
};

export default function BillOfMaterialsPage() {
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
  const [totalCount, setTotalCount] = useState(0);

  // Form State
  const [form, setForm] = useState(initForm());
  const [submitting, setSubmitting] = useState(false);

  function initForm(data = null) {
    if (!data) return { product_id: "", name: "", version: "1.0", status: "draft", standard_qty: "1", overhead_pct: "0", is_default: false, components: [], routings: [] };
    return {
      product_id: data.product_id, name: data.name, version: data.version, status: data.status,
      standard_qty: data.standard_qty, overhead_pct: data.overhead_pct || 0, is_default: data.is_default,
      components: data.components || [], routings: data.routings || []
    };
  }

  const filterParams = useMemo(
    () => Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")),
    [filters]
  );

  const fetcher = useCallback(async (params) => {
    const res = await bomService.getBoms({ ...params, ...filterParams });
    const r = res?.result ?? res;
    return { data: r?.data ?? [], meta: { total: r?.total ?? 0, page: params.page, limit: params.limit } };
  }, [filterParams, reloadTrigger]);

  const fetchFullBom = async (id) => {
    try {
      const res = await bomService.getBomById(id);
      return res.data || res.result;
    } catch { return null; }
  };

  const handleOpenSidebar = async (row) => {
    const full = await fetchFullBom(row.id);
    setSelectedRecord(full || row);
    setSidebarOpen(true);
  };

  const handleAdd = () => { setForm(initForm()); setShowModal(true); setEditRecord(null); };
  const handleEdit = async (row) => {
    const full = await fetchFullBom(row.id);
    setForm(initForm(full || row));
    setEditRecord(row);
    setShowModal(true);
  };

  const handleClone = async (row) => {
    try {
      await bomService.cloneBomVersion(row.id);
      toast.success("BOM cloned successfully");
      setReloadTrigger((p) => p + 1);
    } catch (e) { toast.error("Failed to clone BOM"); }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await bomService.deleteBom(recordToDelete.id);
      setDeleteDialogOpen(false);
      setReloadTrigger(p => p + 1);
      toast.success("BOM Deleted");
    } finally { setDeleting(false); }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (editRecord?.id) await bomService.updateBom(editRecord.id, payload);
      else await bomService.createBom(payload);
      toast.success(`BOM ${editRecord ? "updated" : "created"}`);
      setShowModal(false);
      setReloadTrigger(p => p + 1);
    } catch (e) {
      toast.error(e.response?.data?.message || "Error saving BOM");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(() => [
    {
      field: "name", label: "BOM Name", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 font-medium">
          <IconListDetails className="size-4 text-muted-foreground" />
          {row.name} v{row.version}
          {row.is_default && <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0 h-4">Default</Badge>}
        </div>
      )
    },
    { field: "product", label: "Product", render: (row) => row.product?.product_name || `ID #${row.product_id}` },
    { field: "status", label: "Status", render: (row) => <Badge variant={STATUS_COLORS[row.status]}>{row.status}</Badge> },
    {
      field: "cost", label: "Total Unit Cost",
      render: (row) => (
        <div className="font-mono text-sm">
          ₹{parseFloat(row.total_unit_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
      )
    },
    {
      field: "actions", label: "Actions", isActionColumn: true,
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleOpenSidebar(row)}><IconFileDescription className="size-4" /></Button>
          {perm.can_update && <Button variant="ghost" size="icon" className="size-8" title="Copy as New Version" onClick={() => handleClone(row)}><IconCopy className="size-4" /></Button>}
          {perm.can_update && <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(row)}><IconPencil className="size-4" /></Button>}
          {perm.can_delete && <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => { setRecordToDelete(row); setDeleteDialogOpen(true); }}><IconTrash className="size-4" /></Button>}
        </div>
      )
    }
  ], [perm]);

  const baseInput = "w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background";

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Bill of Materials" addButtonLabel={perm.can_create ? "New BOM" : undefined} onAddClick={perm.can_create ? handleAdd : undefined}>
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable key={reloadTrigger} columns={columns} fetcher={fetcher} showSearch={false} showPagination={false} height="calc(100vh - 150px)" onTotalChange={setTotalCount} page={page} limit={limit} sortBy={sortBy || "created_at"} sortOrder={sortOrder || "DESC"} onPageChange={(zero) => setPage(zero + 1)} onRowsPerPageChange={setLimit} />
          <PaginationControls page={page - 1} rowsPerPage={limit} totalCount={totalCount} onPageChange={(zero) => setPage(zero + 1)} onRowsPerPageChange={setLimit} rowsPerPageOptions={[20, 50, 100]} />
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between bg-muted/20">
              <DialogTitle>{editRecord ? "Edit BOM" : "Build Bill of Materials"}</DialogTitle>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">BOM Name & Version</label>
                    <div className="flex gap-2">
                      <input className={`flex-1 ${baseInput}`} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Final Assembly" />
                      <input className={`w-24 ${baseInput}`} required value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Product ID</label>
                    <input className={baseInput} type="number" required value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                    <select className={baseInput} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="draft">Draft</option><option value="active">Active</option><option value="obsolete">Obsolete</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Standard Qty</label>
                    <input className={baseInput} type="number" step="0.01" required value={form.standard_qty} onChange={e => setForm(f => ({ ...f, standard_qty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Overhead %</label>
                    <input className={baseInput} type="number" step="0.01" value={form.overhead_pct} onChange={e => setForm(f => ({ ...f, overhead_pct: e.target.value }))} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mt-6">
                    <input type="checkbox" id="is_def" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
                    <label htmlFor="is_def" className="text-sm font-medium">Set as Default BOM for this Product</label>
                  </div>
                </div>

                <div className="border rounded bg-muted/10">
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Components (Raw Materials)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, components: [...f.components, { component_product_id: "", qty: 1, cost_per_unit: 0 }] }))} className="h-7 text-xs">Add Item</Button>
                  </div>
                  {form.components.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No components added.</div>
                  ) : (
                    <div className="divide-y">
                      {form.components.map((c, i) => (
                        <div key={i} className="p-2 gap-2 flex items-center">
                          <input className={`w-32 ${baseInput}`} placeholder="Product ID" value={c.component_product_id} onChange={(e) => { const a = [...form.components]; a[i].component_product_id = e.target.value; setForm(f => ({ ...f, components: a })); }} />
                          <input className={`w-24 ${baseInput}`} placeholder="Qty" type="number" value={c.qty} onChange={(e) => { const a = [...form.components]; a[i].qty = e.target.value; setForm(f => ({ ...f, components: a })); }} />
                          <input className={`w-32 ${baseInput}`} placeholder="Cost/Unit ₹" type="number" value={c.cost_per_unit} onChange={(e) => { const a = [...form.components]; a[i].cost_per_unit = e.target.value; setForm(f => ({ ...f, components: a })); }} />
                          <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive ml-auto" onClick={() => { const a = [...form.components]; a.splice(i, 1); setForm(f => ({ ...f, components: a })); }}><IconTrash className="size-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border rounded bg-muted/10">
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Operations (Routing)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, routings: [...f.routings, { step_name: "", work_center_id: "", duration_hrs: 0 }] }))} className="h-7 text-xs">Add Step</Button>
                  </div>
                  {form.routings.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No routing steps defined.</div>
                  ) : (
                    <div className="divide-y">
                      {form.routings.map((r, i) => (
                        <div key={i} className="p-2 gap-2 flex items-center">
                          <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                          <input className={`flex-1 ${baseInput}`} placeholder="Operation Name" value={r.step_name} onChange={(e) => { const a = [...form.routings]; a[i].step_name = e.target.value; setForm(f => ({ ...f, routings: a })); }} />
                          <input className={`w-32 ${baseInput}`} placeholder="Work Center ID" type="number" value={r.work_center_id} onChange={(e) => { const a = [...form.routings]; a[i].work_center_id = e.target.value; setForm(f => ({ ...f, routings: a })); }} />
                          <input className={`w-24 ${baseInput}`} placeholder="Hrs" type="number" step="0.01" value={r.duration_hrs} onChange={(e) => { const a = [...form.routings]; a[i].duration_hrs = e.target.value; setForm(f => ({ ...f, routings: a })); }} />
                          <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive ml-auto" onClick={() => { const a = [...form.routings]; a.splice(i, 1); setForm(f => ({ ...f, routings: a })); }}><IconTrash className="size-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2 bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save BOM & Compute Cost"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <DetailsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} title="BOM Cost Sheet & Details">
          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 border rounded-lg">
                <p className="text-lg font-bold flex items-center gap-2">
                  <IconListDetails className="size-5" />
                  {selectedRecord.name} (v{selectedRecord.version})
                </p>
                <p className="text-sm text-muted-foreground mt-1">Product: {selectedRecord.product?.product_name || selectedRecord.product_id}</p>
                <p className="text-sm font-medium mt-2">
                  Unit Cost: ₹{parseFloat(selectedRecord.total_unit_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              {selectedRecord.costSheet && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1"><IconCalculator className="size-4" /> Cost Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-2 rounded">
                    <p className="text-muted-foreground">Material Cost</p><p className="text-right">₹{parseFloat(selectedRecord.costSheet.material_cost || 0).toFixed(2)}</p>
                    <p className="text-muted-foreground">Labor/Station Cost</p><p className="text-right">₹{parseFloat(selectedRecord.costSheet.labor_cost || 0).toFixed(2)}</p>
                    <p className="text-muted-foreground">Overhead ({selectedRecord.costSheet.overhead_pct}%)</p><p className="text-right">₹{parseFloat(selectedRecord.costSheet.overhead_cost || 0).toFixed(2)}</p>
                    <div className="col-span-2 border-t my-1"></div>
                    <p className="font-semibold">Total Unit Cost</p><p className="font-semibold text-right">₹{parseFloat(selectedRecord.costSheet.total_unit_cost || 0).toFixed(2)}</p>
                  </div>
                </div>
              )}

              {selectedRecord.components?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Components</h4>
                  <ul className="space-y-1">
                    {selectedRecord.components.map((c, i) => (
                      <li key={i} className="text-xs flex justify-between p-1.5 border-b">
                        <span>{c.componentProduct?.product_name || `Product #${c.component_product_id}`}</span>
                        <span className="font-medium text-muted-foreground">{c.qty} unit @ ₹{c.cost_per_unit || 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DetailsSidebar>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete BOM</AlertDialogTitle><AlertDialogDescription>This will delete BOM "{recordToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
