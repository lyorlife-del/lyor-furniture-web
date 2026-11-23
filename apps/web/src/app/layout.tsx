import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StoreProvider } from "@/components/store-provider";
import { demoCookie, demoIdentity } from "@/lib/demo-session";
import "./globals.css";
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
        <StoreProvider initialSession={session}>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
