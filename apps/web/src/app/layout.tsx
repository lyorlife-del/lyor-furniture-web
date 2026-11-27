import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StoreProvider } from "@/components/store-provider";
import { locationCatalogueEnabled, readCatalogPreference } from "@/lib/catalog-location";
import { demoCookie, demoIdentity } from "@/lib/demo-session";
import "./globals.css";
import "./editorial-home.css";
import "./marketplace.css";
export const metadata: Metadata = {
  title: {
    default: "LYOR Furniture — Make room for life",
    template: "%s | LYOR Furniture",
  },
  description:
    "Thoughtful furniture for the way you live. Explore the LYOR rental, purchase and room-bundle demo.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = demoIdentity((await cookies()).get(demoCookie)?.value);
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <StoreProvider initialSession={session} catalogueLocation={locationCatalogueEnabled()}
          initialPreference={await readCatalogPreference().catch(() => null)}>
          <Header
            currentLocation={process.env.LOCATION_DETECTION_ENABLED === "true"}
            databaseServiceability={
              process.env.LOCATION_SERVICEABILITY_ENABLED === "true"
            }
          />
          <main id="main-content">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
