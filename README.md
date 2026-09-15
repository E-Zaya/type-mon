This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## AI Polish (`/api/polish`)

The "Засах" button sends the transliterated Cyrillic text to Gemini for a
light edit (typos, grammar, particle agreement) without changing meaning.

### Environment variables

Copy `.env.local.example` to `.env.local` and fill it in:

```
GEMINI_API_KEY=...               # https://aistudio.google.com/apikey

# Accounts and Plus (Supabase → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Where auth links land. Local: http://localhost:3003
NEXT_PUBLIC_SITE_URL=https://type-mon.vercel.app
# Signs the guest-quota cookie (any long random string; `openssl rand -hex 32`)
TYPEMON_COOKIE_SECRET=...
```

Without the Supabase variables the app runs in guest mode: conversion and
the typing test work, sign-in is hidden.

### Database

Apply `supabase/migrations/*.sql` in order (Supabase SQL editor or `supabase db push`).
In Supabase Auth, enable the Google provider and the email (magic link)
provider, and add `<site>/auth/callback` to the redirect URL allow-list.

### Limits

- 500 characters per request (server + client enforced)

Constants live in `lib/polish-prompt.ts`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
