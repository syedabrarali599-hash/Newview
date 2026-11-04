// Standalone entry: renders the same site without a Next.js server, so it can
// be hosted as plain static files (see scripts/build-static.mjs).
import { createRoot } from "react-dom/client";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/inter-tight/index.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/carlito/latin-700.css";
import "../app/globals.css";
import Experience from "../components/Experience";

document.documentElement.classList.add("is-loading");
createRoot(document.getElementById("root")!).render(<Experience />);
