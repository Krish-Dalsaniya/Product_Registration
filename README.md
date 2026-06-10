# Product Registration Platform (Crudex)

This is a comprehensive full-stack web application designed for managing product registrations, internal corporate navigation, users/personnel, support tickets, inventory, and sales. It serves as a modernized internal portal that features dynamic theming, an intelligent AI Assistant for automated form-filling and internal navigation, and granular role-based access control (RBAC).

## 🚀 Key Features

- **Intelligent AI Assistant Panel:** Integrated with the Groq SDK, the chat assistant interprets user intent, guides employees through the app, and can automatically fill out complex forms (e.g., "Book a Sale" or "New Product") based on natural language prompts.
- **Dynamic CSS Theming:** Extensive custom theme support (Retro, Ocean, Cyberpunk, Forest, Obsidian, Dracula, etc.) driven completely by CSS variables, allowing users to customize their workspace.
- **Role-Based Access Control (RBAC):** Advanced permissions system for Admins, Designers, Sales, and Maintenance personnel, supporting both role-level defaults and user-specific overrides.
- **Real-Time Dashboards:** Interactive metric summaries and visualizations built with Recharts to monitor sales, tickets, and overall system health.
- **Support Ticketing System:** Internal helpdesk system for logging issues, assigning maintenance staff, tracking statuses, and leaving comments.
- **Inventory Management:** Categorized stock tracking for PCBs, Electronics, Electrical, and Structural components with low-stock alerts.
- **Internal Messaging (Chat):** Fully featured real-time messaging between employees and teams.
- **Grid & List Views:** Intuitive UI toggles across the application for managing dense table views or aesthetic grid cards.

---

## 🛠️ Tech Stack Architecture

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS 4 (with PostCSS), custom CSS themes, and glassmorphism UI elements
- **Routing:** React Router v7
- **Data Fetching & State:** React Query (`@tanstack/react-query` v5), Redux Toolkit (for specific draft state management)
- **Forms & Validation:** React Hook Form
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Rich Text / Markdown:** React Quill (`react-quill-new`), React Markdown
- **Data Visualization:** Recharts
- **Alerts & Modals:** SweetAlert2, React Hot Toast
- **Testing:** Vitest, React Testing Library

### Backend
- **Runtime Environment:** Node.js
- **Web Framework:** Express.js 5
- **Database:** PostgreSQL (via `pg` driver)
- **Caching & Job Queues:** Redis (via `ioredis` & `redis`), BullMQ (for background job processing)
- **Authentication:** JWT (`jsonwebtoken`), bcryptjs (password hashing)
- **Security & Rate Limiting:** `cors`, `express-rate-limit`, `rate-limit-redis`
- **File Uploads:** Multer, Cloudinary (via `multer-storage-cloudinary`)
- **AI Integration:** Groq SDK (powers the internal AI Assistant)
- **Validation:** `express-validator`
- **Testing:** Jest, Supertest

---

## 📂 Directory Structure

```text
Product_Registration/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route controllers & AI Assistant logic
│   │   ├── routes/           # Express route definitions
│   │   ├── config/           # Database & Redis configuration
│   │   └── server.js         # Entry point for backend
│   ├── .env                  # Backend Environment variables
│   └── package.json          # Backend dependencies
└── frontend/
    ├── src/
    │   ├── api/              # Axios instance and API call wrappers
    │   ├── components/       # Shared UI components (Navbar, Sidebar, Modals)
    │   ├── context/          # React Contexts (e.g. AuthContext)
    │   ├── features/         # Feature-specific modules (Admin, Chat, Tickets)
    │   ├── hooks/            # Custom React hooks (useUsers, useRoles, etc)
    │   ├── store/            # Redux store configurations
    │   ├── index.css         # Global styles and dynamic CSS themes
    │   └── main.jsx          # Entry point for frontend
    ├── .env.example          # Frontend Environment variables example
    └── package.json          # Frontend dependencies
```

---

## ⚙️ Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (running locally or a remote URI)
- **Redis** (running locally or a remote URI like Upstash)
- **Cloudinary Account** (for handling image uploads)
- **Groq API Key** (for the AI Assistant capabilities)

---

## 🛠️ Installation & Setup

### 1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd Product_Registration
\`\`\`

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

Create a `.env` file in the `backend` directory based on the following structure:
\`\`\`env
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
\`\`\`

Start the backend development server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`

Create a `.env` file in the `frontend` directory if necessary (e.g., matching `.env.example`). Normally, Vite handles default proxying or environment variable loading via `VITE_API_BASE_URL`.

Start the frontend development server:
\`\`\`bash
npm run dev
\`\`\`

### 4. Access the App
The frontend will be available at `http://localhost:5173` and the backend server runs on `http://localhost:3000`.

---

## 🤖 How the AI Assistant Works
The platform features an embedded assistant powered by the **Groq SDK**. 
The AI parses system intent against a specialized `SYSTEM_PROMPT` containing specific deep-linking instructions and feature contexts. If the LLM determines the user wants to execute an action (e.g., writing a description for a product catalog item), the backend triggers a native JSON tool call (`autofill_product_form`). The backend responds to the React frontend with a `CustomEvent` payload, automatically navigating the user to the correct route and filling the form states natively!
