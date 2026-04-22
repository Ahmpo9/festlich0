# Festlich — Architecture, Schema & Full Implementation Guide
## Next.js · TypeScript · Supabase Auth · next-intl · Stripe-ready

---

## 1. Project Folder Structure

```
festlich/
├── app/
│   ├── [locale]/                        ← next-intl locale wrapper
│   │   ├── layout.tsx                   ← Root layout with providers, fonts
│   │   ├── page.tsx                     ← Home / landing
│   │   ├── (marketing)/
│   │   │   ├── preise/page.tsx          ← Pricing (/de/preise, /en/pricing)
│   │   │   └── vorlagen/page.tsx        ← Templates (/de/vorlagen, /en/templates)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx               ← Centered auth layout
│   │   │   ├── anmelden/page.tsx        ← Sign in (uses existing Supabase auth)
│   │   │   ├── registrieren/page.tsx    ← Sign up
│   │   │   └── passwort-vergessen/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx               ← Dashboard shell (sidebar + topbar)
│   │   │   ├── dashboard/page.tsx       ← Overview stats
│   │   │   ├── dashboard/gaeste/page.tsx
│   │   │   ├── dashboard/einladungen/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── neu/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── bearbeiten/page.tsx
│   │   │   │       ├── galerie/page.tsx
│   │   │   │       ├── design/page.tsx
│   │   │   │       └── einstellungen/page.tsx
│   │   │   └── dashboard/analytik/page.tsx
│   │   └── e/
│   │       └── [slug]/page.tsx          ← Public invitation (SEO + i18n)
│   └── api/
│       ├── rsvp/route.ts
│       ├── upload/route.ts
│       └── qr/[slug]/route.ts
├── components/
│   ├── ui/                              ← shadcn/ui components
│   ├── marketing/
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Categories.tsx
│   │   ├── Testimonials.tsx
│   │   ├── PricingSection.tsx
│   │   ├── FAQ.tsx
│   │   ├── TemplateGrid.tsx
│   │   └── CTABanner.tsx
│   ├── invitation/
│   │   ├── InvitationHero.tsx
│   │   ├── CountdownTimer.tsx           ← SSR-safe client component
│   │   ├── EventSchedule.tsx
│   │   ├── VenueCard.tsx
│   │   ├── RSVPForm.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── GiftRegistry.tsx
│   │   ├── DressCode.tsx
│   │   ├── WelcomeNote.tsx
│   │   └── ShareSection.tsx
│   ├── dashboard/
│   │   ├── DashboardSidebar.tsx
│   │   ├── StatsRow.tsx
│   │   ├── GuestTable.tsx
│   │   ├── RSVPChart.tsx
│   │   ├── ThemeEditor.tsx
│   │   ├── GalleryUploader.tsx
│   │   └── QRCodePanel.tsx
│   └── shared/
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       ├── LanguageSwitcher.tsx
│       ├── AnimatedSection.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    ← Browser Supabase client
│   │   ├── server.ts                    ← Server Supabase client (cookies)
│   │   └── middleware.ts                ← Session refresh helper
│   ├── validations/
│   │   ├── rsvp.ts
│   │   ├── invitation.ts
│   │   └── auth.ts
│   ├── actions/
│   │   ├── invitation.actions.ts
│   │   ├── rsvp.actions.ts
│   │   └── guest.actions.ts
│   ├── hooks/
│   │   ├── useCountdown.ts
│   │   └── useInvitation.ts
│   └── utils.ts
├── types/
│   ├── database.types.ts                ← Generated from Supabase CLI
│   └── index.ts
├── messages/                            ← next-intl translation files
│   ├── de.json
│   └── en.json
├── i18n.ts                              ← next-intl config
├── middleware.ts                        ← Auth + locale routing combined
├── next.config.ts
├── tailwind.config.ts
└── supabase/
    ├── migrations/
    │   └── 001_festlich_schema.sql
    └── seed.sql
```

