import { render } from "@react-email/render";
import { resend } from "./resend";
import type { PlanKey } from "./billing/plans";

// ── Constants ──────────────────────────────────────────────────────────────────
const FROM = "LinkForge <noreply@linkforge.io>";
const REPLY_TO = "support@linkforge.io";

// ── Lazy template imports (avoids bundling in Edge runtime) ────────────────────
async function renderWelcome(props: { name: string; email: string }) {
  const { default: WelcomeEmail } = await import("../../emails/WelcomeEmail");
  return render(WelcomeEmail(props));
}

async function renderClickAlert(props: {
  linkTitle: string;
  linkSlug: string;
  shortUrl: string;
  milestone: 100 | 1000 | 10000;
  totalClicks: number;
  topCountry: string;
  topDevice: string;
  workspaceId: string;
}) {
  const { default: LinkClickAlert } = await import("../../emails/LinkClickAlert");
  return render(LinkClickAlert(props));
}

async function renderWeeklyDigest(props: {
  name: string;
  email: string;
  weekStart: string;
  weekEnd: string;
  totalClicks: number;
  prevTotalClicks: number;
  topLinks: { title: string; slug: string; clicks: number; prevClicks: number }[];
  recommendation?: string;
}) {
  const { default: WeeklyDigest } = await import("../../emails/WeeklyDigest");
  return render(WeeklyDigest(props));
}

async function renderTeamInvite(props: {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  inviteToken: string;
  recipientEmail: string;
  expiresInDays?: number;
}) {
  const { default: TeamInvite } = await import("../../emails/TeamInvite");
  return render(TeamInvite(props));
}

async function renderPlanUpgraded(props: {
  name: string;
  email: string;
  plan: PlanKey;
  billingCycle: "monthly" | "annual";
}) {
  const { default: PlanUpgraded } = await import("../../emails/PlanUpgraded");
  return render(PlanUpgraded(props));
}

// ── Send helpers ───────────────────────────────────────────────────────────────

/**
 * Fires after user.created — send in a setTimeout so the webhook returns fast.
 */
export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const html = await renderWelcome({ name, email: to });
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `Welcome to LinkForge, ${name.split(" ")[0]}! 🎉`,
      html,
    });
  } catch (err) {
    console.error("[email] sendWelcomeEmail failed:", err);
  }
}

/**
 * Fires when a link hits a click milestone (100 / 1000 / 10000).
 */
export async function sendClickMilestoneEmail(
  to: string,
  props: {
    linkTitle: string;
    linkSlug: string;
    shortUrl: string;
    milestone: 100 | 1000 | 10000;
    totalClicks: number;
    topCountry: string;
    topDevice: string;
    workspaceId: string;
  }
) {
  try {
    const html = await renderClickAlert(props);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `🎉 "${props.linkTitle}" just hit ${props.milestone.toLocaleString()} clicks!`,
      html,
    });
  } catch (err) {
    console.error("[email] sendClickMilestoneEmail failed:", err);
  }
}

/**
 * Fires via Vercel cron every Monday at 9am UTC.
 */
export async function sendWeeklyDigest(
  to: string,
  props: {
    name: string;
    weekStart: string;
    weekEnd: string;
    totalClicks: number;
    prevTotalClicks: number;
    topLinks: { title: string; slug: string; clicks: number; prevClicks: number }[];
    recommendation?: string;
  }
) {
  try {
    const html = await renderWeeklyDigest({ ...props, email: to });
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `📊 Your week in links — ${props.weekStart} to ${props.weekEnd}`,
      html,
    });
  } catch (err) {
    console.error("[email] sendWeeklyDigest failed:", err);
  }
}

/**
 * Fires when a workspace member is invited.
 */
export async function sendTeamInviteEmail(
  to: string,
  props: {
    inviterName: string;
    inviterEmail: string;
    workspaceName: string;
    role: string;
    inviteToken: string;
    expiresInDays?: number;
  }
) {
  try {
    const html = await renderTeamInvite({ ...props, recipientEmail: to });
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `${props.inviterName} invited you to join ${props.workspaceName} on LinkForge`,
      html,
    });
  } catch (err) {
    console.error("[email] sendTeamInviteEmail failed:", err);
  }
}

/**
 * Fires after a successful Dodo payment / plan upgrade.
 */
export async function sendPlanUpgradedEmail(
  to: string,
  props: {
    name: string;
    plan: PlanKey;
    billingCycle: "monthly" | "annual";
  }
) {
  try {
    const html = await renderPlanUpgraded({ ...props, email: to });
    const planName = props.plan.charAt(0).toUpperCase() + props.plan.slice(1);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `You're now on the ${planName} plan 🚀`,
      html,
    });
  } catch (err) {
    console.error("[email] sendPlanUpgradedEmail failed:", err);
  }
}
