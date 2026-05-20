import { WaitlistDashboard } from "@/components/waitlist/WaitlistDashboard";

export const metadata = {
  title: "Custom Domains - Coming Soon",
};

export default function DomainsComingSoonPage() {
  return (
    <div className="py-8">
      <WaitlistDashboard
        feature="custom-domains"
        badge={{
          label: "COMING SOON",
          className: "border-border bg-muted text-muted-foreground",
        }}
        headline="Connect your own domain to every link you create."
        subtext="Replace generic short links with your own brand. go.acmecorp.com instead of linkfor.ge/abc123. Full SSL, instant setup, zero technical knowledge required."
        bullets={[
          "One CNAME record — setup takes under 5 minutes",
          "Automatic SSL certificate — no configuration needed",
          "Works across all your links instantly",
        ]}
        buttonLabel="Notify Me"
        timelineLabel="Q3 2026 — available on Starter plan and above"
      />
    </div>
  );
}
