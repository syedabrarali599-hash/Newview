# New View — landing page

The New View studio landing page, built from the **Final Webiste Themes** page in Figma (frames _Website_ and _Loading_).

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** + TypeScript | Static pre-rendering, image/font handling, easy hosting (Vercel, Netlify, any Node host). |
| Animation | **GSAP 3.15** + **ScrollTrigger** + **SplitText** | Industry standard for timeline and scroll choreography; SplitText powers the word and line reveals. |
| Smooth scroll | **Lenis** | Subtle, natural-feeling inertia, driven by GSAP's ticker so ScrollTrigger stays in sync. |
| Interactivity | Canvas 2D + SVG | Pixel-art particles, the hero pixel trail and the CTA illustration, with no heavy WebGL dependency. |
| Fonts | Self-hosted via Fontsource | No network dependency at build time. |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## What's animated

- **Loader** – counter and progress bar, then six orange panels wipe up to reveal the page.
- **Hero** – nav drops in; the headline reveals word by word (fade from 0 → 100%, blur → sharp); the copy rises line by line; the button wipes in. The glasses frame is interactive: the pixel grid lights up under the cursor (click for a ripple), the glasses tilt in 3D with a moving lens shine, and two "multiplayer" cursors drift after yours.
- **About** – both paragraphs sit at 50% opacity and fill in line by line as you scroll.
- **Section headings** – every heading uses the same word-by-word reveal (`lib/animations.ts → revealHeading`).
- **Services** – the four cards stack (sticky). Each card sinks back as the next slides over it, and its content animates in. The pixel art is rebuilt from the Figma illustrations as spring-loaded particles that scatter from your cursor. The ghost's eyes follow you, the cherries sway, the potion bubbles and the heart beats faster when you're near.
- **Work** – cards appear one after another; on hover the image zooms and the arrow nudges right. The orange "saved for you" card flips to white with dark text and an orange arrow button.
- **Process** – the orange panel rises from the bottom while scaling up to fill the viewport. It then pins while the braces glide in and the statement arrives from the right. Each step slides in from its own side (left, right, left, right). "Let's Make It Happen" pops in; on hover it behaves like a selected Figma frame (selection outline, handles, frame name, live size badge).
- **Getting started** – cards fade up in sequence; each illustration has its own hover animation.
- **What makes us different** – heading, toggle, card and button appear first, then the big logo draws itself, then the gradient blooms behind it. The toggle really works: it switches between the "with" and "without New View" lists.
- **Testimonials** – a simple staggered fade-up; on small screens the cards become a swipeable slider with working dots.
- **CTA** – the frame outline draws itself, the corner handles snap on, the orange fill expands, then the copy, button and illustration appear. The illustration is interactive: your cursor is followed, the bulb glows as you approach (click it to toggle), and the windows parallax.

Everything respects `prefers-reduced-motion`.

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

## Things to swap in

- **Display font** – the design uses *Season Mix* (a licensed trial font). The site falls back to Newsreader, the closest open-source match. To use the real font, add the files to `public/fonts/` and an `@font-face` named `"Season Mix"` in `app/globals.css`; it's already first in `--font-display`.
- **Project thumbnails** – `public/work/*.svg` are mockups standing in for the real project screenshots, which couldn't be exported because the Figma connection hit its plan limit. Replace them with real images and update the paths in `components/Work.tsx`.
- **Links** – CTAs open an email to `hello@newview.co` (see `lib/site.ts`). The social links point to each network's home page, and the "View Project" links scroll to the work section.

## Structure

```
app/            layout, global styles, page
components/     one component (+ CSS module) per section
  PixelArt.tsx       interactive canvas pixel-art engine
  pixelArt.data.ts   32×32 pixel data sampled from the Figma art
  HeroPlayground.tsx hero grid trail, glasses tilt, follower cursors
lib/            GSAP setup, shared animations, site constants
public/assets   images exported from Figma
public/work     project thumbnails (placeholders)
```
