import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PriceSummary } from "../src/components/price-summary";
import { money } from "../src/lib/types";
describe("checkout price disclosure", () => {
  it("shows each charge and explicitly says no money is collected", () => {
    render(
      <PriceSummary
        breakdown={{
          subtotalPaise: 89900,
          depositPaise: 0,
          deliveryPaise: 19900,
          gstPaise: 19764,
          totalPaise: 129564,
          currency: "INR",
          taxLabel: "Synthetic demo GST (18%)",
        }}
      />,
    );
    expect(screen.getByText("Demo delivery fee")).toBeInTheDocument();
    expect(screen.getByText("Demo GST (18%)")).toBeInTheDocument();
    expect(screen.getByText("₹1,295.64")).toBeInTheDocument();
    expect(
      screen.getByText("Synthetic policy. Nothing is charged."),
    ).toBeInTheDocument();
  });
  it("formats paise without losing fractional charges", () => {
    expect(money(129564)).toBe("₹1,295.64");
    expect(money(89900)).toBe("₹899");
  });
});
