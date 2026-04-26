# ServNtrak - Gestão de Serviços e Tarefas

## Overview
ServNtrak is a mobile-first application for managing garden, pool, and jacuzzi maintenance services. It enables tracking clients, scheduling services, and recording completed activities. The application aims to streamline operations for service businesses, offering features like automated visit logging, detailed expense tracking with OCR capabilities, client profitability analysis, and robust scheduling. The long-term vision includes multi-user support, subscription plans, and integrations with payment systems, targeting a broader market for field service management.

## User Preferences
- **Utilizador**: Tiago Santos
- **Empresa**: Peralta Gardens
- **Língua**: Português de Portugal (PT-PT)
- **Estilo de Comunicação**: Simples e direto.
- **Serviços Atuais**: Jardim, Piscina, Jacuzzi e Geral.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with a nature-inspired color palette
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful with Zod schemas for type-safe validation
- **Authentication**: Custom authentication using Passport.js (local email/password, Google OAuth, WebAuthn Passkeys) with PostgreSQL session store. Apple and Facebook OAuth are prepared.
- **Database Access**: Drizzle ORM with PostgreSQL

### Data Layer
- **Database**: PostgreSQL (provisioned via Replit Neon)
- **ORM**: Drizzle ORM
- **Schema Migration**: Drizzle Kit
- **Core Tables**: `users`, `sessions`, `clients`, `appointments`, `serviceLogs`, `employees`, `expense_notes`, `purchases`, `quotes`, `webauthn_credentials`, `push_subscriptions`.

### Key Features and Implementations
- **Geofencing**: Automatic service visit logging based on user proximity to client locations (75m radius).
- **Scheduling Rules**: Configurable business hours and seasonal visit frequencies for various service types.
- **Object Storage**: Secure upload and authorized download of files (e.g., invoices) with content-type allowlisting and served content hardening to prevent XSS and SSRF.
- **Logging Policy**: Metadata-only logging for API requests, avoiding sensitive data in production logs.
- **Home Page Design**: Warm amber/orange "Sunny" aesthetic with a dashboard displaying urgent tasks, quick actions, and upcoming appointments.
- **Employee Management**: CRUD operations for employees, tracking `hourlyPayRate` and `hourlyChargeRate`, integrated into service log labor entries.
- **Client Profitability**: Analytics page calculating revenue vs. labor cost per client, with summaries and visualizations.
- **Push Notifications**: Web Push API integration with service worker, VAPID key management, and robust health monitoring including failure rate alerts and configurable retries.
- **Automatic Appointment Generation**: Tool to generate monthly appointments based on client service contracts and seasonal rules, with deduplication.
- **Expense Notes**: Full CRUD for managing expense notes and items, including PDF generation, audit trails for edited items, and integration with service logs.
- **Passkeys (WebAuthn)**: Support for passwordless authentication using Face ID, Touch ID, or device PIN.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.

### Authentication
- **Google OAuth**: For user authentication.

### Key NPM Packages
- `@anthropic-ai/sdk`: For AI-powered OCR and document scanning.
- `@google-cloud/storage`: For object storage integration.
- `@simplewebauthn/server` / `@simplewebauthn/browser`: For WebAuthn (Passkey) implementation.
- `@uppy/*`: For file uploads.
- `openai`: For AI functionalities.
- `leaflet`: For map functionalities.
- `web-push`: For push notifications.
- `jspdf` / `jspdf-autotable`: For PDF generation.
- `passport-google-oauth20`: For Google OAuth.
- `drizzle-orm` / `drizzle-kit`: ORM and migrations.
- `passport` / `passport-local`: Core authentication.
- `bcryptjs`: Password hashing.
- `express-session` / `connect-pg-simple`: Session management.
- `react-day-picker` / `date-fns`: Calendar and date utilities.
- `@tanstack/react-query`: Data fetching and caching.
- `zod` / `drizzle-zod`: Runtime validation.

### UI Framework Dependencies
- **shadcn/ui**: Component library.
- **Radix UI**: Primitives for accessible components.
- **Lucide React**: Icons.
- **Tailwind CSS**: Styling.