export const demoCookie = "lyor-demo-session";

const identities = {
  "demo-customer-a": {
    id: "customer-a",
    role: "customer",
    name: "Aarav · demo customer",
  },
  "demo-customer-b": {
    id: "customer-b",
    role: "customer",
    name: "Ananya · demo customer",
  },
  "demo-catalog": {
    id: "catalog-manager",
    role: "catalog",
    name: "Demo catalog manager",
  },
  "demo-admin": {
    id: "system-admin",
    role: "admin",
    name: "Demo administrator",
  },
};

export function demoEnabled() {
  return (
    process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true"
  );
}

export function demoIdentity(key?: string) {
  return demoEnabled() && key && Object.hasOwn(identities, key)
    ? identities[key as keyof typeof identities]
    : null;
}