---

## 2. Supabase Auth Integration

Festlich uses your **existing** Supabase auth. No new auth system is built.

### What is reused:
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.resetPasswordForEmail()`
- `supabase.auth.getSession()` / `getUser()`
- All existing RLS policies that reference `auth.uid()`

### lib/supabase/client.ts
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// Reuses your existing Supabase project URL + anon key
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

### lib/supabase/server.ts
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    }
  );
};
```

### Auth Sign-In Page (app/[locale]/(auth)/anmelden/page.tsx)
```typescript
'use client';

import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInData } from '@/lib/validations/auth';
import { useState } from 'react';

export default function SignInPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient(); // ← your existing Supabase client
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<SignInData>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(data: SignInData) {
    setError(null);
    // Uses YOUR existing Supabase auth — no changes to auth setup
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError(t('errors.invalidCredentials'));
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form UI using shadcn/ui + Tailwind */}
      {error && <div className="auth-error">{error}</div>}
      <input {...register('email')} type="email" placeholder={t('emailPlaceholder')} />
      {errors.email && <span>{errors.email.message}</span>}
      <input {...register('password')} type="password" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('signingIn') : t('signIn')}
      </button>
    </form>
  );
}
```

---

## 3. i18n Setup (next-intl)

### Install
```bash
pnpm add next-intl
```

### i18n.ts
```typescript
import { getRequestConfig } from 'next-intl/server';

export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### middleware.ts (combined auth + locale)
```typescript
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(req: NextRequest) {
  // 1. Handle locale routing first
  const intlResponse = intlMiddleware(req);
  
  // 2. Auth protection for dashboard routes
  const isDashboard = req.nextUrl.pathname.match(/^\/(de|en)\/dashboard/);
  if (!isDashboard) return intlResponse;

  const response = intlResponse ?? NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const locale = req.nextUrl.pathname.split('/')[1];
    return NextResponse.redirect(new URL(`/${locale}/anmelden`, req.url));
  }

  return response;
}

