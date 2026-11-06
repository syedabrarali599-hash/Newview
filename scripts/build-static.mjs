// Bundles the site into a single self-contained index.html (+ fonts and images)
// that can be hosted anywhere static files are served, under any base path.
// Fonts and images come from /resources and are fingerprinted into assets/.
import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const out = "dist-static";
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const result = await build({
  entryPoints: ["static/entry.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  write: false,
  outdir: out,
  publicPath: ".",
  assetNames: "assets/[name]-[hash]",
  loader: {
    ".woff2": "file",
    ".woff": "file",
    ".png": "file",
    ".jpg": "file",
    ".webp": "file",
    ".svg": "file",
  },
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: "tsconfig.json",
  logLevel: "error",
});

let js = "";
let css = "";
for (const file of result.outputFiles) {
  if (file.path.endsWith(".js")) js = file.text;
  else if (file.path.endsWith(".css")) css = file.text;
  else {
    await mkdir(path.dirname(file.path), { recursive: true });
    await writeFile(file.path, file.contents);
  }
}

// Inline CSS and JS so the page needs nothing but its fonts and images.
js = js.replace(/<\/script/gi, "<\\/script");
css = css.replace(/<\/style/gi, "<\\/style");

const html = `<title>New View</title>
<meta name="description" content="New View brings experienced designers directly to your team. Brand identity, web &amp; app UI, design systems and marketing assets.">
<meta name="theme-color" content="#fcf8f0">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
await writeFile(path.join(out, "index.html"), html);
console.log(`Built ${out}/index.html (${(html.length / 1024).toFixed(0)} KB)`);
