# Image Generation Prompts for Marketing Site

Use these prompts with AI image generators (Midjourney, DALL-E, Stable Diffusion, etc.) to create graphics for the marketing homepage and login page.

## Marketing Homepage Hero Graphic

**Location:** `src/app/page.tsx` - Right column of hero section  
**Dimensions:** 1920x1080 (16:9 aspect ratio) recommended  
**Style:** Dark, sophisticated, nightclub/hospitality vibe

### Prompt Options:

**Option 1 - Abstract Dashboard Visualization:**

```
Modern dark-themed SaaS dashboard visualization, sleek calendar interface showing multiple venue schedules, purple and blue neon accent colors, dark background (#0a0a0a), minimalist design, professional software UI mockup, nightclub aesthetic, subtle glow effects, high contrast, 4k quality
```

**Option 2 - Hospitality Scene:**

```
Stylish dark nightclub or bar interior at night, sophisticated bartenders and staff working, multiple venue settings visible, purple and cyan neon lighting, professional hospitality atmosphere, cinematic lighting, moody dark tones, high-end restaurant/bar aesthetic, 4k quality
```

**Option 3 - Abstract Data Visualization:**

```
Abstract geometric visualization of scheduling system, interconnected nodes and networks representing multi-venue management, purple blue cyan gradient colors, dark space background, modern tech aesthetic, glassmorphism effects, professional software illustration, 4k quality
```

**Option 4 - Professional Dashboard:**

```
Modern scheduling software dashboard mockup on dark screen, calendar grid with multiple venues, shift assignments visible, purple and blue UI accent colors, dark theme interface, professional SaaS application design, realistic UI screenshot style, high resolution, 4k quality
```

## Login Page Hero Graphic

**Location:** `src/app/login/page.tsx` - Left side of split-screen  
**Dimensions:** 1200x800 (3:2 aspect ratio) recommended  
**Style:** Dark, welcoming, professional

### Prompt Options:

**Option 1 - Welcome Illustration:**

```
Professional welcome illustration for staff scheduling software, dark background with purple and blue accents, abstract calendar and clock elements, hospitality theme, modern minimalist design, welcoming and professional atmosphere, dark mode aesthetic, 4k quality
```

**Option 2 - Team Collaboration:**

```
Stylish illustration of hospitality team collaboration, bartenders and managers working together, dark sophisticated setting, purple cyan lighting, professional hospitality environment, team unity concept, modern illustration style, high contrast, 4k quality
```

**Option 3 - Scheduling Concept:**

```
Abstract representation of time management and scheduling, calendar and timeline elements, purple blue cyan gradient colors, dark space background, modern minimalist illustration, professional software concept art, sophisticated design, 4k quality
```

## General Style Guidelines

- **Color Palette:** Dark backgrounds (#0a0a0a, #0f0f0f), purple (#9333ea, #a855f7), blue (#3b82f6, #60a5fa), cyan (#06b6d4)
- **Mood:** Professional, sophisticated, nightclub/bar aesthetic, modern tech
- **Contrast:** High contrast, visible in dimly lit environments
- **Style:** Minimalist, clean, modern SaaS aesthetic
- **Lighting:** Subtle neon glow effects, ambient lighting
- **Atmosphere:** Professional hospitality, modern technology, sophisticated

## Usage Notes

1. Save generated images in `public/` directory
2. Name them descriptively: `hero-graphic.jpg`, `login-hero.jpg`
3. Optimize images for web (compress to <500KB if possible)
4. Update the placeholder divs in the code to use `<Image>` component from Next.js
5. Ensure images work well in both light and dark modes (or create separate versions)

## Example Code to Replace Placeholder

```tsx
import Image from 'next/image';

// Replace the placeholder div with:
<div className="relative w-full h-[500px] lg:h-[600px] rounded-2xl overflow-hidden">
  <Image
    src="/hero-graphic.jpg"
    alt="Multi-venue scheduling dashboard"
    fill
    className="object-cover"
    priority
  />
  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
</div>;
```
