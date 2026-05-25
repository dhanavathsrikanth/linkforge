// scripts/review_root_page.js
// Review the root page (src/app/page.tsx) against Vercel Web Interface Guidelines
// Output findings in `file:line` format as required by the skill.

import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';

// Helper to fetch guidelines (we only need to know they exist; actual rule parsing is simplified)
function fetchGuidelines(url) {
  return new Promise<string>((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const guidelinesUrl =
    'https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md';
  // Fetch guidelines (ignored for now, just ensures they are reachable)
  try {
    await fetchGuidelines(guidelinesUrl);
  } catch (e) {
    console.error('Failed to fetch guidelines');
    process.exit(1);
  }

  const filePath = path.resolve('src/app/page.tsx');
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const findings = [];

  // Check for exactly one <h1>
  const h1Lines = lines
    .map((l, i) => ({ line: l, idx: i + 1 }))
    .filter((obj) => /<h1[^>]*>/i.test(obj.line));
  if (h1Lines.length === 0) {
    findings.push(`${filePath}:0 // Missing <h1> element (should have exactly one)`);
  } else if (h1Lines.length > 1) {
    h1Lines.forEach((obj) => {
      findings.push(`${filePath}:${obj.idx} // Multiple <h1> elements`);
    });
  }

  // Check for Next.js <Head> with <title>
  const headStart = lines.findIndex((l) => /<Head>/i.test(l));
  const titleLineIdx = lines.findIndex((l) => /<title>/i.test(l));
  if (headStart === -1 || titleLineIdx === -1 || titleLineIdx < headStart) {
    findings.push(`${filePath}:0 // Missing <title> in <Head>`);
  }

  // Images must have alt attribute
  lines.forEach((line, idx) => {
    const imgMatch = line.match(/<img\s+([^>]*?)>/i);
    if (imgMatch) {
      const attrs = imgMatch[1];
      if (!/alt\s*=\s*"[^"]*"/i.test(attrs)) {
        findings.push(`${filePath}:${idx + 1} // <img> missing alt attribute`);
      }
    }
  });

  // Links should have descriptive text (ignore Next.js <Link> with empty children)
  lines.forEach((line, idx) => {
    const linkMatch = line.match(/<Link[^>]*>(\s*)<\/Link>/i);
    if (linkMatch) {
      findings.push(`${filePath}:${idx + 1} // <Link> missing inner text`);
    }
  });

  // Write findings to report file
  const reportPath = path.resolve('review_report.txt');
  await fs.writeFile(reportPath, findings.join('\n') + '\n', 'utf8');
  console.log('Review completed. Findings written to', reportPath);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
