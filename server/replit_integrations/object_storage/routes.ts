import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "./objectAcl";

/**
 * Allowlist of content types accepted at upload time.
 *
 * Critical: text/html, image/svg+xml, application/xhtml+xml, application/xml,
 * application/javascript, application/wasm and similar formats can run code
 * when served from the application's own origin and are NEVER accepted here.
 *
 * Anything outside this list is rejected at upload-request time.
 */
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set<string>([
  "image/jpeg",
  "image/jpg", // common (incorrect) alias browsers occasionally emit
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const uploadRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE_BYTES, {
      message: `O ficheiro excede o tamanho máximo permitido (${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB)`,
    }),
  contentType: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .transform((v) => v.toLowerCase().split(";")[0].trim())
    .refine((v) => ALLOWED_UPLOAD_CONTENT_TYPES.has(v), {
      message:
        "Tipo de ficheiro não permitido. Aceitamos imagens, PDFs e documentos comuns.",
    }),
});

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // The session-based passport flag is the source of truth for the rest of
  // the app, so we use it here too instead of inventing a new check.
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Register object storage routes for file uploads.
 *
 * Hardened to prevent same-origin XSS and unauthenticated read of private
 * objects (Task #30):
 *   - POST /api/uploads/request-url requires an authenticated session and
 *     enforces a content-type allowlist + size cap.
 *   - GET /objects/:objectPath(*) enforces ACL (or authentication for legacy
 *     objects without ACL) and downloadObject() sanitises the response so a
 *     stray HTML/SVG payload can never execute as first-party content.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Auth: required (session). Body validated with zod. Only safe content
   * types (images, PDFs, common docs) are accepted; text/html, SVG and any
   * scriptable type are rejected here so the resulting first-party
   * /objects/... URL can never serve active content.
   *
   * Body:
   * { "name": "filename.jpg", "size": 12345, "contentType": "image/jpeg" }
   *
   * Response:
   * { "uploadURL": "https://...", "objectPath": "/objects/...", "metadata": {...} }
   */
  app.post("/api/uploads/request-url", requireAuth, async (req, res) => {
    try {
      const parsed = uploadRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid upload request",
        });
      }
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * Access policy:
   *   1. Object must exist (404 otherwise).
   *   2. If the object has an explicit ACL with `visibility: "public"` it is
   *      served to anonymous requests too.
   *   3. Otherwise authentication is required.
   *   4. If an ACL is present, canAccessObject(userId, READ) must allow it
   *      (403 otherwise). If no ACL is present we fall back to "any
   *      authenticated user", matching how the app historically used these
   *      paths internally — this prevents the legacy data set from breaking
   *      while still closing the public-by-link hole.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const aclPolicy = await getObjectAclPolicy(objectFile);

      const isPublic = aclPolicy?.visibility === "public";
      const isAuthed = !!((req as any).isAuthenticated && (req as any).isAuthenticated());
      const userId = isAuthed ? (req as any).user?.id : undefined;

      if (!isPublic) {
        if (!isAuthed) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        if (aclPolicy) {
          const allowed = await objectStorageService.canAccessObjectEntity({
            userId,
            objectFile,
            requestedPermission: ObjectPermission.READ,
          });
          if (!allowed) {
            return res.status(403).json({ error: "Forbidden" });
          }
        }
        // No ACL set: authenticated access is allowed (legacy compatibility).
      }

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
