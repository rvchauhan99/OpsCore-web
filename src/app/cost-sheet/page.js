"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { Button } from "@/components/ui/button";
import bomService from "@/services/bomService";

export default function CostSheetPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bomService.getBoms({ limit: 100, page: 1 });
      const r = res?.result ?? res;
      setRows(r?.data ?? []);
    } catch {
      toast.error("Failed to load BOMs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Cost sheets"
        headerActions={
          <Button asChild size="sm" variant="outline">
            <Link href="/bill-of-materials">Open BOM editor</Link>
          </Button>
        }
      >
        <p className="text-xs text-muted-foreground px-1 pb-2">
          Unit costs are stored on each BOM. Use <strong>Compute cost</strong> on the BOM detail screen to refresh material, labor, and overhead.
        </p>
        <div className="border rounded-md overflow-auto max-h-[calc(100vh-200px)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-2">BOM</th>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Unit cost</th>
                <th className="text-right p-2"> </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    No BOMs yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-2">
                      <span className="font-medium">{row.name}</span>{" "}
                      <span className="text-muted-foreground">v{row.version}</span>
                    </td>
                    <td className="p-2">{row.product?.product_name || row.product_id}</td>
                    <td className="p-2 capitalize">{row.status}</td>
                    <td className="p-2 text-right tabular-nums">
                      {row.total_unit_cost != null ? Number(row.total_unit_cost).toFixed(4) : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href="/bill-of-materials">BOMs</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground px-1 pt-2">Reload after running compute cost on a BOM to refresh totals here.</p>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
