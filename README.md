# Product Registration Platform (Crudex)

A comprehensive full-stack internal business platform that has grown from a product-registration tool into a modular ERP-style suite. It now covers HR & Payroll, Recruitment, Learning Management, Project & Agile Management (PMS), a Dynamic Form/Survey Engine, Inventory & Product Lifecycle Management (PLM), Sales, Support Ticketing, Internal Chat, Git/CI traceability, and an AI Assistant for form auto-fill and navigation.

## 🚀 Key Features

### Core Platform
- **Intelligent AI Assistant Panel:** Integrated with the Groq SDK, the chat assistant interprets user intent, guides employees through the app, and can automatically fill out complex forms (e.g., "Book a Sale" or "New Product") based on natural language prompts, via a native `autofill_product_form` tool call routed to the frontend as a `CustomEvent`.
- **Dynamic CSS Theming:** Extensive custom theme support (Retro, Ocean, Cyberpunk, Forest, Obsidian, Dracula, etc.) driven entirely by CSS variables.
- **Role-Based Access Control (RBAC):** Granular, subsection-level permissions (`module.subsection.action`, e.g. `products.bom.edit`) for Admin, Designer, Sales, Maintenance, HR, Accountant roles, with both role-level defaults and per-user overrides (`user_permissions`).
- **Real-Time Dashboards:** Interactive metric summaries and visualizations built with Recharts.
- **Audit Logging:** System-wide `audit_logs` plus module-specific activity logs (e.g. `pms_task_activity_logs`, `hr_candidate_activity_log`, `form_audit_logs`).

### HR Suite
- **Employee Lifecycle:** Employees, Trainees, and Interns as distinct entities with conversion workflows (Intern → Trainee → Employee) governed by an approval-based `hr_conversion_requests` table.
- **Attendance:** QR + selfie liveness verification, face-embedding match scoring, geolocation, punch in/out device & IP tracking, and derived metrics (late coming, early going, break hours, extra hours).
- **Onboarding / Offboarding:** Checklist-driven workflows (documents, assets, training, RCD, policy) and structured offboarding (clearance, asset recovery, offboarding method).
- **Payroll & Compensation:** Salary structures and monthly payrolls with an extended allowance/deduction model (dearness allowance, performance/on-project/non-compete incentives, ESI, internal EMI, advance deductions) plus leave/attendance-derived payroll fields (PL utilization, working days, deductible leave).
- **Claims & Advances:** Employee expense claims and salary advances with approval workflow and amortized repayment tracking (`months_paid`).
- **Org Structure:** Hierarchical designations (with parent/child, job description, KPI/KRA, eligibility, RCD docs) and an independently configurable org chart (`org_chart_parent_id`) decoupled from the reporting-manager hierarchy.
- **Recruitment (ATS):** Candidate pipeline with Kanban board (drag-order via `kanban_order`), resume parsing via Groq (auto-extracts name, contact info, experience, education), comments & activity timeline, multi-role applications (`applied_at` / `shortlisted_for`), and configurable **Open Positions** wired to Candidate Evaluation Forms (skills, knowledge, traits, self-image, motive).
- **LMS (Learning Management):** Training modules with assignments to employees/trainees/interns, quizzes, pass/fail assessments, and retest request/approval flow.
- **Leave Management:** Leave balances, half-day requests, and attachment support.

### Candidate Evaluation & Dynamic Forms Engine
- Two parallel form systems:
  1. **Legacy CEF module** (`candidate_evaluation_forms`) — supports file-upload forms or a lightweight in-house dynamic form builder, publish/share with public links, and a full responses dashboard (Summary / Table / Individual views with per-question breakdowns).
  2. **Enterprise Forms Engine** (`forms`, `form_sections`, `form_questions`, `question_options`, `question_rows`, `question_logic`, `question_media`, `question_validations`, `form_responses`, `response_answers`, etc.) — a general-purpose survey/assessment platform supporting conditional logic, question banks, scoring, and versioning.
- **Form Modes:** `assessment` (scored, pass/fail), `survey` (data collection), and `candidate_evaluation` (enterprise interview builder with typed sections — rating/skill matrix, MCQ, knowledge, text, number, programming with Monaco editor, rich text — and drag/resize grid layout per section & question).

### Project Management (PMS)
- **Projects, Epics, Sprints, Tasks:** Full agile hierarchy with subtasks, story points, priorities, task types (Task/Bug/Story/Epic), tags, dependencies, watchers, comments, attachments, and time logs.
- **Portfolio & Backlog Grooming:** Cross-project views for planning unassigned backlog items into sprints.
- **Burndown & Velocity:** Activity-log driven burndown charts and velocity tracking across completed sprints.
- **Work Closures:** Daily/periodic time closures (`pms_closures`, `pms_closure_items`) linkable to specific tasks.
- **Git/CI Traceability:** Projects and Finished Goods can be linked to a Git repository (owner/name/branch/commit/tag/release/workflow run/build number), enabling firmware and codebase versions to be mapped end-to-end from commit → build → shipped device.
- **Embedded Git Dashboard:** In-app Git client view (staged/unstaged changes, commit, ERP version tagging & release, commit history) built directly into the PMS module.

