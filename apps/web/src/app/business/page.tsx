"use client";
import { useState } from "react";
import { Button } from "@lyor/ui";
import { Plus, Building2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
export default function Business() {
  const [sites, setSites] = useState([{ id: 1 }]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState(""),
    [key, setKey] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget),
      id = key || crypto.randomUUID();
    setKey(id);
    try {
      const data = await api<{ id: string }>("b2b/enquiries", {
        method: "POST",
        headers: { "Idempotency-Key": id },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          company: form.get("company"),
          mode: form.get("mode"),
          consent: form.get("consent") === "on",
          sites: sites.map((site) => ({
            name: form.get("site-name-" + site.id),
            pin: form.get("site-pin-" + site.id),
            units: Number(form.get("site-units-" + site.id)),
          })),
        }),
      });
      setReceipt(data.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-wrap page-space">
      <div className="business-intro">
        <p className="eyebrow">LYOR FOR BUSINESS</p>
        <h1>
          Big plans.
          <br />
          Thoughtful spaces.
        </h1>
        <p>
          From a new office to a co-living community, start with the spaces you
          want to create. Tell us about each site in one enquiry.
        </p>
      </div>
      <div className="two-column">
        {receipt ? (
          <div className="panel" role="status">
            <h2>Your demo enquiry is saved.</h2>
            <p>Reference: {receipt}</p>
            <p className="muted">
              This receipt exists only in the local database. No sales team, CRM
              or property service has been contacted.
            </p>
          </div>
        ) : (
          <form
            className="panel"
            onSubmit={submit}
            onChange={() => {
              if (key) setKey("");
            }}
          >
            <h2>Tell us about your project.</h2>
            <p className="small-note">
              Use fictional details only. No external message is sent.
            </p>
            <div className="field-row">
              <div>
                <label htmlFor="b-name">Your name</label>
                <input
                  id="b-name"
                  name="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor="b-company">Business name</label>
                <input
                  id="b-company"
                  name="company"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label htmlFor="b-email">Work email</label>
                <input
                  id="b-email"
                  name="email"
                  type="email"
                  maxLength={150}
                  required
                />
              </div>
              <div>
                <label htmlFor="b-phone">Phone</label>
                <input
                  id="b-phone"
                  name="phone"
                  inputMode="tel"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <label htmlFor="b-mode">I’m interested in</label>
            <select id="b-mode" name="mode">
              <option value="rent">Furniture rental</option>
              <option value="buy">Furniture purchase</option>
            </select>
            <h3 className="mt-7">Your sites</h3>
            {sites.map((site, index) => (
              <fieldset className="site-row" key={site.id}>
                <legend>Site {index + 1}</legend>
                <label htmlFor={"site-name-" + site.id}>Site name</label>
                <input
                  id={"site-name-" + site.id}
                  name={"site-name-" + site.id}
                  minLength={2}
                  maxLength={80}
                  required
                />
                <div className="field-row">
                  <div>
                    <label htmlFor={"site-pin-" + site.id}>PIN</label>
                    <input
                      id={"site-pin-" + site.id}
                      name={"site-pin-" + site.id}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={"site-units-" + site.id}>
                      Estimated units
                    </label>
                    <input
                      id={"site-units-" + site.id}
                      name={"site-units-" + site.id}
                      type="number"
                      min={1}
                      max={1000}
                      required
                    />
                  </div>
                </div>
                {sites.length > 1 ? (
                  <button
                    type="button"
                    className="remove-button mt-3"
                    onClick={() => {
                      setSites(sites.filter((s) => s.id !== site.id));
                      setKey("");
                    }}
                  >
                    Remove site {index + 1}
                  </button>
                ) : null}
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={sites.length >= 10}
              onClick={() => {
                setSites([...sites, { id: Date.now() }]);
                setKey("");
              }}
            >
              <Plus size={16} />
              Add another site
            </Button>
            <label className="mt-6">
              <input type="checkbox" name="consent" required />
              <span>
                I consent to storing these fictional details in the local demo
                database.
              </span>
            </label>
            {error ? (
              <p role="alert" className="notice error-notice">
                {error}
              </p>
            ) : null}
            <Button className="mt-5" disabled={busy}>
              {busy ? "Saving…" : "Save demo enquiry"}
            </Button>
          </form>
        )}
        <aside className="panel">
          <Building2 size={32} />
          <h2 className="mt-5">More than one address.</h2>
          <p className="muted">
            Keep your site names, quantities and locations together, without
            losing the details that make each project different.
          </p>
          <div className="demo-callout mt-6">
            Demo only. Commercial pricing, contracts, site surveys and delivery
            commitments require a later verified integration.
          </div>
        </aside>
      </div>
    </section>
  );
}
