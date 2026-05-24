export const EVENT_TYPES = [
  {
    name: "link.created",
    description: "A new short link was created",
    schemas: {},
    archived: false,
  },
  {
    name: "link.updated",
    description: "A short link was updated",
    schemas: {},
    archived: false,
  },
  {
    name: "link.deleted",
    description: "A short link was deleted",
    schemas: {},
    archived: false,
  },
  {
    name: "link.clicked",
    description: "A short link received a click",
    schemas: {},
    archived: false,
  },
  {
    name: "link.conversion",
    description: "A tracked conversion occurred on a link",
    schemas: {},
    archived: false,
  },
  {
    name: "workspace.member_added",
    description: "A new member was added to a workspace",
    schemas: {},
    archived: false,
  },
  {
    name: "workspace.member_removed",
    description: "A member was removed from a workspace",
    schemas: {},
    archived: false,
  },
  {
    name: "workspace.plan_changed",
    description: "The workspace plan was upgraded or downgraded",
    schemas: {},
    archived: false,
  },
  {
    name: "domain.verified",
    description: "A custom domain was verified",
    schemas: {},
    archived: false,
  },
  {
    name: "domain.deleted",
    description: "A custom domain was deleted",
    schemas: {},
    archived: false,
  },
  {
    name: "qr.created",
    description: "A QR code was created",
    schemas: {},
    archived: false,
  },
  {
    name: "qr.updated",
    description: "A QR code was updated",
    schemas: {},
    archived: false,
  },
  {
    name: "qr.deleted",
    description: "A QR code was deleted",
    schemas: {},
    archived: false,
  },
  {
    name: "link_gallery.published",
    description: "A Link-in-Bio gallery was published",
    schemas: {},
    archived: false,
  },
  {
    name: "link_gallery.updated",
    description: "A Link-in-Bio gallery was updated",
    schemas: {},
    archived: false,
  },
] as const;

export type LinkForgeEventType = (typeof EVENT_TYPES)[number]["name"];
