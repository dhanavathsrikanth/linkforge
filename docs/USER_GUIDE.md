# LinkForge User Guide

## Overview

LinkForge lets you take long, messy URLs and turn them into short, clean links that you can share anywhere — social media, emails, SMS, QR codes, or your link-in-bio page. Beyond shortening, you can add password protection, send mobile users to different destinations, run A/B tests, and track every click.

---

## Quick Start: Create Your First Link

1. Log in to your LinkForge dashboard.
2. On the Links page, you'll see a quick-create bar at the top with two fields:
   - **Destination URL** — paste the long URL you want to shorten.
   - **Slug** — this is the short part after your domain (e.g., if your domain is `forge.link`, the slug turns into `forge.link/your-slug`). Leave it blank to auto-generate one.
3. Press Enter or click the arrow button.
4. Your link is created and copied to your clipboard instantly.

---

## The Links Page

This is your main workspace. You'll see:

| Element | What it does |
|---------|-------------|
| **Quick Create bar** | The top bar with destination + slug fields for instant link creation |
| **Links table** | Every link you've created, showing slug, destination, title, clicks, and actions |
| **Actions (icons on each row)** | Copy, visit, view analytics, customize QR code, edit, delete |

To edit an existing link, click anywhere on its row to expand it, then click the pencil icon.

---

## Creating Links with Advanced Options

For more control, click the **Create Link** button (opens a side panel). It has four tabs:

### 1. General Tab
- **Destination URL** (required) — where the short link sends people.
- **Slug** — customise the short part of the link.
- **Title** — an internal label to help you identify the link (not shown to visitors).
- **Tags** — add tags to organise your links (e.g., "campaign", "product", "blog").

### 2. UTM Parameters Tab
Add tracking tags so Google Analytics (or other tools) can tell you where your traffic came from.

| Field | What it tracks | Example |
|-------|---------------|---------|
| Source | The platform sending traffic | `newsletter`, `twitter`, `facebook` |
| Medium | The type of traffic | `email`, `social`, `cpc` |
| Campaign | Your campaign name | `summer-sale`, `product-launch` |
| Term | Paid search keyword | `running-shoes` |
| Content | Different versions of the same ad | `hero-banner`, `sidebar-link` |

These parameters are automatically added to your destination URL when someone clicks the link. You don't need to modify the original URL.

### 3. A/B Testing Tab
Test different destinations to see which performs better.

1. Toggle **Enable A/B testing** on.
2. Add variants (at least 2). Each variant has:
   - **Destination** — the URL for this variant.
   - **Weight** — what percentage of traffic this variant receives. If you set Variant A to 70 and Variant B to 30, then 70% of visitors go to A and 30% go to B.
3. The coloured bar at the bottom of each variant shows your traffic distribution at a glance.
4. You can add more variants or remove any (you need at least 2).

*Requires the Growth plan or above.*

### 4. Advanced Tab
- **Password** — protect the link so only people with the password can access it. Visitors will see a password entry page before being redirected.
- **Expiration** — set the link to expire on a specific date or after a certain number of clicks. Expired links show a "Link expired" page.
- **iOS Destination** — iPhone/iPad users get sent here instead of the default destination. Useful for App Store links or app deep links.
- **Android Destination** — Android users get sent here instead. Useful for Play Store links or app deep links.
- **Open Graph (OG) settings** — customise the title, description, and preview image that appear when the link is shared on social media (Facebook, Twitter, LinkedIn, etc.).

---

## Bulk Creating Links

When you need to create many links at once, click the **Bulk Create** button on the Links page. You have two options:

### Option A: Paste URLs
1. Type or paste one URL per line in the text area.
2. Optionally add common tags and UTM parameters that apply to all links.
3. Click Next, review the list, then click Create.

### Option B: Upload a CSV
1. Prepare a spreadsheet with columns like `destination`, `slug`, `title`, `tags`, `utm_source`, etc.
2. Export it as a CSV file.
3. Drag and drop the file or click to browse.
4. The system will auto-detect which column is which. You can adjust the mapping if needed.
5. Click Next, review the list, then click Create.

After creation, you'll see a summary of how many links succeeded and any errors (like duplicate slugs).

*Full bulk creation requires the Growth plan or above. Free and Starter plans can see the button but will be prompted to upgrade.*

---

## Exporting Your Links

Click the **Export CSV** button on the Links page to download all your links as a spreadsheet. The file includes slug, destination URL, title, tags, total clicks, unique clicks, UTM parameters, and creation date. Useful for reporting, analysis, or backup.

---

## QR Codes

Each link has a QR code that you can customise:

1. Click the QR code icon on any link row.
2. In the side panel that opens, you can change:
   - **Foreground colour** — the colour of the QR pattern.
   - **Background colour** — the colour behind the pattern.
3. The QR code updates instantly as you make changes.
4. Click Download to save the QR code as an image.

When someone scans a QR code with `?source=qr` in the URL, LinkForge records it as a QR scan in analytics.

---

## Analytics

Each link has its own analytics dashboard. Click the chart icon on any link row to see:

### Overview Cards
- **Total Clicks** — all clicks on this link.
- **Unique Visitors** — clicks from different people (based on IP address, counted once per day).
- **Live Activity** — clicks happening right now (updates in real time).
- **Total Links** — all links in your workspace.

### Charts
- **Clicks Over Time** — a graph showing clicks for each day over the last 7 days.
- **Device Breakdown** — what devices people used (desktop, mobile, tablet).
- **Top Countries** — where your visitors are located (map view).
- **Top Referrers** — which websites sent you traffic.
- **Browser & OS** — what browsers and operating systems people used.

---

## Visitor Flow (What Happens When Someone Clicks Your Link)

1. A visitor clicks your short link (`forge.link/summer-sale`).
2. LinkForge checks if the link exists and is active.
3. **Expiration check** — if the link expired or hit its click limit, the visitor sees a "Link not available" page.
4. **Password check** — if the link has a password, the visitor sees the password entry page. After entering the correct password, they proceed (and won't be asked again for 24 hours).
5. **A/B test** — if A/B testing is enabled, a random variant is selected based on the weights you set.
6. **Deep link routing** — if the visitor is on iPhone/iPad and you set an iOS destination (or Android and you set an Android destination), they get sent there instead.
7. **UTM parameters** — your tracking parameters are added to the final destination URL.
8. **Redirect** — the visitor is sent to the final URL.
9. **Tracking** — the click is logged in the background with device type, browser, operating system, country, city, and referrer. This happens without affecting the visitor's experience.

All of this happens in under a second.

---

## Plans & Features

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|------------|
| Links per month | Limited | Limited | High | Custom |
| Basic analytics | Yes | Yes | Yes | Yes |
| Password protection | Yes | Yes | Yes | Yes |
| Deep link routing | Yes | Yes | Yes | Yes |
| UTM parameter appending | Yes | Yes | Yes | Yes |
| QR codes | Yes | Yes | Yes | Yes |
| CSV export | Yes | Yes | Yes | Yes |
| AI slug suggestions | Yes | Yes | Yes | Yes |
| A/B testing | — | — | Yes | Yes |
| Bulk link creation (full) | — | — | Yes | Yes |
| Team members | — | — | Up to 5 | Custom |
| Priority support | — | — | — | Yes |

---

## Need Help?

- Check the Links page in your dashboard — error messages and tooltips explain most things inline.
- Upgrade your plan from the Settings page to unlock A/B testing and bulk creation.
