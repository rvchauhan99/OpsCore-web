"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  IconTrash,
  IconPencil,
  IconShieldCheck,
  IconClipboardCheck,
  IconFileCertificate,
  IconMicroscope,
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
import qcService from "@/services/qualityControlService";

const RESULT_COLORS = {
  pass: "default",
  fail: "destructive",
  partial: "outline"
};

const TAB_OPTIONS = [
  { id: "checks", label: "QC Inspections" },
  { id: "templates", label: "QC Templates" }
];

function QcRecordForm({ defaultValues = {}, onSubmit, onCancel, loading, serverError, isTemplate }) {
  const [form, setForm] = useState(isTemplate ? {
    name: defaultValues.name || "",
    product_id: defaultValues.product_id || "",
    inspection_type: defaultValues.inspection_type || "in_process",
    checkpoints: defaultValues.checkpoints || [{ name: "", method: "", pass_criteria: "" }],
    status: defaultValues.status || "active",
  } : {
    work_order_id: defaultValues.work_order_id || "",
    qc_template_id: defaultValues.qc_template_id || "",
    inspector_id: defaultValues.inspector_id || "",
    qty_inspected: defaultValues.qty_inspected || "",
    qty_passed: defaultValues.qty_passed || "",
    qty_failed: defaultValues.qty_failed || "",
    result: defaultValues.result || "pass",
    notes: defaultValues.notes || "",
  });

  const baseInput = "w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2";
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!isTemplate) {
      payload.qty_inspected = parseFloat(payload.qty_inspected) || 0;
      payload.qty_passed = parseFloat(payload.qty_passed) || 0;
      payload.qty_failed = parseFloat(payload.qty_failed) || 0;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {serverError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>}
      
      {isTemplate ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Template Name *</label>
              <input required className={baseInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dimensions Check" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Inspection Type</label>
              <select className={baseInput} value={form.inspection_type} onChange={e => setForm(f => ({ ...f, inspection_type: e.target.value }))}>
                <option value="incoming">Incoming</option>
                <option value="in_process">In-Process</option>
                <option value="final">Final / Outgoing</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Product ID (optional)</label><input type="number" className={baseInput} value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} /></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
              <select className={baseInput} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="border rounded bg-muted/10">
            <div className="flex justify-between items-center p-2 border-b"><h4 className="text-sm font-semibold">Checkpoints</h4><Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, checkpoints: [...f.checkpoints, {}] }))}>Add Point</Button></div>
            <div className="p-2 space-y-2">
              {form.checkpoints.map((cp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className={baseInput} placeholder="Check name (e.g. Length)" value={cp.name} onChange={e => { const cps = [...form.checkpoints]; cps[idx].name = e.target.value; setForm(f => ({ ...f, checkpoints: cps })) }} />
                  <input className={baseInput} placeholder="Method (e.g. Caliper)" value={cp.method} onChange={e => { const cps = [...form.checkpoints]; cps[idx].method = e.target.value; setForm(f => ({ ...f, checkpoints: cps })) }} />
                  <input className={baseInput} placeholder="Criteria (+/- 1mm)" value={cp.pass_criteria} onChange={e => { const cps = [...form.checkpoints]; cps[idx].pass_criteria = e.target.value; setForm(f => ({ ...f, checkpoints: cps })) }} />
                  <Button type="button" variant="ghost" className="text-destructive size-8 p-0" onClick={() => { const cps = [...form.checkpoints]; cps.splice(idx, 1); setForm(f => ({ ...f, checkpoints: cps })) }}><IconTrash className="size-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs">Work Order ID *</label><input type="number" required className={baseInput} value={form.work_order_id} onChange={e => setForm(f => ({ ...f, work_order_id: e.target.value }))} /></div>
          <div><label className="text-xs">QC Template ID</label><input type="number" className={baseInput} value={form.qc_template_id} onChange={e => setForm(f => ({ ...f, qc_template_id: e.target.value }))} /></div>
          <div><label className="text-xs">Qty Inspected *</label><input type="number" required className={baseInput} value={form.qty_inspected} onChange={e => setForm(f => ({ ...f, qty_inspected: e.target.value }))} /></div>
          <div><label className="text-xs">Qty Passed *</label><input type="number" required className={baseInput} value={form.qty_passed} onChange={e => setForm(f => ({ ...f, qty_passed: e.target.value }))} /></div>
          <div><label className="text-xs">Qty Failed</label><input type="number" className={baseInput} value={form.qty_failed} onChange={e => setForm(f => ({ ...f, qty_failed: e.target.value }))} /></div>
          <div>
            <label className="text-xs">Overall Result</label>
            <select className={baseInput} value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
              <option value="pass">Pass</option><option value="fail">Fail</option><option value="partial">Partial / Accepted under deviation</option>
            </select>
          </div>
          <div className="col-span-2"><label className="text-xs">Inspector ID</label><input type="number" className={baseInput} value={form.inspector_id} onChange={e => setForm(f => ({ ...f, inspector_id: e.target.value }))} /></div>
          <div className="col-span-2"><label className="text-xs">Notes / Defects</label><textarea className={baseInput} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Record"}</Button>
      </div>
    </form>
  );
}

export default function QualityControlPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};

  const [activeTab, setActiveTab] = useState("checks");
  const listingState = useListingQueryState({ defaultLimit: 20 });
  const { page, limit, setPage, setLimit } = listingState;

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

  const fetcher = useCallback(async (params) => {
    const fn = activeTab === "templates" ? qcService.getQcTemplates : qcService.getQcChecks;
    const res = await fn(params);
    const r = res?.result ?? res;
    if (activeTab === "templates") {
      // Templates API might just return an array directly instead of rows/count pagination
      const arr = Array.isArray(r) ? r : (r?.data || []);
      return { data: arr, meta: { total: arr.length, page: 1, limit: 100 } };
    }
    return { data: r?.data ?? [], meta: { total: r?.total ?? 0, page: params.page, limit: params.limit } };
  }, [activeTab, reloadTrigger]);

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (activeTab === "templates") {
        if (editRecord?.id) await qcService.updateQcTemplate(editRecord.id, payload);
        else await qcService.createQcTemplate(payload);
        toast.success("QC Template saved");
      } else {
        if (editRecord?.id) await qcService.updateQcCheck(editRecord.id, payload);
        else await qcService.createQcCheck(payload);
        toast.success("QC Inspection recorded");
      }
      setShowModal(false); setEditRecord(null); setReloadTrigger(p => p + 1);
    } catch (e) {
      setServerError(e.response?.data?.message || "Operation failed");
    } finally { setSubmitting(false); }
  };

  const templatesColumns = useMemo(() => [
    { field: "name", label: "Template Name", render: (row) => <div className="font-medium flex items-center gap-2"><IconFileCertificate className="size-4 text-primary" />{row.name}</div> },
    { field: "inspection_type", label: "Type", render: (row) => <Badge variant="outline" className="capitalize">{row.inspection_type?.replace("_", " ")}</Badge> },
    { field: "checkpoints", label: "Checkpoints", render: (row) => <span className="text-sm">{row.checkpoints?.length || 0} points</span> },
    { field: "actions", label: "Actions", isActionColumn: true, render: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedRecord(row); setSidebarOpen(true) }}><IconFileDescription className="size-4" /></Button>
        {perm.can_update && <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditRecord(row); setShowModal(true) }}><IconPencil className="size-4" /></Button>}
      </div>
    )}
  ], [perm]);

  const checksColumns = useMemo(() => [
    { field: "wo", label: "Work Order", render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{row.workOrder?.wo_number || `#${row.work_order_id}`}</code> },
    { field: "template", label: "QC Protocol", render: (row) => <span className="text-sm">{row.qcTemplate?.name || "Manual Check"}</span> },
    { field: "qty", label: "Qty Inspected / Passed", render: (row) => <span className="text-sm">{row.qty_inspected} / <span className="text-emerald-600 font-medium">{row.qty_passed}</span></span> },
    { field: "result", label: "Result", render: (row) => <Badge variant={RESULT_COLORS[row.result] || "secondary"} className="capitalize">{row.result}</Badge> },
    { field: "date", label: "Date", render: (row) => <span className="text-sm">{formatDate(row.checked_at)}</span> },
    { field: "actions", label: "Actions", isActionColumn: true, render: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedRecord(row); setSidebarOpen(true) }}><IconFileDescription className="size-4" /></Button>
      </div>
    )}
  ], []);

  const columns = activeTab === "templates" ? templatesColumns : checksColumns;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Quality Control"
        addButtonLabel={perm.can_create ? (activeTab === "templates" ? "New Template" : "Record Inspection") : undefined}
        onAddClick={perm.can_create ? () => { setEditRecord(null); setServerError(null); setShowModal(true); } : undefined}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          {/* Tabs */}
          <div className="flex border-b">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); setReloadTrigger(p => p + 1); }}
                className={`py-2 px-4 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <PaginatedTable
            key={`${activeTab}-${reloadTrigger}`}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 190px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
          />
          {activeTab === "checks" && (
            <PaginationControls page={page - 1} rowsPerPage={limit} totalCount={totalCount} onPageChange={(zero) => setPage(zero + 1)} onRowsPerPageChange={setLimit} rowsPerPageOptions={[20, 50, 100]} />
          )}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl w-full">
            <DialogTitle className="mb-2 border-b pb-2">{editRecord ? "Edit" : "New"} {activeTab === "templates" ? "QC Template" : "Inspection Record"}</DialogTitle>
            <div className="max-h-[70vh] overflow-y-auto">
              <QcRecordForm
                isTemplate={activeTab === "templates"}
                defaultValues={editRecord || {}}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowModal(false)}
                loading={submitting}
                serverError={serverError}
              />
            </div>
          </DialogContent>
        </Dialog>

        <DetailsSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setSelectedRecord(null); }} title={activeTab === "templates" ? "Template Details" : "Inspection Report"}>
          {selectedRecord && (
            <div className="space-y-4 pr-1">
               {activeTab === "templates" ? (
                 <>
                  <div className="flex items-center gap-2 mb-2"><IconFileCertificate className="size-5 text-primary" /><p className="font-semibold">{selectedRecord.name}</p></div>
                  <Badge variant="outline" className="capitalize">{selectedRecord.inspection_type?.replace("_", " ")}</Badge>
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-semibold mb-2">Checkpoints ({selectedRecord.checkpoints?.length || 0})</p>
                    <ul className="space-y-2">
                       {selectedRecord.checkpoints?.map((c, i) => (
                         <li key={i} className="bg-muted p-2 rounded text-sm text-muted-foreground flex justify-between">
                            <span className="font-medium text-foreground">{c.name}</span>
                            <span>{c.method} • {c.pass_criteria}</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                 </>
               ) : (
                 <>
                  <div className="bg-muted p-3 rounded-lg border text-sm space-y-2">
                    <p><span className="font-medium text-muted-foreground">Work Order:</span> <code className="ml-1 bg-background px-1 rounded">{selectedRecord.workOrder?.wo_number}</code></p>
                    <p><span className="font-medium text-muted-foreground">QC Name:</span> {selectedRecord.qcTemplate?.name || "Manual Check"}</p>
                    <p><span className="font-medium text-muted-foreground">Result:</span> <Badge variant={RESULT_COLORS[selectedRecord.result]} className="ml-2">{selectedRecord.result?.toUpperCase()}</Badge></p>
                    <div className="grid grid-cols-3 gap-2 mt-2 border-t pt-2 text-center border-border/50">
                      <div><p className="text-xs text-muted-foreground">Inspected</p><p className="font-semibold text-lg">{selectedRecord.qty_inspected}</p></div>
                      <div><p className="text-xs text-muted-foreground">Passed</p><p className="font-semibold text-lg text-emerald-600">{selectedRecord.qty_passed}</p></div>
                      <div><p className="text-xs text-muted-foreground">Failed</p><p className="font-semibold text-lg text-destructive">{selectedRecord.qty_failed || 0}</p></div>
                    </div>
                  </div>
                  {selectedRecord.notes && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-1 border-b pb-1">Notes / Defects</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.notes}</p>
                    </div>
                  )}
                 </>
               )}
            </div>
          )}
        </DetailsSidebar>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
