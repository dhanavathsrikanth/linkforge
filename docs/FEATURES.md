# LinkForge Features

## Password Protection

Protect any short link with a password. When someone visits the link, they're asked to enter the password before being redirected to the destination. Once they enter the correct password, they won't be asked again for 24 hours.

**Where to set it:** Open the Create Link panel → Advanced tab → Password field.  
**How it works:** The password is encrypted before being stored (never stored in plain text). When a visitor enters the password, it's verified against the stored encrypted version. The visitor gets a temporary "pass" cookie so they don't have to re-enter it each time they visit.

---

## Deep Link Routing

Send mobile users to different destinations based on their device type. For example:
- iPhone/iPad users → App Store download page or app deep link
- Android users → Google Play Store or app deep link
- Everyone else → Your default destination

**Where to set it:** Open the Create Link panel → Advanced tab → iOS / Android Destination fields.  
**How it works:** When someone clicks the link, the system reads their device type from the browser's user-agent string. iPhone, iPad, and iPod visitors get the iOS destination. Android visitors get the Android destination. Everyone else gets the default destination.

---

## A/B Testing

Show different destinations to different visitors to test which one performs better. Each variant gets a "weight" that determines what percentage of traffic it receives.

**Example:** Send 70% of visitors to your main landing page and 30% to a new test page.

**Where to set it:** Open the Create Link panel → A/B Testing tab → Toggle it on, then add your variants.  
**How it works:** Each visitor is randomly assigned to a variant based on the weights you set. The assignment is random — not based on the visitor's location, device, or any other factor. The distribution bar shows you what percentage of traffic each variant will receive. Requires the Growth plan or above.

---

## UTM Parameter Appending

Automatically add tracking parameters (UTM tags) to your destination URL so you can track where your traffic comes from in Google Analytics or other analytics tools.

**Where to set it:** Open the Create Link panel → UTM Parameters tab.  
**How it works:** The five standard UTM parameters (source, medium, campaign, term, content) are stored with the link. When a visitor clicks the link and gets redirected, these parameters are automatically added to the destination URL. This works even if your original URL doesn't have any tracking set up.

---

## AI-Powered Slug Suggestions

When you paste a URL, the system can automatically suggest a human-readable short slug based on the content of the destination page address.

**Where to use it:** In the Quick Create bar or Create Link panel, click the sparkles icon next to the slug input field.  
**How it works:** The system extracts meaningful words from the destination URL's path and domain, filters out common filler words (like "the", "and", "for"), and combines them into a clean, readable slug. No external AI service is needed — it works instantly.

---

## Bulk Link Creation

Create many links at once by either:
- **Pasting URLs:** Type or paste one URL per line, then apply common settings (tags, UTM parameters) to all of them.
- **Uploading a CSV file:** Upload a spreadsheet with columns for destination, slug, title, tags, and UTM parameters. The system auto-detects which column is which, and you can adjust the mapping if needed.

**Where to use it:** Click the "Bulk Create" button on the Links page.  
**How it works:** After you paste URLs or upload a CSV, you review all the links in a table. Each row shows a preview of the link that will be created. After creation, you see which links succeeded and which had errors (like duplicate slugs). Requires the Growth plan or above for full functionality.

---

## CSV Export

Download all your links as a CSV spreadsheet for analysis, reporting, or backup. The export includes slug, destination URL, title, tags, click counts, UTM parameters, and more.

**Where to use it:** Click the "Export CSV" button on the Links page.
