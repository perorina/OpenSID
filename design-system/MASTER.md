# Desa Yamansari Mobile UI Design System

**Project:** Website Desa Yamansari  
**Platform:** Mobile-first website / PWA  
**Stack:** TailwindCSS  
**Design Style:** Mono Green Bento Civic UI  
**Version:** 1.0  
**Last Updated:** 23/06/2026 19:35 WIB

---

## 1. Objective

Build a modern, realistic, mobile-first village website interface for Desa Yamansari.

The UI must feel:

- Clean
- Official
- Calm
- Easy to read
- Mobile realistic
- Consistent with a design system
- Suitable for public government service

Avoid making the UI look like a poster, landing page fantasy, or overloaded OpenSID-style homepage.

---

## 2. Core Design Principles

```txt
Readable > Decorative
Content first > Visual gimmick
Mobile realistic > Desktop squeezed into phone
Consistent spacing > Random card layout
One strong brand color > Many decorative colors
```

Primary UX goal:

```txt
Help residents quickly access village services, announcements, agenda, news, and basic village data.
```

Main user priority:

1. Find public services
2. Read important announcements
3. Check village agenda
4. Read village news
5. See basic village statistics
6. Contact village office

---

## 3. Visual Direction

Use the selected style:

```txt
Mono Green Bento Civic UI
```

Visual keywords:

```txt
White / cream background
Dark green primary color
Soft rounded cards
Thin borders
Minimal shadow
Outline icons
Calm spacing
Readable typography
```

Do not use:

```txt
Heavy glassmorphism
Too many gradients
Overly colorful icon sets
Tiny text
Excessive shadows
Too many sections in one screen
```

---

## 4. Mobile Canvas Standard

Base design width:

```txt
390px
```

Target devices:

| Device Type | Width Range |
|---|---:|
| Small Android | 360px |
| Common Android | 393px |
| iPhone 13/14/15 | 390px |
| Large phones | 412px |

Use responsive layout for:

```txt
360px - 430px mobile
768px tablet
1024px desktop
```

The mobile layout should be the main design reference.

---

## 5. Layout Tokens

```txt
Page horizontal padding : 16px
Section gap             : 24px
Card gap                : 12px
Grid base               : 8px
Header height           : 56px
Bottom nav height       : 72px
Hero height             : 220px - 260px
Card radius default     : 16px
Hero radius             : 20px
```

Tailwind equivalent:

```tsx
className="px-4"
className="space-y-6"
className="gap-3"
className="rounded-2xl"
```

---

## 6. Color System

### 6.1 Brand Colors

Use green as the main identity color.

```css
--green-950: #0B1F12;
--green-900: #102F1A;
--green-800: #16401F;
--green-700: #1F5A2E;
--green-600: #2F6B3A;
--green-500: #3D7A46;
--green-100: #EAF3EC;
--green-50:  #F4FAF5;
```

### 6.2 Neutral Colors

```css
--cream-50:       #FCFAF4;
--surface:        #FFFFFF;
--surface-soft:   #F8FAF7;

--text-main:      #151A17;
--text-muted:     #66706A;
--text-soft:      #8B938E;

--border:         #E4E8E3;
--border-soft:    #EEF1ED;
```

### 6.3 Status Colors

Use status colors carefully. The overall interface should still feel mono.

```css
--warning:        #B85C38;
--warning-ink:    #8F3F25; /* body text on warning-bg, WCAG AA */
--warning-bg:     #FFF2EA;

--danger:         #C2413B;
--danger-bg:      #FEF2F2;

--success:        #1F5A2E;
--success-bg:     #EAF3EC;
```

### 6.4 Color Usage

| Element | Color |
|---|---|
| App background | `#FCFAF4` or `#FFFFFF` |
| Main heading | `#151A17` |
| Highlight heading | `#16401F` |
| Primary button | `#16401F` |
| Primary button hover | `#102F1A` |
| Icon primary | `#1F5A2E` |
| Card border | `#E4E8E3` |
| Soft card background | `#F8FAF7` |
| Muted text | `#66706A` |

---

## 7. TailwindCSS Theme Extension

