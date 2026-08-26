import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session";

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

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {session && <NavBar username={session.username} role={session.role} />}
        {session ? (
          <main className="container mx-auto px-4 py-8 max-w-[1800px]">{children}</main>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
