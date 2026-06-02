# R2 Setup

Required env vars for R2 image/screenshot storage:

```env
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET=linkforge-assets
CLOUDFLARE_R2_PUBLIC_DOMAIN=assets.yourdomain.com  # optional, for direct URLs
CLOUDFLARE_R2_MAX_UPLOAD_BYTES=10485760             # 10MB default
```

Run migrations after adding `r2_key` column:
```bash
npm run db:migrate
```

Migrate existing images:
```bash
npx tsx scripts/migrate-images-to-r2.ts
```

Migrate existing screenshots:
```bash
npx tsx scripts/migrate-screenshots-to-r2.ts
```
