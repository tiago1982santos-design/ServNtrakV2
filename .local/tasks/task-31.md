---
title: Push Notification Boundary Issues
---
Trust-boundary problems in push subscription handling and outbound notification delivery.

Vulnerabilities to fix:

1. [Medium] Push subscription endpoints enable blind SSRF to arbitrary HTTPS targets
  A logged-in user can register any URL as a push subscription and then make the server send outbound requests to it. This lets an attacker use the application as a network pivot to probe internal HTTPS services or hit third-party endpoints from the server's trusted network location.

The subscription route only checks that `subscription.endpoint` is a syntactically valid URL (`server/routes.ts:1352-1366`). It does not verify that the endpoint belongs to a legitimate browser push service such as FCM, Mozilla Autopush, or APNs. `saveSubscription()` then stores that endpoint unchanged (`server/pushService.ts:347-369`). When a push is sent, `sendPushToUser()` loads the stored subscription and passes the untrusted endpoint directly into `webpush.sendNotification()` (`server/pushService.ts:432-457`). The `/api/push/test` route gives the attacker an immediate trigger for that outbound request on demand (`server/routes.ts:1402-1414`).

Because account registration is public and logs the new user in right away (`server/replit_integrations/auth/replitAuth.ts:171-203`), this is reachable from the public internet with only a self-created low-privilege account. An attacker can register `https://attacker.example/probe` as a subscription endpoint, call `/api/push/test`, and observe a server-originated POST arrive at that host. The same primitive can be aimed at internal or trusted-only HTTPS endpoints with valid certificates, creating a blind SSRF channel. Although the attacker does not get response bodies, they still gain an outbound network primitive that can be used for reachability testing, side-effectful POSTs, webhook abuse, or interaction with internal services that trust the application's source IP.
  Files: server/replit_integrations/auth/replitAuth.ts, server/routes.ts, server/pushService.ts