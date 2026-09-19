# NoteReel — Brand & Media Brief (context for an AI brand/media generator)

Use this document as the single source of truth when generating any visual, copy, logo, icon, illustration,
screenshot, video or marketing asset for NoteReel. When something here conflicts with a request, ask; don't guess.

---

## 1. The product in one paragraph

NoteReel is an iOS-style web app (installable PWA) for small-business owners. The owner types a few rough notes —
"cinnamon oat latte, $4.50, this weekend only" — and an AI creative team turns them into a finished, ready-to-post
vertical video ad (Instagram Reel / TikTok / Meta ad): hook, 4–8 shots, on-screen captions in the brand's color,
voiceover, music, a Reel caption with hashtags, and three Meta ad copy variants for A/B testing. Exports in 9:16,
1:1 and 4:5.

Under the hood: NVIDIA Nemotron models on Nebius Token Factory write the brief, direct the Reel and quality-check
every frame; generative media models (via fal.ai) "shoot" the shots; the video is rendered on Nebius Serverless.

- **One-line pitch:** Type quick notes. Get a Reel that sells.
- **Category:** AI content creation / social media marketing for small businesses.
- **Context:** Entry in the Nebius x NVIDIA Global AI Hackathon, "Best Apps and Agents" track. Judges score
  design ("a complete, coherent product experience, not a proof of concept"), impact, idea and tech.

## 2. Audience

**Primary:** owners and solo marketers of small local businesses — cafés, bakeries, candle/gift shops, salons,
boutiques, gyms, restaurants, event venues. Age ~25–50. Busy, not designers, not video editors. They post from
their phone between customers. They want sales and foot traffic, not "content".

**Their pain:** they know Reels sell, but making one takes hours (ideas, filming, editing, captions), agencies are
expensive, and generic AI tools give generic results.

**Secondary:** freelance social media managers handling several small clients.

**Also reading:** hackathon judges (technical, design-literate) — assets must look polished and credible.

## 3. Positioning & personality

- **Promise:** your notes in, a Reel that sells out.
- **Personality:** a friendly, confident creative director in your pocket. Warm, quick, practical, a little
  playful. Never corporate, never hype-y, never "AI magic ✨✨✨" overload.
- **Feels like:** a native Apple app crossed with a creative studio — clean, calm UI; the content (the Reel) is the
  colorful part.
- **Not:** a complex editor, a Canva clone with a thousand templates, or a techy dashboard.

Brand words: **simple · fast · warm · confident · made-for-selling**.

## 4. Name & wordmark

- Name: **NoteReel** — one word, capital N and capital R. Never "Note Reel", "Notereel" or "NOTEREEL" in running
  text (all caps is fine only as a stylistic label).
- Meaning: Note (what you type) → Reel (what you get). Visual metaphors that work: a note/memo turning into a
  vertical video; a text line becoming a play button; a sticky note sliding into a phone frame.

## 5. Logo

**Current app icon** (`app/public/icons/icon.svg`, 512×512):
- Rounded square (iOS squircle, corner radius ≈ 22% / rx 112 at 512) filled with a diagonal linear gradient
  **#FF6B35 (top-left) → #E4405F (bottom-right)**.
- Centered white outline of a vertical phone/Reel frame (portrait rounded rectangle, 200×288 at 512, stroke 28,
  corner radius 36).
- White solid play triangle inside the frame.

Requirements for any logo work:
- Keep the core idea: **vertical frame + play** on the warm orange→pink gradient. Improvements welcome (e.g. a small
  note/text line, a folded corner, a spark), but it must stay legible at 29×29 px and work as a maskable PWA icon
  (important content inside the central 80% safe zone).
- Variants needed: app icon (gradient bg), monochrome white glyph, monochrome dark glyph, horizontal lockup
  (icon + "NoteReel" wordmark), stacked lockup.