Add this to `tailwind.config.ts`.

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        village: {
          950: "#0B1F12",
          900: "#102F1A",
          800: "#16401F",
          700: "#1F5A2E",
          600: "#2F6B3A",
          500: "#3D7A46",
          100: "#EAF3EC",
          50: "#F4FAF5",
        },
        cream: {
          50: "#FCFAF4",
        },
        civic: {
          surface: "#FFFFFF",
          soft: "#F8FAF7",
          border: "#E4E8E3",
          borderSoft: "#EEF1ED",
          text: "#151A17",
          muted: "#66706A",
          subtle: "#8B938E",
          warning: "#B85C38",
          warningInk: "#8F3F25",
          warningBg: "#FFF2EA",
        },
      },
      borderRadius: {
        civicSm: "10px",
        civicMd: "14px",
        civicLg: "16px",
        civicXl: "20px",
      },
      boxShadow: {
        civicSm: "0 2px 8px rgba(16, 47, 26, 0.06)",
        civicMd: "0 8px 24px rgba(16, 47, 26, 0.10)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 8. CSS Variables

Optional but recommended. Add to `globals.css`.

```css
:root {
  --font-sans: "Inter", system-ui, sans-serif;

  --color-primary: #16401F;
  --color-primary-hover: #102F1A;
  --color-primary-soft: #EAF3EC;

  --color-bg: #FCFAF4;
  --color-surface: #FFFFFF;
  --color-surface-soft: #F8FAF7;

  --color-text: #151A17;
  --color-text-muted: #66706A;
  --color-border: #E4E8E3;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --shadow-card: 0 2px 8px rgba(16, 47, 26, 0.06);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
}
```

---

## 9. Typography System

Recommended font:

```txt
Inter
```

Alternative fonts:

```txt
Geist
Plus Jakarta Sans
Instrument Sans
```

### Type Scale

| Token | Size / Line Height / Weight | Usage |
|---|---|---|
| Display | 32px / 40px / 700 | Hero title |
| H1 | 28px / 36px / 700 | Page title |
| H2 | 22px / 30px / 700 | Large section |
| Section | 18px / 26px / 700 | Section title |
| Card Title | 15px / 22px / 600 | Card title |
| Body | 14px / 22px / 400 | Normal text |
| Small | 12px / 18px / 400 | Metadata |
| Caption | 11px / 16px / 400 | Bottom nav label |

### Tailwind Class Reference

```txt
Hero title    : text-[32px] leading-10 font-bold
H1            : text-[28px] leading-9 font-bold
H2            : text-[22px] leading-[30px] font-bold
Section title : text-lg leading-6 font-bold
Card title    : text-[15px] leading-[22px] font-semibold
Body          : text-sm leading-[22px] font-normal
Small         : text-xs leading-[18px]
Caption       : text-[11px] leading-4
```

Important rule:

```txt
Do not use body text below 13px.
Do not use card title below 14px.
Do not use hero title above 32px on mobile.
```

---

## 10. Spacing System

Use 8px base grid.

```txt
4px   = micro gap
8px   = small gap
12px  = card gap
16px  = page padding / card padding
20px  = comfortable inner padding
24px  = section gap
32px  = large gap
```

Tailwind reference:

```txt
1 = 4px
2 = 8px
3 = 12px
4 = 16px
5 = 20px
6 = 24px
8 = 32px
```

Rules:

```txt
Use px-4 for mobile page padding.
Use gap-3 for card grid/list gap.
Use space-y-6 between major sections.
Use p-4 for normal cards.
Use p-5 or p-6 only for hero/large cards.
```

---

## 11. Radius System

| Token | Value | Usage |
|---|---:|---|
| Small | 10px | Input, small button |
| Medium | 14px | Icon box |
| Large | 16px | Default card |
| Extra Large | 20px | Hero card |
| Pill | 999px | Badge, pill button |

Tailwind examples:

```tsx
className="rounded-[10px]"
className="rounded-[14px]"
className="rounded-2xl"
className="rounded-[20px]"
className="rounded-full"
```

---

## 12. Shadow & Border System

Prefer borders over heavy shadows.

```txt
Default card border: 1px solid #E4E8E3
Soft divider       : 1px solid #EEF1ED
Shadow small       : 0 2px 8px rgba(16, 47, 26, 0.06)
Shadow medium      : 0 8px 24px rgba(16, 47, 26, 0.10)
```

Tailwind:

```tsx
className="border border-civic-border shadow-civicSm"
```

Avoid:

```txt
Large dark shadow
Blurred glass card
Strong neon effect
```

---

## 13. Icon System

Recommended libraries:

```txt
lucide-react
phosphor-react
heroicons
```

Preferred style:

```txt
Outline icons
2px stroke
Rounded stroke cap
Mono green / neutral gray
```

Icon sizes:

| Usage | Size |
|---|---:|
| Header action | 22px |
| Service icon | 28px |
| Info icon | 26px |
| Bottom nav icon | 22px |
| Metadata icon | 14px |

Icon box:

```txt
Width  : 48px
Height : 48px
Radius : 14px
Bg     : #EAF3EC
Icon   : #1F5A2E
```

Tailwind:

```tsx
<div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-village-100 text-village-700">
  <FileText className="h-7 w-7 stroke-[2]" />
</div>
```

---

## 14. Component Specification

### 14.1 App Shell

Mobile shell:

```tsx
<main className="min-h-screen bg-cream-50 pb-24 text-civic-text">
  <div className="mx-auto w-full max-w-[430px] px-4 pt-12">
    {/* content */}
  </div>
  <BottomNavigation />
</main>
```

For desktop preview:

```tsx
<div className="mx-auto max-w-[430px]">
  {/* mobile layout */}
</div>
```

---

### 14.2 Header

Spec:

```txt
Height       : 56px
Logo size    : 40px
Title        : 20px / 700
Subtitle     : 13px / 400
Action button: 44px x 44px
Radius       : 14px
```

Tailwind:

```tsx
<header className="mb-4 flex h-14 items-center justify-between">
  <div className="flex items-center gap-3">
    <img
      src="/logo-desa.png"
      alt="Logo Desa Yamansari"
      className="h-10 w-10 rounded-md object-contain"
    />

    <div>
      <h1 className="text-xl font-bold leading-6 text-village-800">
        Desa Yamansari
      </h1>
      <p className="text-[13px] leading-5 text-civic-muted">
        Kec. Lebaksiu, Kab. Tegal
      </p>
    </div>
  </div>

  <div className="flex items-center gap-2">
    <button className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-civic-border bg-white text-civic-text shadow-civicSm">
      <Search className="h-[22px] w-[22px]" />
    </button>

    <button className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-civic-border bg-white text-village-800 shadow-civicSm">
      <Menu className="h-[22px] w-[22px]" />
    </button>
  </div>
</header>
```

---

### 14.3 Hero Card

Spec:

```txt
Height       : 240px
Radius       : 20px
Padding      : 24px
Image        : background image, aligned right
Overlay      : white/cream gradient from left
Title        : 32px / 40px / 700
Body         : 15px / 24px
Button       : 44px height
```

Tailwind:

```tsx
<section className="relative mb-6 h-[240px] overflow-hidden rounded-[20px] border border-civic-border bg-white shadow-civicSm">
  <img
    src="/images/desa-hero.jpg"
    alt="Pemandangan Desa Yamansari"
    className="absolute inset-0 h-full w-full object-cover"
  />

  <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />

  <div className="relative z-10 flex h-full max-w-[72%] flex-col justify-center p-6">
    <p className="mb-1 text-base leading-6 text-civic-text">
      Selamat datang di
    </p>

    <h2 className="mb-4 text-[32px] font-bold leading-10 text-village-900">
      Desa Yamansari
    </h2>

    <p className="mb-5 text-[15px] leading-6 text-civic-muted">
      Maju desanya, sejahtera warganya, berbudaya dan gotong royong.
    </p>

    <a
      href="/layanan"
      className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-village-800 px-4 text-sm font-semibold text-white"
    >
      Jelajahi Layanan
      <ArrowRight className="h-4 w-4" />
    </a>
  </div>

  <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 gap-2 rounded-full bg-white px-4 py-3 shadow-civicSm">
    <span className="h-2.5 w-2.5 rounded-full bg-village-700" />
    <span className="h-2.5 w-2.5 rounded-full bg-civic-border" />
    <span className="h-2.5 w-2.5 rounded-full bg-civic-border" />
  </div>
</section>
```

---

### 14.4 Section Header

Tailwind:

```tsx
<div className="mb-3 flex items-center justify-between">
  <h2 className="text-lg font-bold leading-6 text-civic-text">
    Layanan Cepat
  </h2>

  <a
    href="/layanan"
    className="inline-flex items-center gap-1 text-sm font-medium text-village-800"
  >
    Lihat semua
    <ChevronRight className="h-4 w-4" />
  </a>
</div>
```

---

### 14.5 Service Cards

Important implementation rule:

```txt
Use horizontal scroll on mobile.
Do not force 5 service cards into one 390px row.
```

Spec:

```txt
Card width   : 112px
Card height  : 124px
Padding      : 14px
Radius       : 16px
Icon         : 28px
Title        : 13px / 18px / 600
Description  : 11px / 16px
```

Tailwind:

```tsx
<section className="mb-6">
  <SectionHeader title="Layanan Cepat" href="/layanan" />

  <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
    {services.map((item) => (
      <a
        key={item.title}
        href={item.href}
        className="min-w-[112px] rounded-2xl border border-civic-border bg-white p-3 shadow-civicSm"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-village-100 text-village-700">
          <item.icon className="h-7 w-7 stroke-[2]" />
        </div>

        <h3 className="text-[13px] font-semibold leading-[18px] text-civic-text">
          {item.title}
        </h3>

        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-civic-muted">
          {item.description}
        </p>
      </a>
    ))}
  </div>
</section>
```

Example data:

```ts
const services = [
  {
    title: "Surat Domisili",
    description: "Pengajuan surat domisili",
    href: "/layanan/surat-domisili",
    icon: FileText,
  },
  {
    title: "Surat Usaha",
    description: "Pengajuan surat keterangan usaha",
    href: "/layanan/surat-usaha",
    icon: BriefcaseBusiness,
  },
  {
    title: "Kartu Keluarga",
    description: "Permohonan kartu keluarga",
    href: "/layanan/kartu-keluarga",
    icon: Users,
  },
  {
    title: "Lapor Warga",
    description: "Sampaikan laporan atau keluhan",
    href: "/pengaduan",
    icon: Megaphone,
  },
  {
    title: "Bantuan Sosial",
    description: "Informasi bantuan sosial",
    href: "/bantuan",
    icon: HandHeart,
  },
];
```

---

### 14.6 Important Info Card

Spec:

```txt
Minimum height : 96px
Padding        : 16px
Radius         : 16px
Icon box       : 56px x 56px
Button height  : 40px
```

Tailwind:

```tsx
<section className="mb-6 rounded-2xl border border-civic-border bg-civic-soft p-4 shadow-civicSm">
  <div className="flex items-center gap-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-village-800 text-white">
      <Bell className="h-7 w-7" />
    </div>

    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-lg font-bold leading-6 text-village-800">
          Informasi Penting
        </h2>

        <span className="rounded-full bg-village-100 px-2 py-0.5 text-[11px] font-semibold text-village-800">
          Baru
        </span>
      </div>

      <p className="text-[14px] font-semibold leading-5 text-civic-text">
        Pembayaran PBB-P2 Tahun 2024
      </p>

      <p className="mt-1 text-xs leading-[18px] text-civic-muted">
        Jatuh tempo 31 Agustus 2024.
      </p>
    </div>

    <a
      href="/pengumuman/pbb-p2"
      className="hidden h-10 shrink-0 items-center rounded-xl bg-village-800 px-4 text-sm font-semibold text-white min-[390px]:inline-flex"
    >
      Lihat Detail
    </a>
  </div>
</section>
```

---

### 14.7 Agenda Section

Tailwind:

```tsx
<section className="mb-6">
  <SectionHeader title="Jadwal Kegiatan" href="/agenda" />

  <div className="rounded-2xl border border-civic-border bg-white p-3 shadow-civicSm">
    {agenda.map((item, index) => (
      <a
        key={item.title}
        href={item.href}
        className={cn(
          "flex gap-3 py-3",
          index !== agenda.length - 1 && "border-b border-civic-borderSoft"
        )}
      >
        <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-village-50 text-village-800">
          <span className="text-2xl font-bold leading-6">{item.day}</span>
          <span className="mt-1 text-[11px] font-semibold leading-3">{item.month}</span>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-civic-text">
            {item.title}
          </h3>

          <div className="mt-2 space-y-1 text-xs leading-[18px] text-civic-muted">
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {item.time}
            </p>

            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {item.location}
            </p>
          </div>
        </div>
      </a>
    ))}
  </div>
</section>
```

---

### 14.8 News Section

For mobile, use list cards instead of dense grid.

Tailwind:

```tsx
<section className="mb-6">
  <SectionHeader title="Berita Desa" href="/berita" />

  <div className="space-y-3">
    {news.map((item) => (
      <a
        key={item.title}
        href={item.href}
        className="flex gap-3 rounded-2xl border border-civic-border bg-white p-3 shadow-civicSm"
      >
        <img
          src={item.image}
          alt={item.title}
          className="h-[72px] w-24 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-flex rounded-full bg-village-100 px-2 py-0.5 text-[11px] font-medium text-village-800">
            {item.category}
          </span>

          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-civic-text">
            {item.title}
          </h3>

          <p className="mt-1 text-xs leading-[18px] text-civic-muted">
            {item.date}
          </p>
        </div>
      </a>
    ))}
  </div>
</section>
```

---

### 14.9 Statistic Section

Spec:

```txt
Use 2 columns on mobile if content needs readability.
Use 4 items max on homepage.
```

Tailwind:

```tsx
<section className="mb-6">
  <h2 className="mb-3 text-lg font-bold leading-6 text-civic-text">
    Statistik Desa
  </h2>

  <div className="grid grid-cols-2 gap-3">
    {stats.map((item) => (
      <div
        key={item.label}
        className="rounded-2xl border border-civic-border bg-white p-4 shadow-civicSm"
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-village-100 text-village-700">
          <item.icon className="h-5 w-5" />
        </div>

        <p className="text-xl font-bold leading-6 text-civic-text">
          {item.value}
        </p>

        <p className="mt-1 text-xs leading-[18px] text-civic-muted">
          {item.label}
        </p>
      </div>
    ))}
  </div>
</section>
```

Example data:

```ts
const stats = [
  { value: "3.512", label: "Penduduk", icon: Users },
  { value: "1.765", label: "Laki-laki", icon: UserRound },
  { value: "1.747", label: "Perempuan", icon: UserRound },
  { value: "1.128", label: "Jumlah KK", icon: Home },
];
```

---

### 14.10 Footer Contact Strip

Keep footer compact. Do not make it too tall.

Tailwind:

```tsx
<footer className="-mx-4 mb-0 bg-village-800 px-4 py-4 text-white">
  <div className="grid gap-3 text-xs leading-[18px]">
    <div className="flex gap-2">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Desa Yamansari<br />
        Kec. Lebaksiu, Kab. Tegal<br />
        Jawa Tengah
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <p className="flex items-center gap-2">
        <Phone className="h-4 w-4" />
        (0283) 1234567
      </p>

      <p className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        desa@example.id
      </p>
    </div>
  </div>
</footer>
```

---

### 14.11 Bottom Navigation

Spec:

```txt
Height       : 72px
Max items    : 5
Icon size    : 22px
Label        : 11px / 14px
Active       : green
Inactive     : muted gray
```

Tailwind:

```tsx
<nav className="fixed inset-x-0 bottom-0 z-50 border-t border-civic-border bg-white">
  <div className="mx-auto grid h-[72px] max-w-[430px] grid-cols-5 px-2">
    {navItems.map((item) => (
      <a
        key={item.label}
        href={item.href}
        className={cn(
          "flex flex-col items-center justify-center gap-1 text-[11px] font-medium leading-4",
          item.active ? "text-village-700" : "text-civic-muted"
        )}
      >
        <item.icon className="h-[22px] w-[22px]" />
        <span>{item.label}</span>
      </a>
    ))}
  </div>
</nav>
```

Navigation items:

```ts
const navItems = [
  { label: "Beranda", href: "/", icon: Home, active: true },
  { label: "Layanan", href: "/layanan", icon: LayoutGrid, active: false },
  { label: "Informasi", href: "/informasi", icon: Info, active: false },
  { label: "Berita", href: "/berita", icon: Newspaper, active: false },
  { label: "Akun", href: "/akun", icon: User, active: false },
];
```

---

## 15. Homepage Content Order

Recommended order:

```txt
1. Header
2. Hero card
3. Layanan cepat
4. Informasi penting
5. Jadwal kegiatan
6. Berita desa
7. Statistik desa
8. Footer contact strip
9. Bottom navigation
```

Do not put too many modules on the homepage.

Avoid:

```txt
Gallery
Video
Running text
Huge slider
Too many banners
All village features
All articles
All statistics
```

The homepage should work as a gateway, not a storage room.

---

## 16. Accessibility Rules

Minimum requirement:

```txt
Button height should be at least 44px.
Clickable card should have enough tap area.
Body text should be at least 14px.
Important icons need text labels.
Do not rely on color only to show status.
Keep contrast strong.
Use visible focus state.
```

Tailwind focus state:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-village-700 focus-visible:ring-offset-2"
```

---

## 17. Responsive Rules

### Mobile

```txt
Main layout: single column
Service cards: horizontal scroll
News: list card
Stats: 2 columns
Bottom nav: visible
```

### Tablet

```txt
Max content width: 720px
Services: grid 3 columns
News: grid 2 columns
Stats: grid 4 columns
Bottom nav: optional
```

### Desktop

```txt
Use max-width container.
Do not stretch mobile cards too wide.
Convert bottom nav to top navigation.
Hero can be split layout.
```

---

## 18. Implementation Notes for Coding Agent

Use component-based structure:

```txt
/components
  /ui
    Button.tsx
    Card.tsx
    IconBox.tsx
    SectionHeader.tsx
  /layout
    AppShell.tsx
    Header.tsx
    BottomNavigation.tsx
  /home
    HeroSection.tsx
    QuickServices.tsx
    ImportantInfo.tsx
    AgendaSection.tsx
    NewsSection.tsx
    StatsSection.tsx
    ContactFooter.tsx
```

Recommended dependencies:

```bash
npm install lucide-react clsx tailwind-merge
```

Recommended utility:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 19. Example Page Skeleton

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-cream-50 pb-24 text-civic-text">
      <div className="mx-auto w-full max-w-[430px] px-4 pt-12">
        <Header />
        <HeroSection />
        <QuickServices />
        <ImportantInfo />
        <AgendaSection />
        <NewsSection />
        <StatsSection />
        <ContactFooter />
      </div>

      <BottomNavigation />
    </main>
  );
}
```

---

## 20. Quality Checklist

Before finalizing implementation, check:

```txt
[ ] Mobile width works at 360px.
[ ] Body text is readable without zoom.
[ ] No section feels too cramped.
[ ] Service card uses horizontal scroll on mobile.
[ ] News card uses list format on mobile.
[ ] Bottom navigation has max 5 items.
[ ] All cards use consistent border/radius.
[ ] Green color is consistent.
[ ] Icons use one style only.
[ ] Page does not look like a poster.
[ ] Page does not look like default OpenSID template.
[ ] Content hierarchy is clear.
[ ] Primary action is obvious.
[ ] Tap targets are at least 44px.
[ ] UI works without relying on animation.
```

---

## 21. Final Visual Standard

The final homepage should look like:

```txt
Official but modern.
Simple but not empty.
Village identity but not old-fashioned.
Bento style but realistic.
Clean mono green system.
Readable for young and older residents.
```

The most important rule:

```txt
Do not sacrifice readability just to make the design look more decorative.
```
