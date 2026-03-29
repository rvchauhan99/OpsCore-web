"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import orderService from "@/services/orderService";
import quotationService from "@/services/quotationService";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import b2bSalesQuoteService from "@/services/b2bSalesQuoteService";
import QuotationDetailsContent from "@/app/quotation/components/QuotationDetailsContent";

export default function QuotationDetailsDrawer({
  open,
  onClose,
  orderId = null,
  quotationId: inputQuotationId = null,
}) {
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open) return;
      try {
        setLoading(true);
        setError(null);
        setQuotation(null);

        let resolvedQuotationId = inputQuotationId;
        if (!resolvedQuotationId && orderId) {
          try {
            const soRes = await b2bSalesOrderService.getB2bSalesOrderById(orderId);
            const so = soRes?.result || soRes || null;
            if (so?.quote_id) resolvedQuotationId = so.quote_id;
          } catch {
            /* fall through */
          }
          if (!resolvedQuotationId) {
            const orderRes = await orderService.getOrderById(orderId);
            const order = orderRes?.result || orderRes || null;
            resolvedQuotationId = order?.quotation_id || order?.quote_id || null;
          }
        }

        if (!resolvedQuotationId) {
          if (!mounted) return;
          setError("Quotation is not linked with this order.");
          return;
        }

        let quote = null;
        try {
          const b2bRes = await b2bSalesQuoteService.getB2bSalesQuoteById(resolvedQuotationId);
          quote = b2bRes?.result || b2bRes || null;
        } catch {
          quote = null;
        }
        if (!quote) {
          const quotationRes = await quotationService.getQuotationById(resolvedQuotationId);
          quote = quotationRes?.result || quotationRes || null;
        }
        if (!mounted) return;
        setQuotation(quote);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load quotation details");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [open, orderId, inputQuotationId]);

  return (
    <DetailsSidebar
      open={open}
      onClose={onClose}
      title="Quotation Details"
      closeOnBackdropClick
      headerActions={
        quotation?.id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/quotation/${quotation.id}`, "_blank")}
          >
            Open full page
          </Button>
        ) : null
      }
    >
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <QuotationDetailsContent quotation={quotation} loading={loading} />
      )}
    </DetailsSidebar>
  );
}

