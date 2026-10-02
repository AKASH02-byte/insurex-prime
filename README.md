# InsureX Launchpad

Role: Act as an Awwwards-winning creative frontend developer and UI/UX designer.
Task: Build an ultra-modern, visually striking landing page.
Anti-Slop Guidelines (Crucial): Absolutely DO NOT use generic AI layouts. Avoid the standard "text on the left, vector image on the right" hero section. Do not use basic 3-column card grids with standard drop shadows. I want a bespoke, high-end feel that looks hand-coded by a top design agency.
Visual & Layout Requirements:
Aesthetic: Clean, premium minimalism with subtle textures (like a light noise/grain overlay or blurred glassmorphism blobs in the background).
Color Palette: Use a sophisticated monochromatic dark or light mode base with one vibrant, unexpected accent color.
Typography: Oversized, highly stylized editorial typography for headers (tight tracking, large line-height contrast).
Layout: Break the standard grid. Use asymmetrical layouts, bento-box style dynamic grids for features, and overlapping elements with heavy negative space.
Animation & CSS Specs (No Glitches):
Micro-interactions: Add magnetic hover effects to buttons and links. Buttons should have a smooth, physical feel when clicked.
Scroll Effects: Implement buttery-smooth scroll reveals (staggered fade-up and slight scale-in). Elements should not snap into place rigidly.
Easing: Use custom cubic-bezier timing functions for all CSS transitions to make them feel organic and premium, not linear or robotic.
Navigation: A floating, pill-shaped sticky navigation bar with a subtle backdrop blur.
Quality Control: Ensure zero layout shifts on load, no glitchy hover states, and fully responsive fluid typography using clamp().
Output: Generate the clean, semantic HTML and CSS/JS required to build this.
Build ONLY the first page of a modern insurance management web application.
PROJECT:
Create a premium, professional insurance website for a company that handles:

1. Health Insurance
2. Motor/Car Insurance
   This is the public landing/home page. Do NOT build the admin dashboard, agent dashboard, database, or backend yet. Only prepare the landing page and navigation structure.
   DESIGN STYLE:

- Modern SaaS / fintech / insurance dashboard aesthetic
- Clean, premium, trustworthy and professional
- Minimal but visually rich
- White/light background with dark navy text and subtle blue accent colors
- Rounded cards
- Soft shadows
- Smooth hover animations
- Plenty of whitespace
- Fully responsive for desktop, tablet and mobile
- Use a professional font such as Inter
- Avoid excessive gradients, excessive animations or childish illustrations
  TOP NAVIGATION:
  Create a sticky navigation bar.
  Left:
- Professional insurance company logo/icon
- Company name: "InsureX"
  Center navigation:
- Home
- Insurance
- About
- Contact
  Right:
- A prominent button labeled "Admin / Agent Login"
- Small "Get Started" button
  The "Admin / Agent Login" button should navigate to:
  "/login"
  HERO SECTION:
  Large headline:
  "Insurance Made Simple, Secure & Reliable"
  Supporting text:
  "Manage health and motor insurance policies with a secure, streamlined platform built for customers, agents and administrators."
  Two buttons:
- "Explore Insurance"
- "Admin / Agent Login"
  Hero visual on the right:
  Create a modern insurance-themed visual/card showing:
- Health insurance card
- Car insurance card
- Policy protection icon
- Small floating status indicators such as "Active Policy", "Secure", "Verified"
  Do not use fake statistics that imply real company data.
  INSURANCE SECTION:
  Heading:
  "Insurance Plans for Every Need"
  Create two large premium cards.
  CARD 1:
  Health Insurance
- Medical protection
- Family coverage
- Flexible plans
- Secure policy management
  Button: "Explore Health Insurance"
  CARD 2:
  Motor Insurance
- Car protection
- Comprehensive coverage
- Easy policy management
- Fast renewal
  Button: "Explore Motor Insurance"
  TRUST SECTION:
  Heading:
  "Built for Simple & Secure Policy Management"
  Show 3 or 4 feature cards:
- Secure Policy Management
- Easy Claims & Renewals
- Trusted Agents
- Centralized Records
  HOW IT WORKS:
  Create a simple 3-step section:

1. Choose Insurance
2. Connect With an Agent
3. Manage Your Policy
   CTA SECTION:
   Create a dark premium section near the bottom.
   Heading:
   "Ready to Manage Your Insurance?"
   Text:
   "Access your insurance services through our secure platform."
   Buttons:

- "Get Started"
- "Admin / Agent Login"
  FOOTER:
  Include:
  InsureX logo/name
  Short company description
  Quick Links
  Insurance
  About
  Contact
  Login
  Add:
  "© 2026 InsureX. All rights reserved."
  IMPORTANT FUNCTIONALITY:
- "Admin / Agent Login" buttons must navigate to /login
- Navigation links should work
- Buttons should have hover states
- Responsive navigation with mobile menu
- Use semantic HTML and accessible buttons
- Keep component structure clean and ready for future expansion
  IMPORTANT:
  This is ONLY PAGE 1.
  Do not create the dashboard yet.
  Do not create authentication logic yet.
  Do not create database tables yet.
  Do not add unnecessary pages.
  Focus on making this landing page look highly polished and production-ready.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://insurex-prime.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1c6b35b8-1f03-4464-9212-6b71760d89fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

---

## Development: backend API

The REST API (Fastify + PostgreSQL + Prisma, Firebase token auth) lives in
[`backend/`](backend/README.md) and is deployed separately from this frontend.

- The frontend talks to it only when `VITE_API_BASE_URL` is set (e.g.
  `http://localhost:4000`). Without it, admin pages use the built-in demo data.
- API calls send the signed-in user's Firebase ID token as `Authorization: Bearer …`.
  Client code lives in `src/lib/api/`.
- Currently backed by the API: Policies page (list, filters, CRUD, analytics),
  dashboard KPI cards, and a best-effort `/auth/verify` after Google sign-in.
