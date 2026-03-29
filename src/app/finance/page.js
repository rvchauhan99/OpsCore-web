"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import financeService from "@/services/financeService";
import { Badge } from "@/components/ui/badge";

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await financeService.getFinanceSummary();
        const payload = res?.data ?? res?.result ?? res;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load finance summary");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const o = data?.b2b_sales_orders;
  const inv = data?.b2b_invoices;
  const mfg = data?.manufacturing;

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Finance overview">
        {loading ? (
          <p className="text-sm text-muted-foreground px-1">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground px-1">No data.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
            <div className="border rounded-md p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">B2B sales orders</p>
              <p className="text-2xl font-semibold tabular-nums">{o?.total_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Grand total sum: {o?.grand_total_sum ?? "0"}</p>
            </div>
            <div className="border rounded-md p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">B2B invoices (not cancelled)</p>
              <p className="text-2xl font-semibold tabular-nums">{inv?.total_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Grand total sum: {inv?.grand_total_sum ?? "0"}</p>
            </div>
            <div className="border rounded-md p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manufacturing</p>
              <p className="text-2xl font-semibold tabular-nums">{mfg?.open_mo_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Open MOs (excl. completed / cancelled)</p>
            </div>
            <div className="md:col-span-3 border rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Orders by status</p>
              <div className="flex flex-wrap gap-1.5">
                {(o?.by_status || []).map((s) => (
                  <Badge key={s.status || "?"} variant="secondary" className="text-[11px] font-normal">
                    {s.status}: {s.count} · {s.total}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
