import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyPilot AI",
  description: "Your AI-assisted command center for every career opportunity.",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
