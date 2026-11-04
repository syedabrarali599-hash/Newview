import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/inter-tight/index.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/carlito/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "New View — Every brand needs a new view",
  description:
    "New View brings experienced designers directly to your team. Brand identity, web & app UI, design systems and marketing assets — without agency layers.",
  icons: { icon: "/assets/logo-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#fcf8f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="is-loading" suppressHydrationWarning>
      <body>
        <noscript>
          <style>{`.js-reveal{visibility:visible!important}html.is-loading,html.is-loading body{overflow:auto;height:auto}[data-loader]{display:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
