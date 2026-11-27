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
  const staff = session && ["catalog", "admin"].includes(session.role);
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">Staff demo</p>
        <h1>Catalogue operations</h1>
        <p className="muted">
          Review listing publication, local stock and integration exceptions.
        </p>
      </div>
      <IdentityPicker />
      {staff ? (
        <AdminTools key={session.id} canReplay={session.role === "admin"} />
      ) : (
        <p className="notice mt-6">
          Choose a staff demo identity to manage listings. Permissions are
          enforced by the API.
        </p>
      )}
    </section>
  );
}

function AdminTools({ canReplay }: { canReplay: boolean }) {
  const [items, setItems] = useState<Listing[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const listings = await api<Listing[]>("admin/catalog");
      setItems(listings);
      if (canReplay) setEvents(await api<Event[]>("admin/exceptions"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [canReplay]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      api<Listing[]>("admin/catalog"),
      canReplay ? api<Event[]>("admin/exceptions") : Promise.resolve([]),
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
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canReplay]);
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
    <div aria-busy={busy || loading}>
      <div className="section-heading mt-8">
        <h2>Catalog publication</h2>
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => {
            setBusy(true);
            void load();
          }}
        >
          Refresh
        </Button>
      </div>
      {error ? (
        <p className="notice error-notice" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="notice" role="status">
          Loading catalogue operations…
        </p>
      ) : null}
      {!loading && !items.length && !error ? (
        <p className="notice">No listings in this catalogue.</p>
      ) : null}
      {items.length ? (
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
                  <td>
                    <span
                      className="status-pill"
                      data-tone={item.published ? undefined : "neutral"}
                    >
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </td>
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
      ) : null}
      {canReplay && !loading ? (
        <>
          <h2 className="mt-10">Integration exceptions</h2>
          <p className="small-note">
            No live integrations. The local worker must be running to process
            pending requests.
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
                        await api("admin/exceptions/" + event.id + "/replay", {
                          method: "POST",
                          body: JSON.stringify({}),
                        });
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
          ) : !error ? (
            <div className="notice">No integration exceptions.</div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
