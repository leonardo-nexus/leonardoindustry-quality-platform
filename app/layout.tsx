import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leonardo Quality",
  description:
    "Piattaforma integrata qualità, sicurezza, ambiente e saldatura del gruppo Leonardoindustry",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
