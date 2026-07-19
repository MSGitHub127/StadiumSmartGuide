# Stadium SmartGuide — FIFA World Cup 2026

An interactive digital-twin navigation, crowd-safety, and multilingual assistant application for stadium attendees.

Built with **Next.js 14 App Router (React/TypeScript)**, **Tailwind CSS**, and **Google Cloud Vertex AI (Gemini 3 Flash / 3.1 Pro)**.

---

## 🚀 Live Cloud Deployment

The application is deployed and hosted on Vercel:

- **Live Production URL**: [https://stadium-smartguide.vercel.app](https://stadium-smartguide.vercel.app)
- **Deployment Build URL**: [https://stadium-smartguide-ax30iyxhe-mananshah127-3100s-projects.vercel.app](https://stadium-smartguide-ax30iyxhe-mananshah127-3100s-projects.vercel.app)

---

## 🎨 Premium UI/UX & Layout Updates

### 1. Header Control Center Integration

- **Global Safety Alert Pill**: A pulsing warning pill next to the logo banner keeping users informed of safety notes without taking up screen space.
- **Quick Actions Row**: Mini icon buttons for high-priority shortcuts (SOS Emergency Call, Report Issue, Lost & Found catalog, Hydration locator, Prayer Rooms) integrated directly into the global header.

### 2. High-Fidelity Seating Oval Map

- Re-expanded the center column to occupy 100% of height and width (`md:col-span-2`), maximizing map size.
- Configured SVG viewport scaling with `preserveAspectRatio="xMidYMid meet"` and offset the viewBox window to `0 35 700 435`. This pushes the seating layout upward to ensure `Gate 3` is fully visible on all viewport heights with zero clipping.

### 3. Glassmorphism Design Theme

- Replaced standard flat borders with `glass-premium` cards featuring deep backdrop blurs, high translucency, and soft neon color glow boundaries.
- Integrated glowing top gradient divider lines to delineate panel sections.

### 4. Custom In-App Modal Dialogs

- Replaced native browser `alert()` and `prompt()` dialogs with custom-built premium modal overlays.
- Renders fully animated input fields and confirmations aligned with the dark glassmorphic system design.

---

## 💻 Local Setup & Execution

### Prerequisites

- Node.js (v18+)
- Google Cloud SDK (for Vertex AI API integration via Application Default Credentials)

### Command Execution

```bash
# 1. Install dependencies
npm install

# 2. Run Next.js development server
npm run dev        # Serves at http://localhost:3000

# 3. Run Jest verification tests
npm test           # Executing all 124 unit and route integration tests

# 4. Strict TypeScript type check
node node_modules/typescript/bin/tsc --noEmit
```

---

## 🔒 Code Security & Features

- **Prompt Injection Defense**: Fully sanitizes user strings prior to LLM interpolation.
- **Robust Exception Fallbacks**: Typed API error handlers return helpful user-facing guidance instead of raw server errors.
- **Dynamic Queue Progress Indicators**: Queue times are visually rendered as color-banded loading indicators based on live sensor data.
