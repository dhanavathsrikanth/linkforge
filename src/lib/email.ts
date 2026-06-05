import { render } from "@react-email/render";
import { resend } from "./resend";
import type { PlanKey } from "./billing/plans";

// ── Constants ──────────────────────────────────────────────────────────────────
const FROM = "PivotUrl <noreply@mail.pivoturl.com>";
const REPLY_TO = "support@pivoturl.com";

// ── Lazy template imports (avoids bundling in Edge runtime) ────────────────────
async function renderWelcome(props: { name: string; email: string }) {
  const { default: WelcomeEmail } = await import("../../emails/WelcomeEmail");
  return render(WelcomeEmail(props));
}

async function renderFirstClickAlert(props: {
  name: string;
  linkTitle: string;
  linkSlug: string;
  linkUrl: string;
  workspaceId: string;
}) {
  const { default: FirstClickAlert } = await import("../../emails/FirstClickAlert");
  return render(FirstClickAlert(props));
}

async function renderMonthlyReport(props: {
  name: string;
  email: string;
  monthLabel: string;
  totalClicks: number;
  prevTotalClicks: number;
  totalLinks: number;
  newLinks: number;
  topLinks: { title: string; slug: string; clicks: number; prevClicks: number }[];
  topCountry: string;
  topDevice: string;
}) {
  const { default: MonthlyReport } = await import("../../emails/MonthlyReport");
  return render(MonthlyReport(props));
}

async function renderDomainVerified(props: {
  name: string;
  domain: string;
  dashboardUrl: string;
  isDefault: boolean;
  role: string;
}) {
  const { default: DomainVerified } = await import("../../emails/DomainVerified");
  return render(DomainVerified(props));
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

async function renderPlanUpgraded(props: {
  name: string;
  email: string;
  plan: PlanKey;
  billingCycle: "monthly" | "annual";
}) {
  const { default: PlanUpgraded } = await import("../../emails/PlanUpgraded");
  return render(PlanUpgraded(props));
}

async function renderFirstLinkCreated(props: {
  name: string;
  linkTitle: string;
  linkSlug: string;
  dashboardUrl: string;
}) {
  const { default: FirstLinkCreated } = await import("../../emails/FirstLinkCreated");
  return render(FirstLinkCreated(props));
}

async function renderInactiveUser(props: {
  name: string;
  email: string;
  lastSeenDays: number;
  totalLinks: number;
  totalClicks: number;
  totalClicksChange: number;
  topLinkTitle: string;
  topLinkClicks: number;
  dashboardUrl: string;
}) {
  const { default: InactiveUser } = await import("../../emails/InactiveUser");
  return render(InactiveUser(props));
}

async function renderBioPublished(props: {
  name: string;
  pageName: string;
  pageUrl: string;
  dashboardUrl: string;
  hasCustomDomain: boolean;
}) {
  const { default: BioPublished } = await import("../../emails/BioPublished");
  return render(BioPublished(props));
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
      subject: `Welcome to PivotUrl, ${name.split(" ")[0]}! 🎉`,
      html,
    });
  } catch (err) {
    console.error("[email] sendWelcomeEmail failed:", err);
  }
}

/**
 * Fires when a brand-new link receives its very first click.
 */
export async function sendFirstClickAlert(
  to: string,
  props: {
    name: string;
    linkTitle: string;
    linkSlug: string;
    linkUrl: string;
    workspaceId: string;
  }
) {
  try {
    const html = await renderFirstClickAlert(props);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `🎯 "${props.linkTitle}" just got its first click!`,
      html,
    });
  } catch (err) {
    console.error("[email] sendFirstClickAlert failed:", err);
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
 * Fires via Vercel cron on the 1st of every month.
 */
export async function sendMonthlyReport(
  to: string,
  props: {
    name: string;
    monthLabel: string;
    totalClicks: number;
    prevTotalClicks: number;
    totalLinks: number;
    newLinks: number;
    topLinks: { title: string; slug: string; clicks: number; prevClicks: number }[];
    topCountry: string;
    topDevice: string;
  }
) {
  try {
    const html = await renderMonthlyReport({ ...props, email: to });
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `📈 Your month in links — ${props.monthLabel}`,
      html,
    });
  } catch (err) {
    console.error("[email] sendMonthlyReport failed:", err);
  }
}

/**
 * Fires when a custom domain passes DNS verification and goes live.
 */
export async function sendDomainVerifiedEmail(
  to: string,
  props: {
    name: string;
    domain: string;
    dashboardUrl: string;
    isDefault: boolean;
    role: string;
  }
) {
  try {
    const html = await renderDomainVerified(props);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `🎉 ${props.domain} is now live on PivotUrl!`,
      html,
    });
  } catch (err) {
    console.error("[email] sendDomainVerifiedEmail failed:", err);
  }
}

/**
 * Fires after a user creates their very first link.
 */
export async function sendFirstLinkCreatedEmail(
  to: string,
  props: {
    name: string;
    linkTitle: string;
    linkSlug: string;
    dashboardUrl: string;
  }
) {
  try {
    const html = await renderFirstLinkCreated(props);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `🚀 You created your first link on PivotUrl!`,
      html,
    });
  } catch (err) {
    console.error("[email] sendFirstLinkCreatedEmail failed:", err);
  }
}

/**
 * Fires for users who haven't visited in 30+ days but have links getting clicks.
 */
export async function sendInactiveUserEmail(
  to: string,
  props: {
    name: string;
    lastSeenDays: number;
    totalLinks: number;
    totalClicks: number;
    totalClicksChange: number;
    topLinkTitle: string;
    topLinkClicks: number;
    dashboardUrl: string;
  }
) {
  try {
    const html = await renderInactiveUser({ ...props, email: to });
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `👋 We've missed you! Your links got ${props.totalClicks.toLocaleString()} clicks`,
      html,
    });
  } catch (err) {
    console.error("[email] sendInactiveUserEmail failed:", err);
  }
}

/**
 * Fires when a bio page is published (draft → live).
 */
export async function sendBioPublishedEmail(
  to: string,
  props: {
    name: string;
    pageName: string;
    pageUrl: string;
    dashboardUrl: string;
    hasCustomDomain: boolean;
  }
) {
  try {
    const html = await renderBioPublished(props);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `🎉 Your bio page "${props.pageName}" is live!`,
      html,
    });
  } catch (err) {
    console.error("[email] sendBioPublishedEmail failed:", err);
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
