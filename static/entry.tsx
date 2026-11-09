// Standalone entry: renders the same site without a Next.js server, so it can
// be hosted as plain static files (see scripts/build-static.mjs). Pages are
// switched with simple in-memory state instead of URLs.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../resources/fonts/fonts.css";
import "../app/globals.css";
import SiteShell from "../components/SiteShell";
import LandingPage from "../components/LandingPage";
import ContactPage from "../components/contact/ContactPage";

function StaticApp() {
  const [path, setPath] = useState("/");
  return (
    <SiteShell pathname={path} push={setPath}>
      {path === "/contact" ? <ContactPage /> : <LandingPage />}
    </SiteShell>
  );
}

document.documentElement.classList.add("is-loading");
createRoot(document.getElementById("root")!).render(<StaticApp />);
