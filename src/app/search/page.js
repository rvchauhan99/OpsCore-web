"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import moment from "moment";
import { Tooltip } from "@mui/material";
import { IconSearch, IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginatedTable from "@/components/common/PaginatedTable";
import { getGlobalSearch } from "@/services/globalSearchService";
import { cn } from "@/lib/utils";

const SOURCE_BADGE = {
  b2b_client: "bg-sky-100 text-sky-800",
  product: "bg-emerald-100 text-emerald-800",
  supplier: "bg-violet-100 text-violet-800",
  purchase_order: "bg-amber-100 text-amber-800",
  b2b_sales_quote: "bg-orange-100 text-orange-900",
  b2b_sales_order: "bg-teal-100 text-teal-900",
};

const GLOBAL_SEARCH_Q_KEY = "opscore_global_search_q";

export default function GlobalSearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q");

  const [draft, setDraft] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");

  useEffect(() => {
    const fromUrl = (urlQ ?? "").trim();
    if (fromUrl.length >= 2) {
      setDraft(fromUrl);
      setSubmittedQ(fromUrl);
      try {
        sessionStorage.setItem(GLOBAL_SEARCH_Q_KEY, fromUrl);
      } catch (_) {
        /* ignore */
      }
      return;
    }

    let stored = "";
    try {
      stored = (sessionStorage.getItem(GLOBAL_SEARCH_Q_KEY) ?? "").trim();
    } catch (_) {
      /* ignore */
    }
    if (stored.length >= 2) {
      setDraft(stored);
      setSubmittedQ(stored);
      router.replace(`${pathname}?${new URLSearchParams({ q: stored }).toString()}`);
      return;
    }

    setDraft(fromUrl);
    setSubmittedQ("");
  }, [urlQ, pathname, router]);

  const openDetails = useCallback(
    (row) => {
      if (!row?.detail_path) return;
      router.push(row.detail_path);
    },
    [router]
  );

  const filterParams = useMemo(() => ({ submittedQ }), [submittedQ]);

  const fetcher = useCallback(async () => {
    const q = (submittedQ || "").trim();
    if (q.length < 2) {
      return {
        data: [],
        meta: { total: 0, page: 1, pages: 0, limit: 25 },
      };
    }
    const res = await getGlobalSearch({
      q,
      per_module_limit: 25,
      max_total: 100,
    });
    const payload = res?.result ?? res;
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
      data: items,
      meta: {
        total: items.length,
        page: 1,
        pages: 1,
        limit: Math.max(items.length, 25),
      },
    };
  }, [submittedQ]);

  const columns = useMemo(
    () => [
      {
        field: "pui",
        label: "Ref / Code",
        sortable: true,
        stickyLeft: 0,
        minWidth: 105,
        maxWidth: 105,
        render: (row) => (
          <button
            type="button"
            className="text-primary w-full truncate hover:underline text-left font-medium"
            onClick={(e) => {
              e.stopPropagation();
              openDetails(row);
            }}
            title={row.pui}
          >
            {row.pui}
          </button>
        ),
      },
      {
        field: "entity_label",
        label: "Source",
        sortable: true,
        stickyLeft: 105,
        minWidth: 115,
        maxWidth: 115,
        stickyShadow: true,
        render: (row) => (
          <Badge
            variant="secondary"
            className={cn(
              "font-normal w-full justify-center",
              SOURCE_BADGE[row.entityType] || "bg-slate-100 text-slate-700"
            )}
          >
            {row.entity_label || row.entityType}
          </Badge>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        render: (row) => row.status || "-",
      },
      {
        field: "customer_name",
        label: "Name",
        sortable: true,
        render: (row) => row.customer_name || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        sortable: true,
        render: (row) => row.mobile_number || "-",
      },
      {
        field: "address",
        label: "Address",
        sortable: false,
        render: (row) => {
          if (!row.address) return <div className="max-w-[250px]">-</div>;
          return (
            <Tooltip title={row.address} placement="top" arrow>
              <div className="max-w-[250px] truncate cursor-help">
                {row.address}
              </div>
            </Tooltip>
          );
        },
      },
      {
        field: "scheme",
        label: "GST / HSN / Code",
        sortable: true,
        render: (row) => row.scheme || "-",
      },
      {
        field: "timeline",
        label: "Timeline / Dates",
        sortable: false,
        render: (row) => {
          const dates = [];
          if (row.inquiry_or_lead_date) dates.push({ label: "Ref", val: row.inquiry_or_lead_date });
          if (row.order_date) dates.push({ label: "Order", val: row.order_date });
          if (row.netmeter_installed_on) dates.push({ label: "Netmeter", val: row.netmeter_installed_on });

          if (dates.length === 0) return "-";

          return (
            <div className="flex flex-col gap-1 text-xs whitespace-nowrap min-w-[100px]">
              {dates.map((d, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="font-medium tracking-tight whitespace-nowrap">
                    {moment(d.val).format("DD-MM-YYYY")}
                  </span>
                </div>
              ))}
            </div>
          );
        },
      },
    ],
    [openDetails]
  );

  const runSearch = useCallback(() => {
    const q = draft.trim();
    try {
      if (q.length >= 2) {
        sessionStorage.setItem(GLOBAL_SEARCH_Q_KEY, q);
      } else {
        sessionStorage.removeItem(GLOBAL_SEARCH_Q_KEY);
      }
    } catch (_) {
      /* ignore */
    }
    const next = new URLSearchParams(searchParams.toString());
    if (q.length >= 2) {
      next.set("q", q);
    } else {
      next.delete("q");
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [draft, pathname, router, searchParams]);

  const clearSearch = useCallback(() => {
    try {
      sessionStorage.removeItem(GLOBAL_SEARCH_Q_KEY);
    } catch (_) {
      /* ignore */
    }
    setDraft("");
    setSubmittedQ("");
    router.replace(pathname);
  }, [pathname, router]);

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col p-2">
      <div className="mx-auto w-full max-w-4xl bg-card border border-border shadow-sm rounded-xl p-3 sm:px-4 sm:py-3 mb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <IconSearch className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder="Search B2B clients, products, suppliers, POs, quotes, orders…"
              className="h-9 sm:h-10 pl-9 pr-4 text-[13px] sm:text-sm bg-background/50 border-input shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg"
              aria-label="Global search"
            />
            {draft && (
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setDraft("")}
                aria-label="Clear Input"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-none gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              <IconX className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 sm:h-10 px-4 sm:px-6 flex-1 sm:flex-none gap-2 shadow-sm font-medium"
              onClick={runSearch}
            >
              <IconSearch className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] sm:text-[11px] text-muted-foreground text-center sm:text-left leading-snug">
          <span className="font-semibold text-foreground/70 mr-1">Includes:</span>
          B2B clients, products, suppliers, purchase orders, B2B quotes, and B2B sales orders (per-module cap
          applies).
        </p>
      </div>

      <div className="min-h-0 flex-1 flex flex-col mt-0.5">
        <PaginatedTable
          key={submittedQ || "__empty__"}
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams}
          showSearch={false}
          showPagination={false}
          initialLimit={100}
          moduleKey="global_search"
          height="calc(100dvh - 160px)"
          getRowKey={(row) => `${row.entityType}-${row.id}`}
          onRowClick={(row) => openDetails(row)}
        />
      </div>
    </div>
  );
}