export const config = {
  matcher: ['/(de|en)/:path*'],
};
```

### messages/de.json
```json
{
  "nav": {
    "features": "Funktionen",
    "templates": "Vorlagen",
    "pricing": "Preise",
    "signIn": "Anmelden",
    "startFree": "Kostenlos starten"
  },
  "hero": {
    "eyebrow": "✦ Premium Digitale Einladungen",
    "headline": "Teile deinen besonderen Tag mit Stil",
    "headlineEm": "Stil",
    "subheadline": "Festlich erschafft digitale Einladungen von unvergesslicher Eleganz — für Hochzeiten, Verlobungen und alle besonderen Feiern.",
    "cta": "Einladung erstellen →",
    "demo": "Live-Demo ansehen"
  },
  "stats": {
    "invitations": "Einladungen",
    "satisfaction": "Zufriedenheit",
    "templates": "Vorlagen"
  },
  "features": {
    "title": "Ein vollständiges Einladungserlebnis",
    "subtitle": "Alles, was deine Gäste brauchen — von der Wegbeschreibung bis zur Zu- oder Absage — wunderschön an einem Ort.",
    "templates": { "title": "Elegante Vorlagen", "desc": "140+ sorgfältig gestaltete Designs für Hochzeiten, Geburtstage und mehr." },
    "rsvp": { "title": "RSVP-Verwaltung", "desc": "Gäste antworten mit einem Tipp. Behalte Zusagen und Mahlzeitwünsche im Blick." },
    "venue": { "title": "Ort & Navigation", "desc": "Wunderschöne Ortskarten mit integrierten Kartenlinks." },
    "gallery": { "title": "Fotogalerie", "desc": "Teile deine Verlobungsfotos in einer kuratierten Galerie." },
    "countdown": { "title": "Live-Countdown", "desc": "Echtzeit-Countdown bis zu eurem besonderen Moment." },
    "qr": { "title": "QR-Code-Sharing", "desc": "Druckbereiter QR-Code für deine Save-the-Dates." }
  },
  "how": {
    "title": "Von der Idee zur Einladung in Minuten",
    "step1": { "title": "Vorlage wählen", "desc": "Stöbere durch kuratierte Designs." },
    "step2": { "title": "Personalisieren", "desc": "Füge Namen, Datum und alle Details hinzu." },
    "step3": { "title": "Sofort teilen", "desc": "Link kopieren oder QR-Code drucken." },
    "step4": { "title": "RSVPs verwalten", "desc": "Gästeliste jederzeit exportieren." }
  },
  "categories": {
    "title": "Gemacht für jeden besonderen Moment",
    "weddings": "Hochzeiten",
    "engagements": "Verlobungen",
    "receptions": "Empfänge",
    "birthdays": "Geburtstage",
    "celebrations": "Feiern"
  },
  "pricing": {
    "title": "Ein Preis, ein wunderschöner Tag",
    "subtitle": "Keine versteckten Gebühren, keine Kosten pro Gast.",
    "free": {
      "name": "Kostenlos",
      "price": "0 €",
      "period": "Für immer gratis · keine Kreditkarte",
      "cta": "Kostenlos starten",
      "f1": "1 aktive Einladung",
      "f2": "Bis zu 30 Gäste",
      "f3": "RSVP-Erfassung",
      "f4": "5 Galeriefotos"
    },
    "premium": {
      "name": "Premium",
      "period": "einmalige Zahlung · unbegrenzte Nutzung",
      "badge": "Beliebteste Wahl",
      "cta": "Premium wählen →",
      "f1": "3 aktive Einladungen",
      "f2": "Unbegrenzte Gäste",
      "f3": "Alle Premium-Vorlagen",
      "f4": "50 Galeriefotos",
      "f5": "QR-Code-Generierung",
      "f6": "Kein Festlich-Branding",
      "f7": "Gästeliste exportieren"
    },
    "luxury": {
      "name": "Luxus",
      "period": "einmalige Zahlung · unbegrenzte Nutzung",
      "cta": "Luxus wählen →",
      "f1": "Unbegrenzte Einladungen",
      "f2": "Unbegrenzte Gäste & Fotos",
      "f3": "Personalisierte Gastlinks",
      "f4": "Erweiterte Statistik",
      "f5": "Prioritätssupport",
      "f6": "Video-Hintergründe"
    }
  },
  "faq": {
    "title": "Alles, was du wissen möchtest",
    "q1": "Wie lange bleibt meine Einladung online?",
    "a1": "Deine Einladung bleibt so lange aktiv, wie dein Account besteht. Alle bezahlten Pläne beinhalten unbegrenzten Zugang.",
    "q2": "Können Gäste von jedem Gerät aus antworten?",
    "a2": "Absolut. Festlich ist mobile-first entwickelt. Kein App-Download nötig.",
    "q3": "Kann ich die Einladung nach dem Teilen noch bearbeiten?",
    "a3": "Ja, jederzeit. Änderungen erscheinen sofort auf der Live-Einladung.",
    "q4": "Ist die Plattform auf Deutsch verfügbar?",
    "a4": "Ja! Festlich ist vollständig zweisprachig — Deutsch und Englisch.",
    "q5": "Gibt es eine Rückgabegarantie?",
    "a5": "Wir bieten eine vollständige Rückerstattung innerhalb von 14 Tagen."
  },
  "cta": {
    "title": "Eure Liebesgeschichte verdient einen wunderschönen Anfang",
    "subtitle": "Erstelle deine digitale Einladung heute. Kostenlos starten, dauert weniger als fünf Minuten.",
    "primary": "Einladung erstellen →",
    "secondary": "Live-Demo sehen"
  },
  "auth": {
    "signIn": "Anmelden",
    "signUp": "Registrieren",
    "signingIn": "Anmelden...",
    "email": "E-Mail-Adresse",
    "emailPlaceholder": "deine@email.de",
    "password": "Passwort",
    "forgotPassword": "Passwort vergessen?",
    "noAccount": "Noch kein Konto?",
    "hasAccount": "Bereits registriert?",
    "createAccount": "Konto erstellen",
    "errors": {
      "invalidCredentials": "E-Mail oder Passwort ist falsch.",
      "emailInUse": "Diese E-Mail-Adresse ist bereits registriert."
    }
  },
  "dashboard": {
    "overview": "Übersicht",
    "guests": "Gästeliste",
    "rsvps": "RSVPs",
    "invitation": "Einladung",
    "gallery": "Galerie",
    "theme": "Design",
    "qrCode": "QR-Code",
    "analytics": "Statistik",
    "views": "Aufrufe",
    "attending": "Zusagen",
    "declined": "Absagen",
    "pending": "Offen",
    "exportCsv": "Als CSV exportieren"
  },
  "invitation": {
    "ceremony": "Zeremonie",
    "venue": "Veranstaltungsort",
    "dressCode": "Dresscode",
    "rsvp": "Rückmeldung",
    "schedule": "Ablauf",
    "gifts": "Geschenke",
    "share": "Teilen",
    "copyLink": "Link kopieren",
    "getDirections": "Route anzeigen",
    "confirmAttendance": "Rückmeldung bestätigen →",
    "attending": "Ich freue mich zu kommen ✓",
    "notAttending": "Leider kann ich nicht kommen",
    "name": "Vollständiger Name",
    "email": "E-Mail-Adresse",
    "guestCount": "Anzahl Personen",
    "mealPreference": "Menüwahl",
    "dietary": "Unverträglichkeiten (optional)",
    "days": "Tage",
    "hours": "Std.",
    "minutes": "Min.",
    "seconds": "Sek."
  },
  "footer": {
    "tagline": "Premium digitale Einladungen für Hochzeiten und besondere Feiern.",
    "product": "Produkt",
    "events": "Anlässe",
    "company": "Unternehmen",
    "rights": "© 2025 Festlich. Alle Rechte vorbehalten.",
    "privacy": "Datenschutz",
    "terms": "Nutzungsbedingungen",
    "cookies": "Cookies"
  }
}
```

### messages/en.json
```json
{
  "nav": {
    "features": "Features",
    "templates": "Templates",
    "pricing": "Pricing",
    "signIn": "Sign in",
    "startFree": "Start free"
  },
  "hero": {
    "eyebrow": "✦ Premium Digital Invitations",
    "headline": "Share your special day with style",
    "headlineEm": "style",
    "subheadline": "Festlich creates digital invitations of unforgettable elegance — for weddings, engagements, and every special celebration.",
    "cta": "Create invitation →",
    "demo": "View live demo"
  },
  "auth": {
    "signIn": "Sign in",
    "signUp": "Sign up",
    "signingIn": "Signing in...",
    "email": "Email address",
    "emailPlaceholder": "your@email.com",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "noAccount": "No account yet?",
    "hasAccount": "Already have an account?",
    "createAccount": "Create account",
    "errors": {
      "invalidCredentials": "Invalid email or password.",
      "emailInUse": "This email address is already registered."
    }
  },
  "invitation": {
    "days": "Days",
    "hours": "Hrs",
    "minutes": "Min",
    "seconds": "Sec",
    "confirmAttendance": "Confirm attendance →",
    "attending": "I'll be there with joy ✓",
    "notAttending": "Regretfully unable to attend"
  }
}
```

---

## 4. Database Schema

```sql
-- ══════════════════════════════════════════════════════════════
-- FESTLICH — Supabase Schema
-- Run this AFTER your existing auth is set up (auth.users exists)
-- ══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- PROFILES (extends existing auth.users)
-- ──────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  avatar_url       text,
  preferred_locale text not null default 'de' check (preferred_locale in ('de','en')),
  plan             text not null default 'free' check (plan in ('free','premium','luxury')),
  plan_expires_at  timestamptz,
  stripe_customer_id text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Own profile readable"
  on public.profiles for select using (auth.uid() = id);
