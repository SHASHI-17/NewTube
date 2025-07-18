import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    name: text("name").notNull(),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("clerk_id_idx").on(t.clerkId)]
);

export const userRelations = relations(users, ({ many }) => ({
  videos: many(videos),
}));

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("descriptioon"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("name_idx").on(t.name)]
);

export const categoryRelations = relations(users, ({ many }) => ({
  videos: many(videos),
}));

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),

  // muxAssetId: text("mux_asset_id").unique(),
  // muxStatus: text("mux_status"),
  // muxUploadId: text("mux_upload_id").unique(),
  // muxPlaybackId: text("mux_playback_id").unique(),
  // muxTrackId: text("mux_track_id").unique(),
  // muxTrackStatus: text("mux_track_status"),
  // thumbnailUrl: text("thumbnail_url"),
  // thumbnailKey: text("thumbnail_key"),
  // previewUrl: text("preview_url"),
  // previewKey: text("preview_key"),
  // duration: integer("duration").default(0).notNull(),
  // visibility: videoVisibility("visibility").default("private").notNull(),

  userId: uuid("user_id")
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
});

export const videoRelations = relations(videos, ({ one }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
}));
