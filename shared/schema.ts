import { pgTable, text, serial, boolean, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Owner of the client record
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  hasGarden: boolean("has_garden").default(false),
  hasPool: boolean("has_pool").default(false),
  hasJacuzzi: boolean("has_jacuzzi").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  clientId: integer("client_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'Garden', 'Pool', 'Jacuzzi', 'General'
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceLogs = pgTable("service_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  clientId: integer("client_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'Garden', 'Pool', 'Jacuzzi', 'General'
  description: text("description").notNull(), // What was done
  photosBefore: text("photos_before").array(), // URLs of before photos
  photosAfter: text("photos_after").array(), // URLs of after photos
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'Garden', 'Pool', 'Jacuzzi', 'General'
  frequency: text("frequency").notNull(), // 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  nextDue: timestamp("next_due").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  serviceLogs: many(serviceLogs),
  reminders: many(reminders),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  client: one(clients, {
    fields: [reminders.clientId],
    references: [clients.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
}));

export const serviceLogsRelations = relations(serviceLogs, ({ one }) => ({
  client: one(clients, {
    fields: [serviceLogs.clientId],
    references: [clients.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, userId: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, userId: true, createdAt: true });
export const insertServiceLogSchema = createInsertSchema(serviceLogs).omit({ id: true, userId: true, createdAt: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, userId: true, createdAt: true });

// === TYPES ===

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type ServiceLog = typeof serviceLogs.$inferSelect;
export type InsertServiceLog = z.infer<typeof insertServiceLogSchema>;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