- Wordmark: bold rounded-geometric sans (see Typography), tight tracking (−1% to −2%), sentence case "NoteReel".
- Clear space: at least the height of the play triangle on all sides. Minimum size: 24 px icon, 80 px wide lockup.
- Don'ts: no 3D/bevel, no drop shadows on the mark, no rainbow gradients, no robot/brain/sparkle-only marks, no
  film-strip clichés, no text inside the icon.

## 6. Color

### Brand colors (marketing, icon, highlights)
| Token | Hex | Use |
|---|---|---|
| Brand Orange | `#FF6B35` | gradient start, key accents, default brand-kit color |
| Brand Pink | `#E4405F` | gradient end |
| Brand Gradient | `#FF6B35 → #E4405F` (135°) | app icon, hero backgrounds, CTA moments in marketing |
| Ink | `#111111` | text on light marketing surfaces |
| Paper | `#FFF8F3` | warm off-white for marketing backgrounds |

### App UI colors (already implemented, iOS system palette — `app/src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| grouped (page bg) | `#F2F2F7` | `#000000` | screen background |
| card | `#FFFFFF` | `#1C1C1E` | grouped list cells, cards |
| label | `#000000` | `#FFFFFF` | primary text |
| secondary | `#3C3C43` @60% | `#EBEBF5` @60% | secondary text |
| separator | `#3C3C43` @29% | `#545458` @60% | hairlines |
| fill | `#787880` @12% | `#787880` @36% | chips, placeholders |
| tint | `#007AFF` | `#0A84FF` | buttons, links, active tab |
| green / red / orange | `#34C759` / `#FF3B30` / `#FF9500` | `#30D158` / `#FF453A` / `#FF9F0A` | status (ready / failed / QA warning) |
| bar | `#F9F9F9` @80% + blur | `#1D1D1D` @80% + blur | tab bar, nav bar |

Rules:
- The UI stays neutral (iOS system colors, blue tint). **Color comes from the content** — generated shots and each
  customer's own brand color on captions. Don't paint the UI orange.
- Brand gradient appears in: app icon, splash, onboarding hero, marketing site/OG images, demo video title cards.
- Every asset must work in **light and dark mode**. Contrast: text ≥ 4.5:1, large text/icons ≥ 3:1.
- Each customer's Reel captions use *their* Brand Kit color (white bold text on a rounded box at 90% opacity).

## 7. Typography