create policy "Own profile editable"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup (works with YOUR existing Supabase auth)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, full_name, avatar_url, preferred_locale)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'locale', 'de')
  );
  return new;
end;
$$;

-- Only create trigger if it doesn't already exist
do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- ──────────────────────────────────────────────────────────────
-- TEMPLATES
-- ──────────────────────────────────────────────────────────────
create table public.templates (
  id           uuid primary key default uuid_generate_v4(),
  name_de      text not null,
  name_en      text not null,
  slug         text not null unique,
  desc_de      text,
  desc_en      text,
  event_types  text[] not null default '{}',
  thumbnail_url text,
  theme        jsonb not null default '{}',
  is_premium   boolean not null default false,
  is_featured  boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.templates enable row level security;
create policy "Templates are public"
  on public.templates for select using (true);

-- ──────────────────────────────────────────────────────────────
-- INVITATIONS
-- ──────────────────────────────────────────────────────────────
create table public.invitations (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  template_id         uuid references public.templates(id),
  slug                text not null unique,           -- festlich.de/e/lena-florian-juni25
  event_type          text not null default 'wedding'
                        check (event_type in ('wedding','engagement','birthday','reception','celebration','other')),
  -- Host names
  host_name_1         text,
  host_name_2         text,
  tagline             text,
  welcome_note        text,
  -- Bilingual content (optional override)
  welcome_note_en     text,
  -- Date
  event_date          date not null,
  ceremony_time       time,
  -- Venue
  venue_name          text,
  venue_address       text,
  venue_city          text,
  venue_lat           numeric(10,7),
  venue_lng           numeric(10,7),
  venue_map_url       text,
  -- Cover
  cover_image_url     text,
  -- Styling
  theme_overrides     jsonb default '{}',
  -- Invitation content
  dress_code          text,
  dress_code_en       text,
  special_notes       text,
  registry_message    text,
  registry_message_en text,
  -- RSVP settings
  rsvp_enabled        boolean not null default true,
  rsvp_deadline       date,
  max_guests_per_rsvp int not null default 4,
  collect_meal_pref   boolean not null default true,
  -- Access control
  is_published        boolean not null default false,
  is_pw_protected     boolean not null default false,
  access_pw_hash      text,
  -- Analytics
  view_count          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on public.invitations(owner_id);
create index on public.invitations(slug);

alter table public.invitations enable row level security;

create policy "Owners control their invitations"
  on public.invitations for all
  using (auth.uid() = owner_id);
create policy "Published invitations are public"
  on public.invitations for select
  using (is_published = true);

-- ──────────────────────────────────────────────────────────────
-- EVENTS (timeline items per invitation)
-- ──────────────────────────────────────────────────────────────
create table public.events (
  id            uuid primary key default uuid_generate_v4(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  name          text not null,
  name_en       text,
  start_time    timestamptz not null,
  end_time      timestamptz,
  venue_name    text,
  venue_address text,
  venue_lat     numeric(10,7),
  venue_lng     numeric(10,7),
  venue_map_url text,
  description   text,
  description_en text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index on public.events(invitation_id);
alter table public.events enable row level security;

create policy "Owners manage events"
  on public.events for all
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy "Published events readable"
  on public.events for select
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.is_published = true));

-- ──────────────────────────────────────────────────────────────
-- GUESTS
-- ──────────────────────────────────────────────────────────────
create table public.guests (
  id              uuid primary key default uuid_generate_v4(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  access_token    text not null default encode(gen_random_bytes(16), 'hex'),
  preferred_locale text not null default 'de' check (preferred_locale in ('de','en')),
  is_vip          boolean not null default false,
  table_number    text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique(invitation_id, email)
);

create index on public.guests(invitation_id);
create index on public.guests(access_token);

alter table public.guests enable row level security;
create policy "Owners manage guests"
  on public.guests for all
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- RSVPS
-- ──────────────────────────────────────────────────────────────
create table public.rsvps (
  id              uuid primary key default uuid_generate_v4(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  guest_id        uuid references public.guests(id) on delete set null,
  guest_name      text not null,
  guest_email     text,
  attending       boolean not null,
  guest_count     int not null default 1 check (guest_count >= 1 and guest_count <= 10),
  meal_preference text check (meal_preference in ('meat','fish','vegetarian','vegan','dietary','none')),
  dietary_notes   text,
  message         text,
  locale          text not null default 'de',          -- which language they used
  submitted_at    timestamptz not null default now(),
  ip_address      inet
);

create index on public.rsvps(invitation_id);
alter table public.rsvps enable row level security;

create policy "Owners view RSVPs"
  on public.rsvps for select
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy "Anyone submits RSVP to published invitation"
  on public.rsvps for insert
  with check (exists (
    select 1 from public.invitations i
    where i.id = invitation_id
    and i.is_published = true
    and i.rsvp_enabled = true
    and (i.rsvp_deadline is null or i.rsvp_deadline >= current_date)
  ));

-- ──────────────────────────────────────────────────────────────
-- GALLERY
-- ──────────────────────────────────────────────────────────────
create table public.gallery_items (
  id              uuid primary key default uuid_generate_v4(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  storage_path    text not null,
  url             text not null,
  caption         text,
  caption_en      text,
  width           int,
  height          int,
  size_bytes      int,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index on public.gallery_items(invitation_id);
alter table public.gallery_items enable row level security;

create policy "Owners manage gallery"
  on public.gallery_items for all
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy "Published gallery visible"
  on public.gallery_items for select
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.is_published = true));

-- ──────────────────────────────────────────────────────────────
-- REGISTRY LINKS
-- ──────────────────────────────────────────────────────────────
create table public.registry_links (
  id              uuid primary key default uuid_generate_v4(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  name            text not null,
  name_en         text,
  url             text,
  icon            text,
  sort_order      int not null default 0
);

alter table public.registry_links enable row level security;
create policy "Owners manage registry"
  on public.registry_links for all
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy "Published registry visible"
  on public.registry_links for select
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.is_published = true));

-- ──────────────────────────────────────────────────────────────
-- PAGE VIEWS (lightweight analytics)
-- ──────────────────────────────────────────────────────────────
create table public.page_views (
  id              bigserial primary key,
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  locale          text not null default 'de',
  guest_token     text,
  referrer        text,
  viewed_at       timestamptz not null default now()
);

create index on public.page_views(invitation_id, viewed_at);

-- ──────────────────────────────────────────────────────────────
-- TRIGGERS
-- ──────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger invitations_updated_at
  before update on public.invitations
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
```

---

## 5. Locale-Aware Invitation Page

```typescript
// app/[locale]/e/[slug]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'invitation' });
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('invitations')
    .select('host_name_1, host_name_2, event_date, cover_image_url')
    .eq('slug', params.slug)
    .single();

  if (!data) return {};

  const names = [data.host_name_1, data.host_name_2].filter(Boolean).join(' & ');
  return {
    title: `${names} — Festlich`,
    description: `${t('rsvp')} · ${data.event_date}`,
    openGraph: {
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
    alternates: {
      languages: {
        'de': `/de/e/${params.slug}`,
        'en': `/en/e/${params.slug}`,
      },
    },
  };
}

export default async function InvitationPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'invitation' });
  const supabase = createServerSupabaseClient();

  const { data: invitation } = await supabase
    .from('invitations')
    .select(`*, events(*), gallery_items(*), registry_links(*)`)
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (!invitation) notFound();

  // Track view with locale
  supabase.from('page_views').insert({
    invitation_id: invitation.id,
    locale: params.locale,
  }).then(() => {});

  // Choose bilingual content based on locale
  const locale = params.locale as 'de' | 'en';
  const welcomeNote = locale === 'en' && invitation.welcome_note_en
    ? invitation.welcome_note_en
    : invitation.welcome_note;

  return (
    <main lang={locale}>
      <InvitationHero invitation={invitation} locale={locale} />
      <CountdownTimer targetDate={invitation.event_date} t={t} />
      {welcomeNote && <WelcomeNote text={welcomeNote} />}
      <EventSchedule events={invitation.events} locale={locale} />
      <VenueCard invitation={invitation} t={t} />
      {invitation.rsvp_enabled && (
        <RSVPForm invitationId={invitation.id} deadline={invitation.rsvp_deadline} locale={locale} />
      )}
      <PhotoGallery items={invitation.gallery_items} locale={locale} />
      <GiftRegistry links={invitation.registry_links} locale={locale} />
      <ShareSection slug={invitation.slug} locale={locale} />
    </main>
  );
}
```

---

## 6. RSVP Server Action (with locale tracking)

```typescript
// lib/actions/rsvp.actions.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rsvpSchema } from '@/lib/validations/rsvp';
import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

