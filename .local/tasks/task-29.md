---
title: Logging Data Exposure
---
Sensitive-data leakage through production logging.

Vulnerabilities to fix:

1. [Medium] API middleware writes full JSON responses and presigned URLs to logs
  The production server logs entire API responses instead of only request metadata. That causes customer records, OCR results, financial data, and temporary upload links to be copied into application logs, where they are much easier to leak or misuse than the primary database.

The logging middleware in `server/index.ts` replaces `res.json`, captures the full JSON body, and appends `JSON.stringify(capturedJsonResponse)` to every `/api` log line (`server/index.ts:46-60`). Because this happens centrally, it affects normal successful responses across the application, including multi-record business endpoints in `server/routes.ts` such as clients, appointments, service logs, reminders, purchases, employees, expense notes, and quotes. It also captures AI-derived document data from `/api/scan-document` (`server/routes.ts:858-861`). On OCR parse failures, the route separately logs the raw model output with `console.error("Failed to parse OCR response:", content)`, which can contain invoice numbers, addresses, store names, and extracted line items (`server/routes.ts:841-855`).

This also reaches bearer-style storage secrets. `/api/uploads/request-url` returns a presigned `uploadURL` plus object metadata (`server/replit_integrations/object_storage/routes.ts:38-58`), and the middleware logs that response too because the path begins with `/api`. Anyone with access to production logs—developers, support staff, a compromised log sink, or an attacker who later obtains log access—can retrieve sensitive tenant data and sometimes still-valid upload URLs without needing direct database or storage access. The root cause is logging response bodies wholesale at the trust boundary instead of redacting or omitting sensitive fields.
  Files: server/index.ts, server/routes.ts, server/replit_integrations/object_storage/routes.ts