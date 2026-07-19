# mynkGPT

A GPT-style chat application built with Next.js, Bun, Clerk, Prisma, PostgreSQL, TanStack Query, and shadcn/ui — with tool calling, web scraping, and conversation branching.

## Live Demo

**[mynk-gpt.vercel.app](https://mynk-gpt.vercel.app)**

## Overview

This project is a GPT clone with authenticated chat, conversation persistence, AI tool calling, web scraping, and conversation forking — built for local development and Vercel deployment.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Bun** (runtime & package manager)
- **React 19**
- **Clerk** — authentication
- **Prisma 7** + **PostgreSQL** (Neon) — database & ORM
- **AI SDK 7** (`ai`, `@ai-sdk/openai`) — streaming chat & tool calling
- **TanStack Query** — client-side data fetching
- **shadcn/ui** + **Tailwind CSS v4** — UI components
- **Zod** — schema validation for tool inputs

## Features

- ✅ User authentication with Clerk
- ✅ Persistent conversations with dynamic routes (`/c/[id]`)
- ✅ Streaming AI chat responses
- ✅ **Tool calling** — model can invoke server-side tools mid-conversation
- ✅ **Web scraping tool** — ask the AI to summarize any URL
- ✅ **Conversation branching** — fork any conversation from a chosen message
- ✅ Dark/light theme support
- ✅ Vercel-ready deployment

## Local Setup

```bash
git clone https://github.com/mynk717/mynkGPT.git
cd mynkGPT
bun install
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
OPENAI_API_KEY=
```

> `.env.local` is never committed to Git. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser; all others stay server-side only.

## Database Setup

Push the Prisma schema to your PostgreSQL database:

```bash
bun x prisma db push
bun x prisma generate
```

## Run the Project

```bash
bun dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

### Web Scraping
Ask the AI to fetch and summarize any public URL:
> *"Summarize https://example.com"*

The chat will show a `🔧 Calling tool: scrapeWeb` indicator while the page is fetched, then display the AI's summary.

### Conversation Branching
Hover over any message in a conversation and click the **branch icon** (⑂) to fork the conversation from that point. The fork creates a new conversation containing all messages up to that message, which you can continue independently.

## Deployment

This project is deployed on Vercel.

### Push env vars via Vercel CLI

```bash
bunx vercel login
bunx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
bunx vercel env add CLERK_SECRET_KEY production
bunx vercel env add DATABASE_URL production
bunx vercel env add OPENAI_API_KEY production
```

### Deploy to production

```bash
bunx vercel --prod
```

Or simply push to `main` — Vercel auto-deploys on every push.

## Notes

- Use Clerk **development** keys for local testing and **production** keys for deployment.
- Keep `.env.local` out of Git (it is already in `.gitignore`).
- The Prisma client is generated to a custom path (`lib/generated/prisma`) — run `bun x prisma generate` after any schema changes.
- `sslmode=verify-full` is required in the `DATABASE_URL` when connecting to Neon PostgreSQL.
