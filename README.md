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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production Setup

LinkForge requires several environment variables to function in production.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |
| `INTERNAL_SECRET` | Secret for triggering internal APIs (Flush, Cron) |
| `CLERK_WEBHOOK_SECRET` | Secret from Clerk dashboard for webhooks |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

### Analytics Persistence (Flush)

To migrate real-time click data from Redis to Postgres, you must trigger the flush API periodically.

**Option 1: GitHub Actions (Recommended)**
A workflow is provided in `.github/workflows/analytics-flush.yml`. Add `INTERNAL_SECRET` and `APP_URL` to your repository secrets.

**Option 2: Manual Script**
```bash
export INTERNAL_SECRET=your_secret
export APP_URL=https://your-app.com
npx tsx scripts/flush-analytics.ts
```

## Learn More
...

