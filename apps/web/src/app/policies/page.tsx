export const metadata = { title: "Demo terms and policies" };
export default function Policies() {
  return (
    <section className="section-wrap page-space">
      <div className="business-intro">
        <p className="eyebrow">CLEAR FROM THE BEGINNING</p>
        <h1>About this demo.</h1>
        <p>LYOR Furniture is currently a local development demonstration.</p>
      </div>
      <div className="panel max-w-3xl">
        <h2>No real transactions.</h2>
        <p>
          All prices, taxes, deposits, stock and PIN coverage are synthetic
          examples. Orders are local requests processed by a mock adapter. No
          payment is collected and no delivery is arranged.
        </p>
        <h3>Quotations</h3>
        <p>
          Demo rental plans are 3, 6 or 12 months. A quote includes the first
          month’s rental or purchase subtotal, a synthetic delivery fee and
          synthetic 18% tax. It expires after 15 minutes. Cart or address
          changes require a new quote.
        </p>
        <h3>Optional services</h3>
        <p>
          No paid care, insurance or marketing service is automatically added.
        </p>
        <h3>Identity and privacy</h3>
        <p>
          Use fictional details only. Local test identities are not real
          accounts. The order portal separates each test customer’s records.
          Live identity, KYC, privacy, commercial, warranty, cancellation,
          damage and refund policies remain disabled pending approval.
        </p>
        <h3>Product imagery</h3>
        <p>
          Photographs are illustrative references sourced from Unsplash. The
          asset register in the project documentation records the source URLs.
          Real product imagery and final licensing review are required before
          launch.
        </p>
      </div>
    </section>
  );
}
