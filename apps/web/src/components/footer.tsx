import Link from "next/link";

const footerLinks = [
  [
    "Explore",
    [
      ["Furniture", "/noida/rent"],
      ["Appliances", "/noida/rent?category=appliances"],
      ["Shop by room", "/#rooms"],
      ["All rentals", "/noida/rent"],
    ],
  ],
  [
    "Rent with LYOR",
    [
      ["How it works", "/#how-renting-works"],
      ["Room bundles", "/bundles"],
      ["Your account", "/account/orders"],
      ["Contact", "/business"],
    ],
  ],
  [
    "The details",
    [
      ["Shipping & returns", "/policies"],
      ["Rental terms", "/policies"],
      ["Privacy", "/policies"],
      ["Business enquiries", "/business"],
    ],
  ],
] as const;

export function Footer() {
  return (
    <footer className="editorial-footer">
      <div className="editorial-wrap">
        <div className="editorial-footer-top">
          <h2>Make room for living.</h2>
          <Link href="/noida/rent" className="editorial-button">
            Explore rentals <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="editorial-footer-grid">
          <div>
            <Link href="/" className="editorial-footer-brand">
              LYOR
            </Link>
            <p>
              Furniture and everyday essentials, <br />
              for wherever life takes you.
            </p>
          </div>
          {footerLinks.map(([column, links]) => (
            <div key={column}>
              <h3>{column}</h3>
              {links.map(([label, href]) => (
                <Link key={label} href={href}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="editorial-footer-bottom">
          <span>© {new Date().getFullYear()} LYOR</span>
          <Link href="/admin">Staff demo</Link>
          <span>Thoughtful pieces. Everyday comfort.</span>
        </div>
      </div>
    </footer>
  );
}
