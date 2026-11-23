"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@lyor/ui";
import { IdentityPicker } from "@/components/identity-picker";
import { useStore } from "@/components/store-provider";
import { api, errorMessage } from "@/lib/api";
type Listing = {
  id: string;
  name: string;
  active: boolean;
  published: boolean;
  stock: number;
};
type Event = {
  id: string;
  orderId: string;
  status: string;
  attempts: number;
  lastError: string | null;
};
export default function Admin() {
  const { session } = useStore();
  const [items, setItems] = useState<Listing[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const staff = session && ["catalog", "admin"].includes(session.role);
  const load = useCallback(async () => {
    try {
      const listings = await api<Listing[]>("admin/catalog");
      setItems(listings);
      if (session?.role === "admin")
        setEvents(await api<Event[]>("admin/exceptions"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [session]);
  useEffect(() => {
    if (!staff) return;
    let active = true;
    void Promise.all([
      api<Listing[]>("admin/catalog"),
      session?.role === "admin"
        ? api<Event[]>("admin/exceptions")
        : Promise.resolve([]),
    ])
      .then(([listings, exceptions]) => {
        if (active) {
          setItems(listings);
          setEvents(exceptions);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [staff, session]);
  async function publish(item: Listing) {
    setBusy(true);
    try {
      await api("admin/catalog/" + item.id, {
        method: "PATCH",
        body: JSON.stringify({ published: !item.published }),
      });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">STAFF DEMO</p>
        <h1>A considered collection, behind the scenes.</h1>
      </div>
      <IdentityPicker />
      {!staff ? (
        <p className="notice mt-6">
          Choose a staff demo identity to manage listings. Permissions are
          enforced by the API.
        </p>
      ) : (
        <>
          <div className="section-heading mt-8">
            <h2>Catalog publication</h2>
            <Button variant="outline" disabled={busy} onClick={load}>
              Refresh
            </Button>
          </div>
          {error ? (
            <p className="notice error-notice" role="alert">
              {error}
            </p>
          ) : null}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>SKU eligibility</th>
                  <th>Demo stock</th>
                  <th>Publication</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.active ? "Active" : "Inactive"}</td>
                    <td>{item.stock}</td>
                    <td>{item.published ? "Published" : "Draft"}</td>
                    <td>
                      <Button
                        disabled={busy || (!item.active && !item.published)}
                        variant="outline"
                        onClick={() => publish(item)}
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {session?.role === "admin" ? (
            <>
              <h2 className="mt-10">Integration exceptions</h2>
              <p className="small-note">
                No live integrations. The local worker must be running to
                process pending requests.
              </p>
              {events.length ? (
                events.map((event) => (
                  <div className="order-card" key={event.id}>
                    <h3>
                      {event.status} · {event.orderId.slice(0, 8)}
                    </h3>
                    <p>{event.lastError ?? "Awaiting the local demo worker"}</p>
                    <p className="small-note">Attempts: {event.attempts}</p>
                    {event.status === "failed" ? (
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api(
                              "admin/exceptions/" + event.id + "/replay",
                              { method: "POST" },
                            );
                            await load();
                          } catch (e) {
                            setError(errorMessage(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Request audited replay
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="notice">No integration exceptions.</div>
              )}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
