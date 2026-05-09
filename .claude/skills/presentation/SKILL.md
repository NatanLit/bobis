---
name: presentation
description: "Create stunning, production-grade presentations using HTML/CSS/JS (Reveal.js, Impress.js, or pure HTML). Covers slide design, typography, animations, color systems, data visualization, and storytelling structure. Styles: minimal, corporate, creative, dark-tech, editorial, gradient-heavy, glassmorphism. Output: fully working single-file or multi-file HTML presentations ready to open in a browser or export to PDF."
---

# Presentation Skill — Slide Design Intelligence

Create compelling, visually exceptional presentations as interactive HTML/CSS/JS. Output should be production-ready and browser-renderable, with smooth transitions and strong visual hierarchy.

## When to Apply

### Must Use
- User asks to "make a presentation", "create slides", or "build a deck"
- User wants to present data, a product, a report, a pitch, or a concept
- Converting bullet-point content into structured slides
- Building animated or interactive slideshows

### Recommended
- User wants to export visuals to PDF or show them in a browser
- User has existing content that needs visual structure

### Skip
- Pure data analysis without display output
- Backend-only work

---

## Framework Selection

Choose the right foundation:

| Need | Framework |
|------|-----------|
| Feature-rich, polished, plug-and-play | **Reveal.js** (CDN) |
| 3D spatial storytelling, wow-factor | **Impress.js** (CDN) |
| Full control, no deps, lightweight | **Pure HTML/CSS/JS** |
| Data-heavy charts + slides | **Reveal.js + Chart.js** |

Default to **Reveal.js via CDN** unless the user specifies otherwise.

---

## Slide Structure Principles

### 1. Information Hierarchy (Priority 1)
- One big idea per slide — never two
- Headline = the takeaway, not the topic
- Body = support, evidence, or detail
- Max 5 bullet points; prefer 3
- Use **bold** for the single most important phrase per slide

### 2. Visual Composition (Priority 2)
- Use a consistent grid (12-col or golden ratio)
- Strong asymmetry creates energy; symmetry creates calm — choose intentionally
- Negative space is not empty — it directs attention
- Every slide should pass the "5-second test": the key message is readable in 5 seconds

### 3. Typography (Priority 3)
Choose a distinctive pairing — never use Arial, Calibri, or system fonts:

| Style | Display Font | Body Font |
|-------|-------------|-----------|
| Corporate / Trust | Playfair Display | Source Sans 3 |
| Tech / SaaS | Space Grotesk | Inter |
| Creative / Bold | Bebas Neue | DM Sans |
| Editorial / Magazine | Cormorant Garamond | Lato |
| Dark / Cinematic | Orbitron | Rajdhani |
| Minimal / Luxury | Tenor Sans | Jost |

Import from Google Fonts. Set `font-size` on `:root` using `clamp()` for responsive scaling.

### 4. Color Systems (Priority 4)
Commit to a 3-color palette maximum:

| Palette | Primary | Accent | Background |
|---------|---------|--------|------------|
| Dark Tech | #0a0a0f | #00f5d4 | #111827 |
| Corporate Clean | #1e3a5f | #f59e0b | #f8fafc |
| Creative Bold | #1a1a2e | #e94560 | #16213e |
| Editorial Ivory | #2d2d2d | #c8a96e | #f5f0e8 |
| Gradient Pop | #0f0c29 | #ff6b6b | #302b63 |
| Minimal White | #111111 | #3b82f6 | #ffffff |

Use CSS variables: `--color-primary`, `--color-accent`, `--color-bg`, `--color-text`.

### 5. Slide Types & Templates (Priority 5)

**Cover Slide**: Full-bleed background (gradient or image overlay), centered headline, subtitle, optional logo. No bullet points.

**Section Divider**: Single large number or icon + section title. Minimal. Creates rhythm.

**Content Slide**: Headline top-left, body right or below, optional icon/image.

**Two-Column**: Left = visual/chart, Right = key takeaways.

**Quote Slide**: Large `"` glyph, quote text centered, attribution small below.

**Data Slide**: Chart (Chart.js) + 2-3 key stat callouts. No raw tables.

**Timeline Slide**: Horizontal or vertical timeline with milestone dots.

**Team Slide**: Card grid with photo placeholder, name, role.

**Closing/CTA Slide**: Big bold CTA headline, contact or next-step info, brand mark.

---

## Animation Guidelines

- **Slide transitions**: `fade` or `slide` for professional; `zoom` or `convex` for creative
- **Fragment reveals**: Use sparingly — max 3 reveals per slide
- **Entrance animations**: `fadeInUp` on headlines, `fadeIn` on body
- **Never**: spinning elements, blinking text, random bounces
- Use `transition-duration: 600ms` with `ease-in-out` as default

```css
/* Standard entrance animation */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.slide-headline { animation: fadeInUp 0.6s ease-out both; }
```

---

## Reveal.js Boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <!-- Add chosen Google Fonts here -->
  <style>
    :root {
      --color-primary: #0a0a0f;
      --color-accent: #00f5d4;
      --color-bg: #111827;
      --color-text: #f1f5f9;
      --font-display: 'Space Grotesk', sans-serif;
      --font-body: 'Inter', sans-serif;
    }
    .reveal { font-family: var(--font-body); color: var(--color-text); }
    .reveal h1, .reveal h2 { font-family: var(--font-display); }
    .reveal .accent { color: var(--color-accent); }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <!-- Slides go here -->
      <section>
        <h1>Title <span class="accent">Here</span></h1>
        <p>Subtitle or tagline</p>
      </section>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      transition: 'fade',
      transitionSpeed: 'default',
      backgroundTransition: 'fade',
      controls: true,
      progress: true,
      slideNumber: false,
    });
  </script>
</body>
</html>
```

---

## Quality Checklist

Before delivering, verify:
- [ ] All slides have a single clear headline
- [ ] Color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] No slide has more than 5 bullet points
- [ ] Fonts loaded from Google Fonts, not system defaults
- [ ] Transitions are smooth (test in browser)
- [ ] Cover slide is visually striking and sets the tone
- [ ] Closing slide has a clear next step or CTA
- [ ] File opens correctly in Chrome/Firefox without a server (or includes CDN links)
- [ ] PDF export works (print media query or Reveal.js print stylesheet)

---

## Output Format

- Single self-contained `index.html` by default (all CSS inline + CDN JS)
- If multi-file: `index.html` + `style.css` + `slides.js`
- Include keyboard nav hint in speaker notes or README
- Mention: `Space` / arrow keys to navigate, `F` for fullscreen, `S` for speaker view (Reveal.js)