- **In the app:** the Apple system font stack
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif` (renders San Francisco on
  Apple devices). Sizes follow iOS: Large Title 34/bold, Title 20/bold, Body 17, Subhead 15, Footnote 13,
  Caption 11–12, Tab label 10.
- **In generated marketing assets** (images, video, slides): use **Inter** (free, SIL OFL) — Display/Bold 700–800
  for headlines, Regular/Medium 400–500 for body. Do not embed SF Pro in distributed assets (Apple license
  restricts it). Alternative display face if needed: **Plus Jakarta Sans** (OFL).
- Headlines: sentence case, short, tight tracking (−1% to −2%), line height 1.05–1.15.
- Reel captions (inside videos): bold/heavy sans, white on brand-color rounded box, max ~6 words per caption,
  centered in the lower third (~70% height).
- Numbers/prices stand out: "$4.50", "20% off" — never spelled out.

## 8. Voice & copywriting

**Voice:** friendly expert. Short sentences. Talks like a helpful creative director, not a robot.
- Use "you/your" (the owner) and "we"/"your director" (the app). Plain English, 6th–8th grade reading level.
- Lead with the outcome (sales, a finished Reel), not the tech.
- Mention the AI stack only where it builds trust (progress screen, "How it works", README, judges' materials):
  "Nemotron writes the brief", "Nemotron 3 Ultra directs", "Rendered on Nebius".
- Emoji: allowed sparingly (max 1 per line) in chips, onboarding and social captions. Never in errors or buttons.
- Buttons: verb-first, 1–3 words, Title Case for primary actions ("Make Reel", "Render video", "Save Brand Kit",
  "Regenerate shot").
- Errors: say what happened + what to do, no blame. "Couldn't reach the image service. Try again in a minute."
- Empty states: encouraging + one action. "No Reels yet — Create your first one".

**Existing copy (keep consistent):**
- Create screen title/subtitle: "Create" — "Your notes in, a Reel that sells out."
- Input header/footer: "What are you promoting?" — "Product, price, offer, deadline — rough notes are fine."
- Starter chips: "☕️ New product", "🏷️ Flash sale", "🎉 Event"
- Primary CTA: "Make Reel" / loading "Starting your director…"
- How it works: "Nemotron writes the brief" · "Nemotron 3 Ultra directs" · "Shots are generated" ·
  "Nemotron reviews every frame" · "Rendered on Nebius"
- Progress stages: Researching · Writing brief · Directing · Shooting & QA · Voice & ad copy · Rendering
- Brand Kit: "Every Reel is directed to match this."
- Export labels: "9:16 · Reels · TikTok · Stories", "1:1 · Feed post", "4:5 · Meta feed ad"

**Taglines to choose from / test:**
1. Type quick notes. Get a Reel that sells.
2. Your notes in, a Reel that sells out.
3. From "new latte, $4.50" to a Reel in minutes.
4. A creative director in your pocket.

**Words to avoid:** revolutionary, game-changing, unleash, supercharge, synergy, "AI-powered magic", leverage,
seamless (overused), content (prefer "Reel", "post", "ad").

## 9. Imagery & illustration style

**Hero/marketing imagery:** real-feeling small-business scenes — warm natural light, shallow depth of field,
lifestyle + product close-ups (coffee, candles, pastries, boutique clothes, flowers). Diverse, authentic people,
never stocky or overly posed. Warm color grade that sits well next to the orange→pink gradient.

**Signature visual motif — "Notes → Reel":** a handwritten/typed note card on the left transforming into a phone
showing a vertical Reel on the right, with an arrow, sparkle trail or 3–4 storyboard frames in between.

**Device mockups:** show the app inside a modern iPhone frame (generic, no Apple logo), on the brand gradient or a
warm Paper background. Show real screens: Create (notes + Make Reel), Project (preview player + storyboard strip +
progress list), Shot editor sheet, Export list.

**Illustrations (onboarding, empty states):** simple flat/2.5D, rounded shapes, 2–3 colors max (brand gradient +
neutrals), thick friendly strokes consistent with Lucide icon weight. No mascots, no robots, no glowing brains.

**Iconography:** Lucide icons (already used: Sparkles, Clapperboard, Palette, Share, Download, RefreshCw,
ChevronLeft/Right, Loader2, CheckCircle2, ScanEye, Video, Copy, Check). Stroke 1.8–2.2, rounded caps. New icons
must match Lucide style.

**Don't:** third-party brand logos or trademarks in generated imagery (Instagram/TikTok/Meta logos, Apple logo,
real store brands), visible fake text/garbled lettering, uncanny faces/hands, cold blue "tech" aesthetics,
neon cyberpunk, stock-photo handshakes.

## 10. Motion

- iOS-like springs (damping ~32, stiffness ~320), 200–350 ms fades, subtle scale (0.96–0.98) on tap.
- Reel preview: gentle Ken Burns push-in (≈1.00 → 1.12), caption pops up from +12 px with fade.
- Storyboard: shots fade in as they finish generating; spinners while pending; a pulsing "eye" while under QA.
- Marketing video/GIFs: quick cuts (1.5–3 s), text on screen, energetic but not frantic. No copyrighted music —
  use royalty-free/generated tracks only (hackathon rule).

## 11. UI layout principles (for mockups & new screens)

- Phone-width column (max ~448 px), centered on desktop; iOS large titles; inset grouped lists (rounded 12 px);
  bottom tab bar with 3 tabs: **Create · Reels · Brand** (icons Sparkles, Clapperboard, Palette).
- Primary button: full-width, 50 px tall, 14 px radius, tint blue, white 17 px semibold label.
- Bottom sheets for editing (grabber handle, rounded top corners 14 px).
- Reel thumbnails always 9:16 with rounded corners (12 px cards, 22 px for the main preview) and a caption strip.
- Respect safe areas (notch, home indicator). Touch targets ≥ 44 px.

## 12. Assets to produce (with specs and destination paths)

| Asset | Spec | Path |
|---|---|---|
| App icon (master) | 1024×1024 PNG + SVG, squircle gradient | `app/public/icons/icon.svg`, `icon-1024.png` |
| PWA icons | 192×192, 512×512 PNG; maskable 512 with 80% safe zone | `app/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| Apple touch icon | 180×180 PNG, no transparency | `app/public/icons/apple-touch-icon.png` |
| Favicon | 32×32/16×16 ICO or SVG | `app/src/app/favicon.ico` |
| Open Graph / social share image | 1200×630 PNG: tagline + phone mockup on gradient | `app/public/og.png` |
| iOS splash screens | 1290×2796 and 1179×2556, icon centered on Paper/black | `app/public/splash/` |
| Wordmark & lockups | SVG, light + dark versions | `brand/logo/` |
| Onboarding illustrations (3) | 1080×1080 SVG/PNG: "Write notes", "Your director plans", "Post & sell" | `app/public/onboarding/` |
| Empty-state illustration | 600×600 SVG, for "No Reels yet" | `app/public/illustrations/empty-reels.svg` |
| App screenshots (store-style) | 1290×2796, 5 screens with headline captions | `brand/screenshots/` |
| Demo video title & end cards | 1920×1080 and 1080×1920, logo + tagline + "Built with NVIDIA Nemotron on Nebius" | `brand/video/` |
| Devpost/YouTube thumbnail | 1280×720 | `brand/video/thumbnail.png` |

