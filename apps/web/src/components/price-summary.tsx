import { money, type Breakdown } from "@/lib/types";
export function PriceSummary({ breakdown }: { breakdown: Breakdown }) {
  return (
    <>
      <div className="summary-row">
        <span>Items · first month / purchase</span>
        <span>{money(breakdown.subtotalPaise)}</span>
      </div>
      <div className="summary-row">
        <span>Refundable deposit · demo</span>
        <span>{money(breakdown.depositPaise)}</span>
      </div>
      <div className="summary-row">
        <span>Demo delivery fee</span>
        <span>{money(breakdown.deliveryPaise)}</span>
      </div>
      <div className="summary-row">
        <span>Demo GST (18%)</span>
        <span>{money(breakdown.gstPaise)}</span>
      </div>
      <div className="summary-row summary-total">
        <span>Due now · demo</span>
        <span>{money(breakdown.totalPaise)}</span>
      </div>
      <p className="small-note">Synthetic policy. Nothing is charged.</p>
    </>
  );
}
