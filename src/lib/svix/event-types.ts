export const EVENT_TYPES = [
  {
    name: "link.created",
    description: "A new short link was created",
    schemas: {
      EventType: {
        description: "Fired when a user creates a new short link",
        examples: [{ linkId: "clx...", slug: "my-slug", destination: "https://example.com", domain: "forge.to" }],
      },
      IncomingWebhookPayload: {
        description: "Payload received by the webhook endpoint",
        properties: {
          eventType: { type: "string", description: "The event type, always 'link.created'" },
          workspaceId: { type: "string", format: "uuid", description: "The workspace this event belongs to" },
          data: {
            type: "object",
            properties: {
              linkId: { type: "string", description: "The unique ID of the created link" },
              slug: { type: "string", description: "The short link slug" },
              destination: { type: "string", format: "uri", description: "The destination URL" },
              domain: { type: "string", description: "The domain used for the short link" },
            },
            required: ["linkId", "slug", "destination", "domain"],
          },
          timestamp: { type: "string", format: "date-time", description: "When the event occurred" },
          actorId: { type: "string", description: "The user who performed the action" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link.updated",
    description: "A short link was updated",
    schemas: {
      EventType: {
        description: "Fired when a short link is modified",
        examples: [{ linkId: "clx...", slug: "my-slug", destination: "https://example.com", changes: ["destination", "slug"] }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string", description: "Always 'link.updated'" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              linkId: { type: "string" },
              slug: { type: "string" },
              destination: { type: "string", format: "uri" },
              changes: { type: "array", items: { type: "string" }, description: "List of fields that changed" },
            },
            required: ["linkId", "slug", "destination", "changes"],
          },
          timestamp: { type: "string", format: "date-time" },
          actorId: { type: "string" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link.deleted",
    description: "A short link was deleted",
    schemas: {
      EventType: {
        description: "Fired when a short link is deleted",
        examples: [{ linkId: "clx...", slug: "my-slug", destination: "https://example.com" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              linkId: { type: "string" },
              slug: { type: "string" },
              destination: { type: "string", format: "uri" },
            },
            required: ["linkId", "slug", "destination"],
          },
          timestamp: { type: "string", format: "date-time" },
          actorId: { type: "string" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link.clicked",
    description: "A short link received a click",
    schemas: {
      EventType: {
        description: "Fired when someone clicks a short link",
        examples: [{ linkId: "clx...", slug: "my-slug", isUnique: true, device: "mobile", country: "US", referrer: "https://twitter.com" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              linkId: { type: "string" },
              slug: { type: "string" },
              isUnique: { type: "boolean", description: "True if this is the first click from this visitor" },
              device: { type: "string", enum: ["desktop", "mobile", "tablet", "bot", "unknown"] },
              country: { type: "string", description: "ISO 3166-1 alpha-2 country code" },
              referrer: { type: "string", description: "HTTP referrer URL" },
            },
            required: ["linkId", "slug", "isUnique", "device", "country", "referrer"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link.conversion",
    description: "A tracked conversion occurred on a link",
    schemas: {
      EventType: {
        description: "Fired when a conversion event is recorded for a link",
        examples: [{ linkId: "clx...", slug: "my-slug", conversionId: "conv_...", value: "49.99", currency: "USD" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              linkId: { type: "string" },
              slug: { type: "string" },
              conversionId: { type: "string", description: "Unique conversion identifier" },
              value: { type: "string", description: "Monetary value of the conversion" },
              currency: { type: "string", description: "ISO 4217 currency code" },
              metadata: { type: "object", description: "Optional custom conversion metadata" },
            },
            required: ["linkId", "slug", "conversionId"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "workspace.member_added",
    description: "A new member was added to a workspace",
    schemas: {
      EventType: {
        description: "Fired when a user is added to a workspace team",
        examples: [{ workspaceId: "ws_...", memberId: "user_...", memberEmail: "collaborator@example.com", role: "member" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              memberId: { type: "string", description: "The user ID of the new member" },
              memberEmail: { type: "string", format: "email" },
              role: { type: "string", enum: ["admin", "member", "viewer"] },
              addedBy: { type: "string", description: "The user ID who added the member" },
            },
            required: ["memberId", "role"],
          },
          timestamp: { type: "string", format: "date-time" },
          actorId: { type: "string" },
        },
      },
    },
    archived: false,
  },
  {
    name: "workspace.member_removed",
    description: "A member was removed from a workspace",
    schemas: {
      EventType: {
        description: "Fired when a user is removed from a workspace team",
        examples: [{ workspaceId: "ws_...", memberId: "user_...", memberEmail: "collaborator@example.com", role: "member" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              memberId: { type: "string" },
              memberEmail: { type: "string", format: "email" },
              role: { type: "string", enum: ["admin", "member", "viewer"] },
              removedBy: { type: "string" },
            },
            required: ["memberId"],
          },
          timestamp: { type: "string", format: "date-time" },
          actorId: { type: "string" },
        },
      },
    },
    archived: false,
  },
  {
    name: "workspace.plan_changed",
    description: "The workspace plan was upgraded or downgraded",
    schemas: {
      EventType: {
        description: "Fired when the workspace billing plan changes",
        examples: [{ fromPlan: "free", toPlan: "pro", eventType: "payment.succeeded" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              fromPlan: { type: "string", description: "Previous plan name" },
              toPlan: { type: "string", description: "New plan name" },
              eventType: { type: "string", description: "The billing event that triggered the change" },
            },
            required: ["fromPlan", "toPlan"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
    featureFlags: ["admin"],
  },
  {
    name: "domain.verified",
    description: "A custom domain was verified",
    schemas: {
      EventType: {
        description: "Fired when a custom domain passes DNS verification",
        examples: [{ domainId: "dom_...", domain: "links.example.com", workspaceId: "ws_..." }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              domainId: { type: "string" },
              domain: { type: "string", format: "hostname" },
            },
            required: ["domainId", "domain"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "domain.deleted",
    description: "A custom domain was deleted",
    schemas: {
      EventType: {
        description: "Fired when a custom domain is removed from a workspace",
        examples: [{ domainId: "dom_...", domain: "links.example.com", workspaceId: "ws_..." }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              domainId: { type: "string" },
              domain: { type: "string", format: "hostname" },
            },
            required: ["domainId", "domain"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "qr.created",
    description: "A QR code was created",
    schemas: {
      EventType: {
        description: "Fired when a QR code is generated for a link",
        examples: [{ qrId: "qr_...", linkId: "clx...", slug: "my-slug", format: "png" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              qrId: { type: "string" },
              linkId: { type: "string" },
              slug: { type: "string" },
              format: { type: "string", enum: ["png", "svg", "jpeg"], description: "QR code image format" },
            },
            required: ["qrId", "linkId", "slug", "format"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "qr.updated",
    description: "A QR code was updated",
    schemas: {
      EventType: {
        description: "Fired when a QR code configuration is updated",
        examples: [{ qrId: "qr_...", linkId: "clx...", slug: "my-slug", changes: ["format", "fgColor"] }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              qrId: { type: "string" },
              linkId: { type: "string" },
              slug: { type: "string" },
              changes: { type: "array", items: { type: "string" } },
            },
            required: ["qrId", "linkId", "slug"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "qr.deleted",
    description: "A QR code was deleted",
    schemas: {
      EventType: {
        description: "Fired when a QR code is deleted",
        examples: [{ qrId: "qr_...", linkId: "clx...", slug: "my-slug" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              qrId: { type: "string" },
              linkId: { type: "string" },
              slug: { type: "string" },
            },
            required: ["qrId", "linkId", "slug"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link_gallery.published",
    description: "A Link-in-Bio gallery was published",
    schemas: {
      EventType: {
        description: "Fired when a Link-in-Bio page is published and made public",
        examples: [{ galleryId: "gal_...", slug: "my-bio", title: "My Links" }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              galleryId: { type: "string" },
              slug: { type: "string" },
              title: { type: "string" },
            },
            required: ["galleryId", "slug"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
  {
    name: "link_gallery.updated",
    description: "A Link-in-Bio gallery was updated",
    schemas: {
      EventType: {
        description: "Fired when a Link-in-Bio page is updated",
        examples: [{ galleryId: "gal_...", slug: "my-bio", changes: ["title", "theme"] }],
      },
      IncomingWebhookPayload: {
        properties: {
          eventType: { type: "string" },
          workspaceId: { type: "string", format: "uuid" },
          data: {
            type: "object",
            properties: {
              galleryId: { type: "string" },
              slug: { type: "string" },
              changes: { type: "array", items: { type: "string" } },
            },
            required: ["galleryId", "slug"],
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    archived: false,
  },
] as const;

export type LinkForgeEventType = (typeof EVENT_TYPES)[number]["name"];
