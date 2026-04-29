import type { Express } from "express";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import { serviceLogs } from "@shared/schema";

export function registerExpenseNotesRoutes(app: Express): void {
  app.get("/api/expense-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const notes = await storage.getExpenseNotes(req.user!.id, clientId);
      res.json(notes);
    } catch (error) {
      console.error("Erro ao obter notas de despesa:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/expense-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const note = await storage.getExpenseNote(parseInt(req.params.id), req.user!.id);
      if (!note) return res.status(404).json({ error: "Nota não encontrada" });
      res.json(note);
    } catch (error) {
      console.error("Erro ao obter nota de despesa:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/expense-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { items = [], ...noteData } = req.body;
      const userId = req.user!.id;

      const editedWithoutReason = items.filter(
        (i: any) => i.sourceType === "edited" && !i.editReason?.trim()
      );
      if (editedWithoutReason.length > 0) {
        return res.status(400).json({
          error: "Itens editados requerem justificação (editReason).",
          items: editedWithoutReason.map((i: any) => i.description),
        });
      }

      if (noteData.clientId) {
        const client = await storage.getClient(noteData.clientId);
        if (!client || client.userId !== userId) {
          return res.status(400).json({ error: "Cliente inválido" });
        }
      }

      if (noteData.serviceLogId) {
        const [serviceLog] = await db.select().from(serviceLogs).where(
          and(eq(serviceLogs.id, noteData.serviceLogId), eq(serviceLogs.userId, userId))
        );
        if (!serviceLog) {
          return res.status(400).json({ error: "Registo de serviço inválido" });
        }
      }

      const note = await storage.createExpenseNote(
        { ...noteData, userId },
        items
      );
      res.status(201).json(note);
    } catch (error) {
      console.error("Erro ao criar nota de despesa:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.patch("/api/expense-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const userId = req.user!.id;

      if (req.body.clientId) {
        const client = await storage.getClient(req.body.clientId);
        if (!client || client.userId !== userId) {
          return res.status(400).json({ error: "Cliente inválido" });
        }
      }

      if (req.body.serviceLogId) {
        const [serviceLog] = await db.select().from(serviceLogs).where(
          and(eq(serviceLogs.id, req.body.serviceLogId), eq(serviceLogs.userId, userId))
        );
        if (!serviceLog) {
          return res.status(400).json({ error: "Registo de serviço inválido" });
        }
      }

      const updated = await storage.updateExpenseNote(
        parseInt(req.params.id),
        userId,
        req.body
      );
      if (!updated) return res.status(404).json({ error: "Nota não encontrada" });
      res.json(updated);
    } catch (error: any) {
      // Do not log req.body — it contains expense-note edits with store,
      // item and price details that should never appear in application logs.
      console.error("PATCH expense-note error:", {
        message: error?.message,
        stack: error?.stack,
        noteId: req.params.id,
        userId: req.user!.id,
      });
      if (error?.message?.includes("emitida")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/expense-notes/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { items = [] } = req.body;

      const editedWithoutReason = items.filter(
        (i: any) => i.sourceType === "edited" && !i.editReason?.trim()
      );
      if (editedWithoutReason.length > 0) {
        return res.status(400).json({
          error: "Itens editados requerem justificação (editReason).",
          items: editedWithoutReason.map((i: any) => i.description),
        });
      }

      const updatedItems = await storage.updateExpenseNoteItems(
        parseInt(req.params.id),
        req.user!.id,
        items
      );
      res.json(updatedItems);
    } catch (error: any) {
      if (error?.message?.includes("emitida")) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Erro ao actualizar itens:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/expense-notes/:id/edits", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Não autenticado" });
    try {
      const { fieldChanged, reason } = req.body;
      if (!fieldChanged || !reason?.trim()) {
        return res.status(400).json({
          error: "fieldChanged e reason são obrigatórios",
        });
      }

      const expenseNoteId = parseInt(req.params.id);
      const userId = req.user!.id;
      const existingNote = await storage.getExpenseNote(expenseNoteId, userId);
      if (!existingNote) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      await storage.createExpenseNoteEdit(
        expenseNoteId,
        req.user!.id,
        fieldChanged,
        reason
      );
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Erro ao criar edit:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/expense-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      await storage.deleteExpenseNote(parseInt(req.params.id), req.user!.id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao apagar nota de despesa:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/expense-notes/:id/pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const note = await storage.getExpenseNote(parseInt(req.params.id), req.user!.id);
      if (!note) return res.status(404).json({ error: "Nota não encontrada" });
      res.json(note);
    } catch (error) {
      console.error("Erro ao obter nota para PDF:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/expense-notes/from-service-log/:logId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const logId = parseInt(req.params.logId);
      const log = await storage.getServiceLogWithEntries(logId, req.user!.id);
      if (!log) return res.status(404).json({ error: "Registo de serviço não encontrado" });

      const items: any[] = [];

      for (const entry of log.laborEntries) {
        items.push({
          description: `Mão de obra — ${entry.hours}h`,
          type: "labor",
          quantity: entry.hours,
          unitPrice: entry.hourlyRate,
          sourceType: "auto",
          editReason: null,
        });
      }

      for (const entry of log.materialEntries) {
        items.push({
          description: entry.materialName,
          type: "material",
          quantity: entry.quantity,
          unitPrice: entry.unitPrice,
          sourceType: "auto",
          editReason: null,
        });
      }

      if (log.billingType === "extra" && log.totalAmount && items.length === 0) {
        items.push({
          description: log.description ?? "Serviço extra",
          type: "service",
          quantity: 1,
          unitPrice: log.totalAmount,
          sourceType: "auto",
          editReason: null,
        });
      }

      const note = await storage.createExpenseNote(
        {
          userId: req.user!.id,
          clientId: log.clientId,
          serviceLogId: logId,
          status: "draft",
          notes: req.body.notes ?? null,
        },
        items
      );
      res.status(201).json(note);
    } catch (error) {
      console.error("Erro ao criar nota a partir de serviceLog:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
}