### Inventory & Product Lifecycle (PLM)
- **Categorized Component Masters:** PCB, Electronics, Electrical, and Structural components, each with master/tech-spec/category-spec/files/images sub-tables (e.g. `electrical_part_master`, `electronics_category_spec`).
- **Specialized Component Types:** Battery, Flow Meter, SMPS, Printer, Speaker, Amplifier, Temperature/Quality/Pressure Sensors, EMI-EMC Filter, DC Meter — each with dedicated spec tables, datasheets, warranty docs, and image galleries.
- **PCB & Firmware Lifecycle:** PCB master → Processor master → Firmware branches → Firmware versions → Firmware releases, with Git commit/tag linkage per firmware version and PCB↔Product version mapping.
- **Bill of Materials (BOM):** Products can reference PCB/Electrical/Electronics/Structural components with quantities.
- **Finished Goods & Traceability:** Serialized finished goods linking hardware components, software features, and (for IoT devices) the exact firmware binary, repository, commit, and release used to build the unit.
- **Low-Stock Alerts & Grid/List Views** across all inventory screens.

### Sales & Support
- **Book-a-Sale:** Ties a finished good (serialized unit) to a customer with quantity and sale date.
- **Customers & Companies:** Full CRM-lite records with per-user ownership (`created_by`) for non-admin dashboards.
- **Support Ticketing:** Internal helpdesk with assignment, status tracking, and comment threads.
- **Internal Messaging:** Real-time 1:1 and group chat with file attachments.

## 🛠️ Tech Stack Architecture

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS 4 (PostCSS), custom CSS-variable-driven themes, glassmorphism UI
- **Routing:** React Router v7
- **Data Fetching & State:** React Query (`@tanstack/react-query` v5), Redux Toolkit (draft state)
- **Forms & Validation:** React Hook Form
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Rich Text / Markdown:** React Quill (`react-quill-new`), React Markdown
- **Data Visualization:** Recharts
- **Alerts & Modals:** SweetAlert2, React Hot Toast
- **Testing:** Vitest, React Testing Library

### Backend
- **Runtime:** Node.js, Express.js 5
- **Database:** PostgreSQL (via `pg`), with additive/idempotent migration scripts (`ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT EXISTS`)
- **Caching & Job Queues:** Redis (`ioredis` / `redis`), BullMQ
- **Authentication:** JWT (`jsonwebtoken`), bcryptjs, optional 2FA (`speakeasy`)
- **Security & Rate Limiting:** `cors`, `express-rate-limit`, `rate-limit-redis`
- **File Uploads:** Multer, Cloudinary (`multer-storage-cloudinary`)
- **AI Integration:** Groq SDK — powers the AI Assistant and resume/candidate-document parsing
- **Document Processing:** `pdf-parse`, `pdfkit` / `pdfkit-table`, `tesseract.js` (OCR), `adm-zip` / `node-unrar-js` (archive extraction), `qrcode`
- **Validation:** `express-validator`
- **Testing:** Jest, Supertest

---

## 📂 Directory Structure

