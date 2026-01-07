import { db } from "./db";
import {
  clients, appointments, serviceLogs,
  type InsertClient, type Client,
  type InsertAppointment, type Appointment,
  type InsertServiceLog, type ServiceLog
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(userId: string): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient & { userId: string }): Promise<Client>;
  updateClient(id: number, userId: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number, userId: string): Promise<void>;

  // Appointments
  getAppointments(userId: string, clientId?: number): Promise<Appointment[]>; // Filter by client optional
  createAppointment(appointment: InsertAppointment & { userId: string }): Promise<Appointment>;
  updateAppointment(id: number, userId: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number, userId: string): Promise<void>;

  // Service Logs
  getServiceLogs(userId: string, clientId?: number): Promise<ServiceLog[]>;
  createServiceLog(log: InsertServiceLog & { userId: string }): Promise<ServiceLog>;
  deleteServiceLog(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(userId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.userId, userId));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient & { userId: string }): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, userId: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
    return updated;
  }

  async deleteClient(id: number, userId: string): Promise<void> {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
  }

  // Appointments
  async getAppointments(userId: string, clientId?: number): Promise<Appointment[]> {
    const conditions = [eq(appointments.userId, userId)];
    if (clientId) conditions.push(eq(appointments.clientId, clientId));
    
    return await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.date));
  }

  async createAppointment(appointment: InsertAppointment & { userId: string }): Promise<Appointment> {
    const [newAppt] = await db.insert(appointments).values(appointment).returning();
    return newAppt;
  }

  async updateAppointment(id: number, userId: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set(updates)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAppointment(id: number, userId: string): Promise<void> {
    await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
  }

  // Service Logs
  async getServiceLogs(userId: string, clientId?: number): Promise<ServiceLog[]> {
    const conditions = [eq(serviceLogs.userId, userId)];
    if (clientId) conditions.push(eq(serviceLogs.clientId, clientId));
    
    return await db
      .select()
      .from(serviceLogs)
      .where(and(...conditions))
      .orderBy(desc(serviceLogs.date));
  }

  async createServiceLog(log: InsertServiceLog & { userId: string }): Promise<ServiceLog> {
    const [newLog] = await db.insert(serviceLogs).values(log).returning();
    return newLog;
  }

  async deleteServiceLog(id: number, userId: string): Promise<void> {
    await db.delete(serviceLogs).where(and(eq(serviceLogs.id, id), eq(serviceLogs.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