export async function submitRSVP(
  invitationId: string,
  locale: 'de' | 'en',
  formData: unknown
) {
  const t = await getTranslations({ locale, namespace: 'invitation' });
  const parsed = rsvpSchema.safeParse(formData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { data: inv } = await supabase
    .from('invitations')
    .select('id, rsvp_enabled, rsvp_deadline, is_published')
    .eq('id', invitationId)
    .single();

  if (!inv?.is_published || !inv?.rsvp_enabled) {
    return { error: 'RSVP not available' };
  }

  const { error } = await supabase.from('rsvps').insert({
    invitation_id: invitationId,
    locale,
    ...parsed.data,
  });

  if (error) return { error: 'Submission failed' };

  revalidatePath(`/${locale}/e/${invitationId}`);
  return { success: true };
}
```

---

## 7. LanguageSwitcher Component

```typescript
// components/shared/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next-intl/client';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 text-xs tracking-widest uppercase">
      <button
        onClick={() => switchTo('de')}
        className={`px-3 py-1.5 rounded transition-all ${
          locale === 'de'
            ? 'bg-gold/20 text-gold-light'
            : 'text-ivory/40 hover:text-ivory/70'
        }`}
      >
        🇩🇪 Deutsch
      </button>
      <span className="text-ivory/20">·</span>
      <button
        onClick={() => switchTo('en')}
        className={`px-3 py-1.5 rounded transition-all ${
          locale === 'en'
            ? 'bg-gold/20 text-gold-light'
            : 'text-ivory/40 hover:text-ivory/70'
        }`}
      >
        🇬🇧 English
      </button>
    </div>
  );
}
```

---

## 8. next.config.ts

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default withNextIntl(config);
```

