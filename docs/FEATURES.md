# LinkForge Features

## Link Cloaking (Affiliate Links)

A short branded link hides the real destination. If you share `brand.com/deal`, visitors never see the long affiliate URL behind it. They just see your domain.

**How to use it:** Create any link. The destination stays hidden.

---

## Password Protection

Lock a link with a password. Visitors must enter it before they get through. Once they do, they won't be asked again for 24 hours.

**How to set it:** Create Link panel → Advanced tab → Password field.  
**How it works:** The password is scrambled before storing (never saved as plain text). A cookie keeps visitors logged in.

---

## Deep Link Routing

Send phone users to different places based on what phone they use.
- iPhone → App Store
- Android → Play Store
- Everyone else → Your main link

**How to set it:** Create Link panel → Advanced tab → iOS / Android Destination fields.  
**How it works:** The system checks the visitor's phone type. A/B test variants can also have their own phone-specific links.

---

## A/B Testing

Send different visitors to different pages to see which one works better. Each option gets a "weight" that decides what share of traffic it gets.

**How to set it:** Create Link panel → A/B Testing tab.  
**How it works:** Each option gets a slice of traffic based on the weights you pick. The bar chart shows the split. Requires the Growth plan.

### Smart A/B Optimization (AI)
After enough clicks, click **AI Optimize** (edit mode). AI looks at which variant is performing best and suggests better weight splits. One click to apply.

---

## UTM Parameters

Add tracking codes to your link so Google Analytics knows where your traffic came from.

**How to set it:** Create Link panel → UTM Parameters tab.  
**What it tracks:** Source (where from), Medium (how), Campaign (which promo), Term (keyword), Content (which ad version).  
**How it works:** Tags are stored with the link and added automatically when someone visits. No need to edit the original URL.

---

## AI Slug Suggestions

Get a short, readable link name from the page address.

**How to use it:** Click the sparkles icon next to the slug box.  
**How it works:** The system picks meaningful words from the URL, drops filler words like "the" and "and", and joins them with dashes. Works instantly with no AI call.

---

## Auto-Fill (AI)

Automatically write the title, description, and preview image for a link.

**How to use it:** Click **Auto-fill** next to the Title box (Create Link panel → General tab).  
**How it works:** AI reads your destination page and fills in all three fields in one click.

---

## Ask AI About Analytics

Type a question about your link data in plain English and get an answer.

**How to use it:** Open any link's analytics → find the "Ask AI about this link" box.  
**Things you can ask:**
- "Which device got the most clicks?"
- "What's my best link?"
- "How many visitors this week?"

**How it works:** AI reads your numbers and answers with plain facts.

---

## Check Links (AI)

Scan all your links to find ones that are broken or changed.

**How to use it:** Click **Check Links** on the Links page.  
**How it works:** Each link is pinged. If the page title or content has changed, AI spots it and lets you know.

---

## Bulk Create

Make many links at once by typing them in or uploading a file.

**How to use it:** Click **Bulk Create** on the Links page.  
**Two ways:**
- **Paste URLs:** Type one per line, add shared tags/UTMs, review, create.
- **Upload CSV:** Upload a spreadsheet. The system figures out which column is which. Review, then create.

Requires the Growth plan for full access.

---

## Export CSV

Download all your links as a spreadsheet.

**How to use it:** Click **Export CSV** on the Links page.  
**What you get:** Slug, destination, title, tags, clicks, UTM tags, creation date.

---

## QR Codes

Every link has a QR code you can change the colours on, then download as a picture. QR scans show up in your analytics.

---

## Analytics

Click the chart icon on any link row. You'll see:

**Numbers at a glance:** Total clicks, unique visitors, today's clicks, top device, top country.

**Charts:** Clicks over time (last 7 days), device breakdown, top countries, top referrers.

**Live Activity:** A live feed that updates every 5 seconds. Shows device, browser, location, and where the visitor came from for the last 50 clicks.

---

## What Visitors Experience

1. Someone clicks your short link.
2. If the link has a password, they see a password page first (once verified, they're good for 24 hours).
3. If A/B testing is on, they get sent to a random variant.
4. If they're on a phone with a special link set, they get that instead.
5. Tracking tags (UTMs) are added to the URL.
6. They get sent to the final page.
7. The click is recorded in the background.

All of this happens in under a second.
