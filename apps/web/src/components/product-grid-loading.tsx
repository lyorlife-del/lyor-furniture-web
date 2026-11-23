export function ProductGridLoading({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div className="product-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div className="product-card" key={index}>
            <div className="product-image skeleton" />
            <div className="product-info">
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton mt-3 h-5 w-4/5" />
              <div className="skeleton mt-3 h-4 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