---

## 9. Tailwind Config

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory:     '#F9F6F0',
        cream:     '#F2ECE0',
        sand:      '#E8DCC8',
        champagne: '#D4BC96',
        taupe:     '#B89E7E',
        blush:     '#E2C4B8',
        rose:      '#C8907E',
        charcoal:  '#2A2520',
        'char-soft': '#46403A',
        gold:      '#B5924C',
        'gold-lt': '#D4AF70',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Jost', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.65s ease forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'rotate(-2deg) translateY(0)' },
          '50%':      { transform: 'rotate(-2deg) translateY(-10px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
```

---

## 10. Environment Variables

```env
# .env.local

# Your existing Supabase project (DO NOT change these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=de

# Stripe (future)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 11. Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.44.0",
    "next-intl": "^3.15.0",
    "framer-motion": "^11.3.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.6.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.400.0",
    "qrcode": "^1.5.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.0",
    "sonner": "^1.5.0",
    "stripe": "^16.0.0",
    "@stripe/stripe-js": "^4.0.0"
  }
}
```

---

## 12. Supabase Storage Buckets

Create in Supabase Dashboard → Storage:

| Bucket | Visibility | Notes |
|--------|-----------|-------|
| `invitation-covers` | Public | Hero/cover images |
| `invitation-gallery` | Public | Gallery photos |
| `qr-codes` | Public | Generated QR PNGs |

**RLS on storage**: Owners can upload to `{user_id}/{invitation_id}/...`, public can read published buckets.

---

## 13. Local Setup (README)

### Prerequisites
- Node.js 20+, pnpm
- Your existing Supabase project

### Steps
```bash
# 1. Clone & install
git clone https://github.com/your/festlich.git
cd festlich && pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your existing SUPABASE_URL and ANON_KEY

