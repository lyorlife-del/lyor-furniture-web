"use client";
import { useState } from "react";
import { Button } from "@lyor/ui";
import { useStore } from "./store-provider";
import { errorMessage } from "@/lib/api";
export function IdentityPicker({
  customersOnly = false,
}: {
  customersOnly?: boolean;
}) {
  const { session, signIn, signOut } = useStore();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const choices = [
    ["demo-customer-a", "Aarav", "Demo customer A"],
    ["demo-customer-b", "Ananya", "Demo customer B"],
    ...(!customersOnly
      ? [
          ["demo-catalog", "Catalog manager", "Publication permissions"],
          ["demo-admin", "Administrator", "Publication and replay permissions"],
        ]
      : []),
  ];
  async function select(id?: string) {
    setBusy(true);
    setError("");
    try {
      if (id) await signIn(id);
      else await signOut();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <h2>{session ? "Your demo identity" : "Try it as a customer."}</h2>
      <p className="small-note">
        Local test identities only. No OTP, password or real account is created.
      </p>
      {session ? (
        <div>
          <p>{session.name}</p>
          <Button variant="outline" disabled={busy} onClick={() => select()}>
            Sign out of demo
          </Button>
        </div>
      ) : (
        <div className="identity-grid">
          {choices.map(([id, name, description]) => (
            <button
              key={id}
              className="identity-choice"
              disabled={busy}
              onClick={() => select(id)}
            >
              <strong>{name}</strong>
              <small>{description}</small>
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p className="notice error-notice mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
