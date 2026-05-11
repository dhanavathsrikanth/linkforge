import dns from "dns/promises";

/**
 * Verifies a domain's DNS settings.
 * 
 * We check for:
 * 1. A TXT record at _linkforge.<domain> containing linkforge-verification=<token>
 * 2. (Optional) A CNAME record pointing to our edge infrastructure
 */
export async function verifyDomainDNS(domain: string, expectedToken: string) {
  try {
    // 1. Check TXT record for verification
    // This is the most reliable way to verify ownership without affecting traffic
    const txtRecords = await dns.resolveTxt(`_linkforge.${domain}`);
    const hasTxtMatch = txtRecords.some((record) => 
      record.some(part => part.includes(`linkforge-verification=${expectedToken}`))
    );
    
    // 2. Check CNAME record
    // This verifies that the domain is actually pointed to us
    let hasCnameMatch = false;
    try {
      const cnameRecords = await dns.resolveCname(domain);
      const target = process.env.NEXT_PUBLIC_CNAME_TARGET || "cname.linkforge.com";
      hasCnameMatch = cnameRecords.some((record) => record.toLowerCase().includes(target.toLowerCase()));
    } catch (e) {
      // Might be using an A record or just not set up yet
    }

    // 3. Check A record (alternative to CNAME)
    let hasARecordMatch = false;
    try {
      const aRecords = await dns.resolve4(domain);
      const targetIp = process.env.NEXT_PUBLIC_A_RECORD_TARGET; // e.g. "76.76.21.21" (Vercel-like)
      if (targetIp) {
        hasARecordMatch = aRecords.includes(targetIp);
      }
    } catch (e) {}

    return {
      verified: hasTxtMatch,
      txtFound: hasTxtMatch,
      cnameFound: hasCnameMatch,
      aRecordFound: hasARecordMatch,
    };
  } catch (error) {
    console.warn(`DNS Verification check for ${domain}:`, (error as Error).message);
    return {
      verified: false,
      txtFound: false,
      cnameFound: false,
      aRecordFound: false,
      error: (error as Error).message,
    };
  }
}
