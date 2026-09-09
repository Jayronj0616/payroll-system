import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import NavBar from "@/components/NavBar";
import OwnerSidebar from "@/components/OwnerSidebar";
import DemoBanner from "@/components/DemoBanner";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session";
import { DEMO_USERNAME } from "@/lib/demo";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Payroll Management System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieValue = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(cookieValue);
  // Superadmin sessions have no account_id by construction (see lib/session.ts).
  // They get a distinct sidebar shell instead of the tenant topbar — both so
  // there's room for the console to grow, and so it's visually unmistakable
  // you're in platform admin, not a tenant workspace.
  const isOwner = session?.accountId === null;

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {session?.username === DEMO_USERNAME && <DemoBanner />}
        {session && isOwner && (
          <div className="flex min-h-screen">
            <OwnerSidebar username={session.username} />
            <main className="flex-1 px-4 py-8 max-w-[1800px] mx-auto w-full">{children}</main>
          </div>
        )}
        {session && !isOwner && (
          <>
            <NavBar username={session.username} role={session.role} />
            <main className="container mx-auto px-4 py-8 max-w-[1800px]">{children}</main>
          </>
        )}
        {!session && children}
      </body>
    </html>
  );
}