After generating PWA icons, update `app/public/manifest.webmanifest` icons array and `app/src/app/layout.tsx`
`metadata.icons` to reference them.

## 13. Partner attribution (hackathon)

- Allowed as plain text: "Built with NVIDIA Nemotron on Nebius Token Factory", "Rendered on Nebius Serverless".
- Do **not** recreate, redraw or imitate the NVIDIA, Nebius, Meta, Instagram, TikTok or Apple logos/brand marks in
  generated assets. If official partner logos are required, the team will add the official files manually.
- All assets must be original or properly licensed; no copyrighted music, fonts or images without a license.

## 14. Example copy blocks (ready to use)

**App Store-style screenshot headlines**
1. "Type your offer. That's it." (Create screen)
2. "Your AI director plans every shot." (progress + storyboard)
3. "Every frame checked before you post." (storyboard with QA badges)
4. "Tweak any shot in a tap." (shot editor sheet)
5. "Export for Reels, TikTok and Meta ads." (export list + player)

**Onboarding (3 cards)**
1. "Write a few notes" — "Product, price, deadline. Messy is fine."
2. "Your director takes it from there" — "Hook, shots, captions and voiceover, planned for you."
3. "Post it and sell" — "Download your Reel and three ready-to-run ad versions."

**Social post announcing NoteReel**
"Small business, big Reels. Type 'new latte, $4.50, this weekend' and get a scroll-stopping video ad in minutes —
captions, voiceover and all. Meet NoteReel."

**Short description (≤ 80 chars):** "Turn quick notes into Reels that sell — directed by AI, made for small business."

## 15. Quality checklist for every asset

- [ ] Looks native to iOS; calm UI, colorful content.
- [ ] Brand gradient only where specified; UI tint stays blue.
- [ ] Works in light and dark; contrast passes.
- [ ] Copy is short, outcome-first, in NoteReel's voice; no banned words.
- [ ] No third-party logos/trademarks, no garbled text, no uncanny people.
- [ ] Correct size, format and path from section 12.
- [ ] Legible on a phone at arm's length.
