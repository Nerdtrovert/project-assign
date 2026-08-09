# AI Agent Workflow Builder

A full-stack application for building and managing AI agent workflows.

## Tech Stack

- **Frontend**: Next.js 13+ with React, TypeScript, and Tailwind CSS
- **Backend**: Nhost (PostgreSQL, Hasura, GraphQL, Authentication)
- **Database**: PostgreSQL
- **ORM/Query Layer**: Hasura (GraphQL Engine)
- **Authentication**: Nhost Auth
- **API Layer**: GraphQL (via Hasura)

## Local Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-assign
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Nhost backend URL and admin secret:
     ```
     Nhost_BACKEND_URL=https://your-subdomain.nhost.run
     Nhost_ADMIN_SECRET=your_admin_secret_here
     NEXT_PUBLIC_SITE_URL=http://localhost:3000
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Visit `http://localhost:3000`

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `Nhost_BACKEND_URL` | Your Nhost backend URL | `https://your-subdomain.nhost.run` |
| `Nhost_ADMIN_SECRET` | Nhost admin secret for backend access | `your_admin_secret_here` |
| `NEXT_PUBLIC_SITE_URL` | Next.js public site URL | `http://localhost:3000` |

## Current Implementation Status

��✅ **Project Foundation**
- Next.js 13+ app router with TypeScript
- Tailwind CSS for styling
- Basic project structure with authentication, workflows, and UI pages
- Nhost client configuration
- GraphQL client (urql) setup
- Environment variable support
- Basic navigation between pages

���🔲 **To Be Implemented**
- PostgreSQL schema design
- Organizations and members functionality
- Workflows and workflow steps data models
- Hasura relationships and permissions
- GraphQL operations (queries, mutations, subscriptions)
- Nhost authentication integration
- Workflow execution engine
- Hasura Actions for custom business logic
- LLM integration for AI agent capabilities
- HTTP request steps in workflows
- Conditional branching logic
- Approval gates
- Webhook triggers
- Usage and quota tracking
- Polished UI components

## Pages Created

1. `/` - Dashboard landing page (placeholder)
2. `/login` - Login page (placeholder)
3. `/workflows` - Workflows list page (placeholder)
4. `/workflows/new` - Workflow builder page (placeholder)

## Development Notes

- This is a barebones foundation meant for incremental development
- No API keys or secrets are hardcoded
- Minimal dependencies added to keep the project lightweight
- TypeScript configured with strict mode recommended for future development
- ESLint set up with Next.js recommended rules
- Ready for incremental feature addition as outlined in the roadmap

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
