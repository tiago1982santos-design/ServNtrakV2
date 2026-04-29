import type { Express } from "express";
import { storage } from "../storage";

export function registerQuotesRoutes(app: Express): void {
  app.get("/api/quotes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const result = await storage.getQuotes(req.user!.id, clientId);
      res.json(result);
    } catch (error) {
      console.error("Erro ao obter orçamentos:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const quote = await storage.getQuote(parseInt(req.params.id), req.user!.id);
      if (!quote) return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(quote);
    } catch (error) {
      console.error("Erro ao obter orçamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { items = [], ...quoteData } = req.body;
      const userId = req.user!.id;

      if (quoteData.clientId) {
        const client = await storage.getClient(quoteData.clientId);
        if (!client || client.userId !== userId) {
          return res.status(400).json({ error: "Cliente inválido" });
        }
      }

      const quote = await storage.createQuote(
        { ...quoteData, userId },
        items
      );
      res.status(201).json(quote);
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const userId = req.user!.id;

      if (req.body.clientId) {
        const client = await storage.getClient(req.body.clientId);
        if (!client || client.userId !== userId) {
          return res.status(400).json({ error: "Cliente inválido" });
        }
      }

      const updated = await storage.updateQuote(
        parseInt(req.params.id),
        userId,
        req.body
      );
      if (!updated) return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(updated);
    } catch (error) {
      console.error("Erro ao actualizar orçamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/quotes/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { items = [] } = req.body;
      const updatedItems = await storage.updateQuoteItems(
        parseInt(req.params.id),
        req.user!.id,
        items
      );
      res.json(updatedItems);
    } catch (error) {
      console.error("Erro ao actualizar itens do orçamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      await storage.deleteQuote(parseInt(req.params.id), req.user!.id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao apagar orçamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
}
