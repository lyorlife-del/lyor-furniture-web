import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section className="section-wrap page-space">
      <h1>We couldn’t find this piece.</h1>
      <p>It may have moved or left the collection.</p>
      <Link href="/noida/rent" className="text-link">
        Browse the collection
      </Link>
    </section>
  );
}
