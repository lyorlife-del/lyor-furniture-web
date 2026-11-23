import Link from "next/link";
export default function NotFound() {
  return (
    <section className="section-wrap page-space">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>A little out of place.</h1>
      <p>This page or listing is unavailable.</p>
      <Link href="/noida/rent" className="text-link">
        Return to the collection
      </Link>
    </section>
  );
}
