import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// Status do vídeo do produto (R11 - Vitrine de Produtos):
//   none      → produto sem vídeo (ainda não pode entrar na vitrine)
//   pending   → vídeo enviado, aguardando aprovação do admin
//   approved  → vídeo aprovado, produto entra na rotação da vitrine
//   rejected  → admin rejeitou (videoRejectionReason preenchido)
export const productVideoStatusEnum = pgEnum("product_video_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price"),
    mediaUrl: text("media_url"),
    mediaType: text("media_type"),
    whatsappLink: text("whatsapp_link"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    // R11 — Vitrine de Produtos
    videoUrl: text("video_url"),
    instagramReelUrl: text("instagram_reel_url"),
    videoStatus: productVideoStatusEnum("video_status").notNull().default("none"),
    videoApprovedAt: timestamp("video_approved_at"),
    videoRejectionReason: text("video_rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("products_business_id_idx").on(t.businessId),
    index("products_video_status_idx").on(t.videoStatus),
  ],
);

export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
