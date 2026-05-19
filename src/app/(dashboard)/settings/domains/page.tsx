import { WaitlistDashboard } from "@/components/waitlist/WaitlistDashboard";

export default function DomainsComingSoonPage() {
  return (
    <WaitlistDashboard
      feature="custom-domains"
      badge={{
        label: "COMING SOON",
        className: "border-border bg-muted text-muted-foreground",
      }}
      headline="Connect your own domain to every link you create."
      subtext="Replace generic short links with your own brand. go.acmecorp.com instead of linkfor.ge/abc123. Full SSL, instant setup, zero technical knowledge required."
      bullets={[
        "One CNAME record \u2014 setup takes under 5 minutes",
        "Automatic SSL certificate \u2014 no configuration needed",
        "Works across all your links instantly",
      ]}
      buttonLabel="Notify Me"
      timelineLabel="Q3 2026 \u2014 available on Starter plan and above"
    />
  );
}
