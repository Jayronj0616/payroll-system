import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import NavBar from "@/components/NavBar";
import OwnerSidebar from "@/components/OwnerSidebar";
import DemoBanner from "@/components/DemoBanner";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session";
import { DEMO_USERNAME } from "@/lib/demo";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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
  // The landing page has its own header and must never sit inside the app
  // shell, even for a visitor who still has a session cookie. middleware.ts
  // forwards the path as x-pathname since layouts can't read it directly.
  const showShell = !!session && headers().get("x-pathname") !== "/";

  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {showShell && session?.username === DEMO_USERNAME && <DemoBanner />}
        {showShell && isOwner && (
          <div className="flex min-h-screen">
            <OwnerSidebar username={session.username} />
            <main className="flex-1 px-4 py-8 max-w-[1800px] mx-auto w-full">{children}</main>
          </div>
        )}
        {showShell && !isOwner && (
          <>
            <NavBar username={session.username} role={session.role} />
            <main className="container mx-auto px-4 py-8 max-w-[1800px]">{children}</main>
          </>
        )}
        {!showShell && children}
      </body>
    </html>
  );
}
