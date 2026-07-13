import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyPilot AI",
  description: "Your AI-assisted command center for discovering, saving, and tracking career opportunities.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg" }
};

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem('applypilot-theme');
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
