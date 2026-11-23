export default function ProductLoading() {
  return (
    <section className="section-wrap page-space" role="status">
      <div className="breadcrumb">
        <span>Loading product…</span>
      </div>
      <div className="product-detail" aria-hidden="true">
        <div className="detail-photo skeleton" />
        <div className="detail-content">
          <div className="skeleton h-12 w-4/5" />
          <div className="skeleton mt-6 h-24" />
        </div>
      </div>
    </section>
  );
}
