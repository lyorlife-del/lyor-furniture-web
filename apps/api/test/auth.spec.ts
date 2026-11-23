import { identity } from "../src/common/auth";
describe("local identity boundary", () => {
  const initialMode = process.env.DEMO_MODE,
    initialEnvironment = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    process.env.NODE_ENV = "test";
  });
  afterAll(() => {
    if (initialMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = initialMode;
    if (initialEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = initialEnvironment;
  });
  it("rejects inherited object properties as credentials", () => {
    expect(() => identity("__proto__")).toThrow("Select a local demo identity");
    expect(() => identity("toString")).toThrow("Select a local demo identity");
  });
  it("maps only explicit test credentials", () => {
    expect(identity("Bearer demo-customer-a")).toEqual({
      id: "customer-a",
      role: "customer",
    });
  });
  it("rejects test credentials in production", () => {
    process.env.NODE_ENV = "production";
    expect(() => identity("Bearer demo-admin")).toThrow(
      "Demo identities are disabled",
    );
  });
});
