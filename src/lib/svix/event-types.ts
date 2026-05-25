function schema(example: Record<string, unknown>, properties: Record<string, unknown>, required?: string[]) {
  return {
    "1": {
      type: "object",
      properties: {
        eventType: { type: "string" },
        workspaceId: { type: "string", format: "uuid" },
        data: {
          type: "object",
          properties,
          required: required ?? Object.keys(properties),
        },
        timestamp: { type: "string", format: "date-time" },
        actorId: { type: "string" },
      },
      examples: [example],
    },
  };
}

export const EVENT_TYPES = [
  {
    name: "link.created",
    description: "A new short link was created",
    schemas: schema(
      { linkId: "clx...", slug: "my-slug", destination: "https://example.com", domain: "forge.to" },
      {
        linkId: { type: "string", description: "The unique ID of the created link" },
        slug: { type: "string", description: "The short link slug" },
        destination: { type: "string", format: "uri", description: "The destination URL" },
        domain: { type: "string", description: "The domain used for the short link" },
      },
    ),
    archived: false,
  },
  {
    name: "link.updated",
    description: "A short link was updated",
    schemas: schema(
      { linkId: "clx...", slug: "my-slug", destination: "https://example.com", changes: ["destination"] },
      {
        linkId: { type: "string" },
        slug: { type: "string" },
        destination: { type: "string", format: "uri" },
        changes: { type: "array", items: { type: "string" }, description: "List of fields that changed" },
      },
    ),
    archived: false,
  },
  {
    name: "link.deleted",
    description: "A short link was deleted",
    schemas: schema(
      { linkId: "clx...", slug: "my-slug", destination: "https://example.com" },
      {
        linkId: { type: "string" },
        slug: { type: "string" },
        destination: { type: "string", format: "uri" },
      },
    ),
    archived: false,
  },
  {
    name: "link.clicked",
    description: "A short link received a click",
    schemas: schema(
      { linkId: "clx...", slug: "my-slug", isUnique: true, device: "mobile", country: "US", referrer: "https://twitter.com" },
      {
        linkId: { type: "string" },
        slug: { type: "string" },
        isUnique: { type: "boolean", description: "True if this is the first click from this visitor" },
        device: { type: "string", enum: ["desktop", "mobile", "tablet", "bot", "unknown"] },
        country: { type: "string", description: "ISO 3166-1 alpha-2 country code" },
        referrer: { type: "string", description: "HTTP referrer URL" },
      },
    ),
    archived: false,
  },
  {
    name: "link.conversion",
    description: "A tracked conversion occurred on a link",
    schemas: schema(
      { linkId: "clx...", slug: "my-slug", conversionId: "conv_...", value: "49.99", currency: "USD" },
      {
        linkId: { type: "string" },
        slug: { type: "string" },
        conversionId: { type: "string", description: "Unique conversion identifier" },
        value: { type: "string", description: "Monetary value of the conversion" },
        currency: { type: "string", description: "ISO 4217 currency code" },
        metadata: { type: "object", description: "Optional custom conversion metadata" },
      },
      ["linkId", "slug", "conversionId"],
    ),
    archived: false,
  },
  {
    name: "workspace.member_added",
    description: "A new member was added to a workspace",
    schemas: schema(
      { memberId: "user_...", memberEmail: "collaborator@example.com", role: "member", addedBy: "admin_..." },
      {
        memberId: { type: "string", description: "The user ID of the new member" },
        memberEmail: { type: "string", format: "email" },
        role: { type: "string", enum: ["admin", "member", "viewer"] },
        addedBy: { type: "string", description: "The user ID who added the member" },
      },
      ["memberId", "role"],
    ),
    archived: false,
  },
  {
    name: "workspace.member_removed",
    description: "A member was removed from a workspace",
    schemas: schema(
      { memberId: "user_...", memberEmail: "collaborator@example.com", role: "member", removedBy: "admin_..." },
      {
        memberId: { type: "string" },
        memberEmail: { type: "string", format: "email" },
        role: { type: "string", enum: ["admin", "member", "viewer"] },
        removedBy: { type: "string", description: "The user ID who removed the member" },
      },
      ["memberId"],
    ),
    archived: false,
  },
  {
    name: "workspace.plan_changed",
    description: "The workspace plan was upgraded or downgraded",
    schemas: schema(
      { fromPlan: "free", toPlan: "pro", eventType: "payment.succeeded" },
      {
        fromPlan: { type: "string", description: "Previous plan name" },
        toPlan: { type: "string", description: "New plan name" },
        eventType: { type: "string", description: "The billing event that triggered the change" },
      },
      ["fromPlan", "toPlan"],
    ),
    archived: false,
    featureFlags: ["admin"],
  },
  {
    name: "domain.verified",
    description: "A custom domain was verified",
    schemas: schema(
      { domainId: "dom_...", domain: "links.example.com" },
      {
        domainId: { type: "string" },
        domain: { type: "string", format: "hostname" },
      },
    ),
    archived: false,
  },
  {
    name: "domain.deleted",
    description: "A custom domain was deleted",
    schemas: schema(
      { domainId: "dom_...", domain: "links.example.com" },
      {
        domainId: { type: "string" },
        domain: { type: "string", format: "hostname" },
      },
    ),
    archived: false,
  },
  {
    name: "qr.created",
    description: "A QR code was created",
    schemas: schema(
      { qrId: "qr_...", linkId: "clx...", slug: "my-slug", format: "png" },
      {
        qrId: { type: "string" },
        linkId: { type: "string" },
        slug: { type: "string" },
        format: { type: "string", enum: ["png", "svg", "jpeg"], description: "QR code image format" },
      },
    ),
    archived: false,
  },
  {
    name: "qr.updated",
    description: "A QR code was updated",
    schemas: schema(
      { qrId: "qr_...", linkId: "clx...", slug: "my-slug", changes: ["format", "fgColor"] },
      {
        qrId: { type: "string" },
        linkId: { type: "string" },
        slug: { type: "string" },
        changes: { type: "array", items: { type: "string" } },
      },
    ),
    archived: false,
  },
  {
    name: "qr.deleted",
    description: "A QR code was deleted",
    schemas: schema(
      { qrId: "qr_...", linkId: "clx...", slug: "my-slug" },
      {
        qrId: { type: "string" },
        linkId: { type: "string" },
        slug: { type: "string" },
      },
    ),
    archived: false,
  },
  {
    name: "link_gallery.published",
    description: "A Link-in-Bio gallery was published",
    schemas: schema(
      { galleryId: "gal_...", slug: "my-bio", title: "My Links" },
      {
        galleryId: { type: "string" },
        slug: { type: "string" },
        title: { type: "string" },
      },
    ),
    archived: false,
  },
  {
    name: "link_gallery.updated",
    description: "A Link-in-Bio gallery was updated",
    schemas: schema(
      { galleryId: "gal_...", slug: "my-bio", changes: ["title", "theme"] },
      {
        galleryId: { type: "string" },
        slug: { type: "string" },
        changes: { type: "array", items: { type: "string" } },
      },
    ),
    archived: false,
  },
] as const;

export type LinkForgeEventType = (typeof EVENT_TYPES)[number]["name"];
