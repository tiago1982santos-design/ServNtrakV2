---
title: Object Storage Access Control
---
Issues in upload issuance and object download enforcement for stored files.

Vulnerabilities to fix:

1. [High] Unauthenticated object uploads can host same-origin active content
  Anyone on the internet can upload a file to the application's storage and then open it from the application's own domain. Because the server will serve attacker-controlled HTML or JavaScript as first-party content, a malicious link can run code in a logged-in user's browser and steal or modify that user's data.

`registerObjectStorageRoutes()` exposes `POST /api/uploads/request-url` with no authentication or authorization checks (`server/replit_integrations/object_storage/routes.ts:38-58`). That endpoint immediately calls `getObjectEntityUploadURL()` and returns both a signed Google Storage `uploadURL` and a first-party `objectPath`. The upload helper always creates a writable path inside `PRIVATE_OBJECT_DIR/uploads/<month>/<uuid>` and signs a raw `PUT` URL without binding it to an allowed MIME type, file extension, or maximum size (`server/replit_integrations/object_storage/objectStorage.ts:147-168`, `277-313`).

After upload, the attacker can browse to `https://<app-origin>/objects/...` because the public download route streams the object back from storage without forcing download or restricting content types (`server/replit_integrations/object_storage/routes.ts:73-83`). `downloadObject()` copies the stored `Content-Type` directly into the HTTP response and does not add `Content-Disposition: attachment` or any sandboxing headers (`server/replit_integrations/object_storage/objectStorage.ts:110-137`). An attacker can therefore:

1. `POST /api/uploads/request-url` anonymously.
2. `PUT` an HTML payload with `Content-Type: text/html` (or another active format) to the returned signed URL.
3. Send the resulting `/objects/...` link to a victim who is logged into the app.
4. Have attacker JavaScript execute under the application's origin, where it can call same-origin `/api/*` endpoints with the victim's session and exfiltrate business records or perform state-changing actions.

This is more than generic anonymous file hosting: because the payload is served from the same origin as the production app, it becomes a practical account-compromise primitive for any user who follows the link. The same write path also allows arbitrary public file hosting and unbounded storage abuse, but the same-origin script execution is the highest-impact consequence.
  Files: server/replit_integrations/object_storage/routes.ts, server/replit_integrations/object_storage/objectStorage.ts

2. [Medium] Private object downloads bypass authentication and ACL checks
  Files stored in the app's private object bucket can be downloaded without logging in if someone knows the file's URL. This means sensitive photos or documents are effectively public-by-link even though the code and environment treat them as private storage.

The `GET /objects/:objectPath(*)` route has no authentication middleware and does not perform any authorization decision before returning a file (`server/replit_integrations/object_storage/routes.ts:73-83`). `getObjectEntityFile()` simply translates `/objects/...` into a path under `PRIVATE_OBJECT_DIR` and confirms the object exists (`server/replit_integrations/object_storage/objectStorage.ts:171-196`). `downloadObject()` then streams the file regardless of who requested it (`server/replit_integrations/object_storage/objectStorage.ts:110-137`).

The codebase already contains ACL helpers intended to prevent this, but they are not enforced on the read path. `canAccessObjectEntity()` exists in `objectStorage.ts`, and `canAccessObject()` in `objectAcl.ts` correctly denies access when no ACL policy is present (`server/replit_integrations/object_storage/objectStorage.ts:238-253`, `server/replit_integrations/object_storage/objectAcl.ts:135-180`). However, the download route never calls either function. In practice, the only ACL-related logic that runs during download is `getObjectAclPolicy()` to choose `Cache-Control`, not to authorize the request (`server/replit_integrations/object_storage/objectStorage.ts:113-124`).

This turns every stored object path into a bearer token. A leaked path such as `/objects/uploads/Apr2026/<uuid>` is enough for any unauthenticated requester to retrieve the underlying file, including quick photos, service photos, and future documents stored in the same private bucket. Object paths are routinely stored and reused throughout the app, so any disclosure through copied links, browser history, exports, logs, screenshots, or another low-severity bug immediately becomes full disclosure of the underlying private file. The intended private/public distinction in object storage is therefore not enforced in production.
  Files: server/replit_integrations/object_storage/routes.ts, server/replit_integrations/object_storage/objectStorage.ts, server/replit_integrations/object_storage/objectAcl.ts