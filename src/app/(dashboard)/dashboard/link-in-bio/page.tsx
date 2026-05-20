import { WaitlistDashboard } from "@/components/waitlist/WaitlistDashboard";

export const metadata = {
  title: "Link in Bio - Beta Waitlist",
};

export default function LinkInBioWaitlistPage() {
  return (
    <div className="py-8">
      <WaitlistDashboard
        feature="link-in-bio"
        badge={{
          label: "BETA — Limited Access",
          className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        }}
        headline="Your branded bio page. All your links. One URL."
        subtext="Build a beautiful branded page for your Instagram, TikTok, and YouTube bio. Choose from 5 premium templates, drag-and-drop your links, and track every click — all on your own domain."
        bullets={[
          "5 premium templates that beat Linktree on design",
          "Drag-and-drop link ordering",
          "Per-link click analytics for every button",
        ]}
        buttonLabel="Join Beta"
        timelineLabel="Q3 2026 — invites going out to waitlist first"
      />
    </div>
  );
}
