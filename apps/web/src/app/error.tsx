"use client";
import { Button } from "@lyor/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section-wrap page-space">
      <h1>Let’s give that another try.</h1>
      <p>We couldn’t load this page. Your existing cart is saved.</p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </section>
  );
}