```text
Product_Registration/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                  # Auth, roles & permissions
│   │   │   ├── admin/                 # Admin panel & dashboard
│   │   │   ├── business/
│   │   │   │   ├── hr/                # Employees, trainees, interns, payroll, LMS, onboarding, candidates
│   │   │   │   └── pms/               # Projects, tasks, sprints, epics, closures
│   │   │   ├── hr/                    # LMS routes, leave routes
│   │   │   ├── inventory/             # Products, categories, PCB/electronics/electrical/structural, finished goods
│   │   │   ├── sales/                 # Sales, customers, companies, book-a-sale
│   │   │   ├── operations/            # Designer, maintenance, audit
│   │   │   ├── communication/         # Support tickets, chat, chatbot (AI Assistant)
│   │   │   └── integration/           # Git engine integration routes
│   │   ├── config/                    # Database & Redis configuration
│   │   ├── middleware/                # requestLogger, errorHandler
│   │   └── server.js                  # Entry point for backend
│   ├── database/
│   │   ├── migration_refactored.sql   # De-duplicated, additive master migration
│   │   ├── migrations/                # Point-in-time migration scripts
│   │   ├── schema/                    # Standalone schema files (PCB, finished goods, BOM)
│   │   └── seeds/                     # Seed data & scripts
│   ├── scripts/
│   │   ├── diagnostics/               # Schema/view/policy inspection scripts
│   │   ├── maintenance/               # One-off schema fixes & view rebuilds
│   │   └── migrations/                # Additional targeted migrations
│   ├── .env                           # Backend environment variables
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/                       # Axios instance and API wrappers
    │   ├── components/                # Shared UI components (Navbar, Sidebar, Modals)
    │   ├── context/                   # React Contexts (e.g. AuthContext)
    │   ├── modules/
    │   │   ├── git/                   # In-app Git dashboard
    │   │   └── ...                    # Feature modules mirroring backend modules
    │   ├── features/                  # Feature-specific modules (Admin, Chat, Tickets, HR, PMS)
    │   ├── hooks/                     # Custom hooks (useUsers, useRoles, etc.)
    │   ├── store/                     # Redux store configuration
    │   ├── index.css                  # Global styles and dynamic CSS themes
    │   └── main.jsx                   # Entry point for frontend
    ├── .env.example
    └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **PostgreSQL** (local or remote, e.g. a droplet/managed instance)
- **Redis** (local or a hosted option such as Upstash)
- **Cloudinary Account** (image/document uploads)
- **Groq API Key** (AI Assistant + resume parsing)

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd Product_Registration
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/product_registration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis
REDIS_URL=redis://localhost:6379

# Groq AI Assistant
GROQ_API_KEY=your_groq_api_key_here
```

Apply the database schema (idempotent — safe to re-run):
```bash
node database/apply_migration.js   # or: psql "$DATABASE_URL" -f database/migration_refactored.sql
```

Start the backend dev server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` matching `.env.example` (Vite reads `VITE_API_BASE_URL`), then:
```bash
npm run dev
```

### 4. Access the App
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Health check: `GET /health`

---

## 🗄️ Database & Schema Management

The schema has grown additively over time via idempotent `ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT EXISTS` statements layered on top of the original `CREATE TABLE IF NOT EXISTS` definitions. Key tooling:

- **`database/migration_refactored.sql`** — the source of truth: duplicate `CREATE TABLE` blocks have been removed and each table's additive upgrades are colocated with its original definition.
- **`backend/schema_diff.js`** — compares the expected schema (parsed from `migration_refactored.sql`) against a live database and produces `schema_diff_report.md`, flagging missing/extra tables and columns. Useful before/after deploying to a new environment.
- **`backend/refactor_migrations.js`** — regenerates `migration_refactored.sql` from the historical `migration.sql` by de-duplicating `CREATE TABLE` blocks and synthesizing additive `ALTER TABLE` statements (including constraints) for any new columns found in later versions of a table definition.
- **`backend/scripts/diagnostics/`** — ad-hoc scripts for inspecting live tables, views, functions, and RLS policies directly against the database.

> ⚠️ Note: the live database may still contain columns not yet reflected in `migration_refactored.sql` (see `schema_diff_report.md` for the current diff — mostly newer HR, PMS, and Forms Engine columns added directly in production). Treat the diff report as the current backlog for migration-file cleanup rather than as errors.

---

## 🤖 How the AI Assistant Works
The platform features an embedded assistant powered by the **Groq SDK**. It parses user intent against a specialized `SYSTEM_PROMPT` containing deep-linking instructions and feature contexts. When the LLM determines the user wants to perform an action (e.g., filling out a "Book a Sale" or "New Product" form), the backend triggers a native JSON tool call (`autofill_product_form`). The response is relayed to the React frontend as a `CustomEvent`, which automatically navigates the user to the correct route and populates the form state.

The same Groq integration is reused in the HR module to parse uploaded candidate resumes/documents into structured JSON (name, contact details, experience, education, etc.) for the recruitment pipeline.

---

## 🔐 Roles & Permissions Model

Permissions are stored as `module.subsection.action` keys (e.g. `inventory.tech_spec.edit`, `products.bom.view`) in a `permissions` table, assigned to roles via `role_permissions`, with optional per-user overrides in `user_permissions` (enabled via `users.has_custom_permissions`). Legacy `tech_view`/`comm_view`/`export`/`publish`/`assign` actions have been consolidated/removed in favor of the current `view` / `create` / `edit` / `delete` action set, split across `general`, `tech_spec`, `bom`, and `files` subsections per module.

---

## 📌 Known Environment Notes

- CORS is currently configured with an explicit allow-list plus a hardcoded Netlify fallback (`productsregistration.netlify.app`); `localhost` and the internal droplet IP are allowed in non-production.
- File uploads are served from `/uploads` with content-type overrides so PDFs/images render inline rather than force-downloading.
- The in-app Git dashboard expects a companion Git integration engine to be reachable via `/api/integrations/git`; if that service is offline, related dashboard panels will show as unavailable rather than erroring the whole app.
