"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CatalogNavigation({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function navigate(href: string) {
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <div
      onClickCapture={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          event.shiftKey
        )
          return;
        const target = (event.target as Element).closest<HTMLAnchorElement>(
          "a[data-catalog-link]",
        );
        if (!target) return;
        event.preventDefault();
        navigate(target.pathname + target.search);
      }}
      onSubmitCapture={(event) => {
        if (
          !(event.target instanceof HTMLFormElement) ||
          !event.target.matches(".catalog-toolbar")
        )
          return;
        event.preventDefault();
        const url = new URL(event.target.action);
        url.search = new URLSearchParams(
          Array.from(new FormData(event.target), ([key, value]) => [
            key,
            String(value),
          ]),
        ).toString();
        navigate(url.pathname + url.search);
      }}
    >
      <p role="status" className="catalog-update">
        {pending ? "Updating the collection…" : ""}
      </p>
      <div aria-busy={pending}>{children}</div>
    </div>
  );
}
