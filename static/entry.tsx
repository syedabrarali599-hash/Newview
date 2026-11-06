// Standalone entry: renders the same site without a Next.js server, so it can
// be hosted as plain static files (see scripts/build-static.mjs).
import { createRoot } from "react-dom/client";
import "../resources/fonts/fonts.css";
import "../app/globals.css";
import Experience from "../components/Experience";

document.documentElement.classList.add("is-loading");
createRoot(document.getElementById("root")!).render(<Experience />);
