import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RecoveryLinkCatcher } from "@/components/recovery-link-catcher";
import { ORG_NAME } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: ORG_NAME,
  description: "Track interviews and payouts for external panelists",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RecoveryLinkCatcher />
        {children}
      </body>
    </html>
  );
}