# 3. Add Festlich schema (does NOT touch auth.users)
# In Supabase SQL Editor → paste supabase/migrations/001_festlich_schema.sql

# 4. Run seed data
# In Supabase SQL Editor → paste supabase/seed.sql

# 5. Create storage buckets (Dashboard → Storage)
# invitation-covers, invitation-gallery, qr-codes (all public)

# 6. Start dev server
pnpm dev
# → http://localhost:3000  (German, default)
# → http://localhost:3000/en  (English)
```

### URL Structure
```
/de/               ← German home (default)
/en/               ← English home
/de/anmelden       ← Sign in (DE)
/en/sign-in        ← Sign in (EN) — configure via next-intl pathnames
/de/dashboard      ← Dashboard
/de/e/[slug]       ← Public invitation (DE)
/en/e/[slug]       ← Public invitation (EN)
```

---

## 14. i18n Pathnames (next-intl routing)

```typescript
// routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  pathnames: {
    '/': '/',
    '/preise': { de: '/preise', en: '/pricing' },
    '/vorlagen': { de: '/vorlagen', en: '/templates' },
    '/anmelden': { de: '/anmelden', en: '/sign-in' },
    '/registrieren': { de: '/registrieren', en: '/sign-up' },
    '/passwort-vergessen': { de: '/passwort-vergessen', en: '/forgot-password' },
    '/dashboard': '/dashboard',
    '/e/[slug]': '/e/[slug]',
  },
});
```

---

## 15. Future Improvements

### Product
- **Automated email dispatch** via Resend — send personalised invitation links to guest list with one click, in their preferred language
- **AI welcome note generator** — write emotionally resonant greetings in German and English using Claude
- **Video cover support** — short looping clips behind the couple's names
- **Post-event memory book** — guests upload their own photos after the event, all linked to the invitation
- **WhatsApp broadcast integration** — official WhatsApp Business API to send invitations at scale
- **Seating chart editor** — drag-and-drop table planner linked to the guest list
- **Digital RSVP cards** — downloadable PDF confirmation for guests
- **Multilingual RSVP** — guests can respond in their own language (Turkish, Arabic, French, etc.)

### Technical
- **Edge runtime** for `/e/[slug]` invitation pages — ultra-fast delivery via Vercel Edge
- **Supabase Realtime** for live RSVP counter in dashboard (no polling)
- **Vercel OG** — dynamic Open Graph images per invitation (couple names + photo)
- **PWA** — guests can add invitation to home screen, works offline
- **E2E tests** with Playwright — RSVP flow, auth, dashboard, both locales
- **Storybook** — component library with DE/EN variants
- **Supabase branching** — safe schema migrations per feature branch
- **i18n completeness check** — CI step that fails if any translation key is missing in either locale

---

*Festlich — für den schönsten Tag deines Lebens.*  
*Festlich — for the most beautiful day of your life.*
