# New View — landing page

The New View studio landing page, built from the **Final Webiste Themes** page in Figma (frames _Website_ and _Loading_).

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** + TypeScript | Static pre-rendering, image/font handling, easy hosting (Vercel, Netlify, any Node host). |
| Animation | **GSAP 3.15** + **ScrollTrigger** + **SplitText** | Industry standard for timeline and scroll choreography; SplitText powers the word and line reveals. |
| Smooth scroll | **Lenis** | Subtle, natural-feeling inertia, driven by GSAP's ticker so ScrollTrigger stays in sync. |
| Interactivity | Canvas 2D + SVG | Pixel-art particles, the hero pixel trail and the CTA illustration, with no heavy WebGL dependency. |
| Fonts | Self-hosted from `resources/fonts` | Season Mix (display), Inter Tight (body), Inter (nav), Carlito (logo); no network dependency. |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
npm run build:static         # single static page in dist-static/ (host anywhere)
```

`build:static` bundles the same components with esbuild into one self-contained
`index.html`, plus its fonts and images. It works from any folder or sub-path,
which is how the hosted preview is published.

## What's animated

- **Loader** – brand orange from the first frame with the Figma ink counter and progress bar. When loading finishes the number rolls away and the orange breaks into square pixels that shrink away from the centre outwards, revealing the site (`components/Loader.tsx`). The previous six-panel wipe is in git history (commit 1898790) if you want it back.
- **Hero** – nav drops in; the headline reveals word by word (fade 0 → 100%, blur → sharp); copy rises line by line; the button wipes in. In the glasses frame the grid lights up in brand-orange pixels under the cursor (click for a ripple), the glasses tilt in 3D, and moving towards either pixel cursor makes it *your* cursor (one at a time).
- **About** – both paragraphs sit at 50% opacity and fill in line by line as you scroll.
- **Section headings & subcopy** – every heading uses the same word-by-word reveal; subcopy rises line by line.
- **Services** – the four cards stack (sticky). The pixel illustration stays in place while the next card's top edge sweeps up: the old art shows above the line, the new art below it, with a glitchy scan-line band where they meet, and the previous card's copy greys out. Each illustration gathers gently, pixel by pixel, as its card arrives. All four illustrations are original pixel art (pen nib, browser window, design-system tiles, megaphone) and react to the cursor. On phones each card carries its own illustration.
- **Work** – the real project images from Figma; cards appear one after another; on hover the image zooms and the arrow nudges right. On the orange "saved for you" card the pixels hop to new grid cells and the arrow shoots up and back in.
- **Process** – the orange panel rises from the bottom while scaling up to fill the viewport; the statement arrives from the right; each step slides in from its own side. "Let's Make It Happen" keeps the exact design (white frame, corner handles); on hover the handles stretch outwards and pixels fill the frame black.
- **Getting started** – cards fade up in sequence; each pixel illustration (chat, checklist, rocket) assembles on arrival and animates on hover.
- **What makes us different** – heading, toggle, card and button first, then the big logo draws itself, then the gradient blooms. The toggle switches between the "with" and "without New View" lists.
- **Testimonials** – a staggered fade-up; a swipeable slider with working dots on small screens.
- **CTA** – quick (~1.4s): the frame outline draws, handles snap on, the orange fills in, then copy, button and a minimal pixel idea → wireframe → design illustration at the Figma image size. The dotted arrows pulse towards their heads, the bulb glows as you approach and the white cursor follows yours.
- **Navigation** – Home, About, Services, Work and Contact, with the current section highlighted; a full-screen menu on phones.
- **Every CTA button** – hover grows square pixels outward from where the cursor entered until the button is solid black (`lib/pixelHover.ts`).

Everything respects `prefers-reduced-motion`.

## Pages

- `/` — landing page (`components/LandingPage.tsx`).
- `/contact` — contact page (`components/contact/`): "Let's Connect" intro, Book a Free Call, phone/WhatsApp/email, the enquiry form and the **Pixel Stack** game.

Every CTA and "Contact" link leads to `/contact`; the logo and "< Home" lead back to `/`. Moving between pages uses a pixel transition (`lib/pixelWipe.ts`, `components/SiteShell.tsx`): orange pixels grow from where you clicked to cover the screen, then dissolve to reveal the next page. The loading animation only plays on the very first visit.

## Contact form

The form posts to `/api/contact` (`app/api/contact/route.ts`), which validates the message, filters spam (hidden honeypot field + a simple rate limit) and forwards it to a **Google Apps Script** that adds a row to a Google Sheet and emails you.

One-time setup (about 5 minutes, free — no paid Vercel features needed):

1. Create a Google Sheet, open **Extensions → Apps Script**, paste `integrations/google-apps-script/contact-form.gs`, and set `NOTIFY_EMAIL` and `SECRET` at the top. Leave `NOTIFY_EMAIL` as `""` if you only want the sheet.
2. Pick **testSetup** in the function menu and click **Run**, allowing the permissions. A test row appears (and a test email, if `NOTIFY_EMAIL` is set).
3. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone* (not "Anyone with a Google account"). Copy the web app URL (ends in `/exec`).
4. In Vercel → Project → Settings → Environment Variables add `CONTACT_WEBHOOK_URL` (the URL) and `CONTACT_WEBHOOK_SECRET` (same value as `SECRET`) for Production and Preview, then redeploy. See `.env.example`.
5. Open `/api/contact` on the deployed site in a browser. It checks the connection (nothing is saved) and says exactly what to fix if something's wrong.

After editing the script, publish the change with **Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy** — the web app keeps running the old version until you do. If a message fails to send, the reason is also written to the Vercel logs (lines starting with `[contact]`).

Each enquiry appears in the "Enquiries" tab (downloadable as Excel) and arrives as an email with Reply-To set to the sender. Until the variables are set, the form shows a friendly "please email us" message. The static preview build can't send messages and says so.

## Pixel Stack (contact page game)

A falling-blocks puzzle on the contact-page grid (`components/contact/StackGame.tsx`): click the grid to start; ← → move, ↑ rotates, ↓ drops faster, Space drops instantly, P pauses; on touch screens tap to rotate, swipe to move, swipe down to drop. The whole grid is the playfield, with 38px blocks (2 × 2 grid squares). Full rows clear in a burst of pixels. A panel at the bottom right shows the score, lines, level, best score (saved in the browser), the next piece and the arrow-key controls; on phones it becomes a slim bar under the field. It pauses automatically when scrolled out of view.

## Copy changes

The design's placeholder button labels were replaced:

| Where | Before | Now |
| --- | --- | --- |
| Brand Identity card | (Change Copy) | Build your brand |
| Web & App UI Design card | (Change Copy) | Design your product |
| Design Systems card | (Change Copy) | Scale with a system |
| Marketing & Creative Assets card | (Change Copy) | Launch a campaign |
| What makes us different | (Change Copy) | Work with us |

The work cards all shared the same truncated placeholder description, so each now has its own one-liner. The "without New View" list is new copy for the toggle.

## Resources folder

All fonts and images are kept in `resources/` at the project root — add any new image or font there. Images are imported in `lib/assets.ts` (the bundler fingerprints and serves them); fonts are declared in `resources/fonts/fonts.css`.

Images are shipped as compressed WebP; the full-size source files are kept in `resources/images/originals/` (not loaded by the site).

## Performance notes

- Pixel-art canvases draw at 1 canvas pixel per CSS pixel and are scaled up crisply with `image-rendering: pixelated`, and they skip frames when nothing changes.
- The service-stack transition is computed from cached geometry plus `scrollY` (no layout reads per frame).
- Large layers only animate `opacity`/`transform` (GPU-composited); no backdrop blur or filters on big areas.

## Things to swap in

- **Fonts** – everything lives in `resources/fonts` (declared in `resources/fonts/fonts.css`). Season Mix Regular and Medium come from `season-font-family.zip` (also kept there) and were converted to WOFF2. That download is a *trial, personal-use-only* licence — buy the commercial licence before the site goes live.
- **Pixel illustrations** – drawn in `scripts/gen-pixel-art.py`; run `python3 scripts/gen-pixel-art.py` after editing to regenerate `components/pixelArt.data.ts`.
- **Links** – every contact detail and profile lives in `lib/site.ts`: email, phone (also used for WhatsApp), the Cal.com booking link behind "Book a Free Call", and the footer's social profiles. A profile left empty there (LinkedIn and Facebook for now) hides its footer icon. The "View Project" links scroll to the work section.

## Structure

```
app/            layout, global styles, page
components/     one component (+ CSS module) per section
  PixelArt.tsx       interactive canvas pixel-art engine
  pixelArt.data.ts   32×32 pixel data sampled from the Figma art
  HeroPlayground.tsx hero grid trail, glasses tilt, follower cursors
lib/            GSAP setup, shared animations, site constants, assets.ts
                (assets.ts imports each image from resources/images)
resources/
  fonts/        all web fonts + fonts.css (and the original font zip)
  images/       every image the site uses (hero, cursors, logo, work/…)
```
