import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link href="/" className="footer-brand">
          LYOR<span>furniture</span>
        </Link>
        <p>
          Thoughtful pieces.
          <br />A home that feels like you.
        </p>
      </div>
      <div>
        <h3>Make yourself at home</h3>
        <Link href="/noida/rent">Rent furniture</Link>
        <Link href="/noida/buy">Buy furniture</Link>
        <Link href="/bundles">Explore bundles</Link>
      </div>
      <div>
        <h3>Here to help</h3>
        <Link href="/business">Business enquiries</Link>
        <Link href="/account/orders">Your demo orders</Link>
        <Link href="/policies">Demo terms & policies</Link>
      </div>
      <div className="footer-note">
        <h3>A work in progress, thoughtfully.</h3>
        <p>
          This local demo uses synthetic prices and availability. No payments
          are collected and no real orders are placed.
        </p>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} LYOR · Furniture marketplace demo
        </span>
        <Link href="/admin">Staff demo</Link>
      </div>
    </footer>
  );
}
