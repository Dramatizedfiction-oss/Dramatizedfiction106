# Dramatized Fiction

A streaming-style fiction platform built with:

- Next.js 14 (App Router)
- Prisma + PostgreSQL
- Stripe Connect
- Role-based access (Reader, Author, CEO)
- Ad-gated episodes
- Subscription system
- CEO Dashboard
- Writer Studio

## Getting Started

1. Install dependencies  
   `npm install`

2. Create `.env` file  
   See `.env.example`

3. Push database schema  
   `npx prisma db push`

4. Run dev server  
   `npm run dev`

## Deployment

Deploy on Vercel.  
Set all environment variables.  
Configure Stripe webhook.  
