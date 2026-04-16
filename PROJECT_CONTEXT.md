# Project Context

## Product Summary

Dramatized Fiction is a fiction publishing platform with a polished, premium product goal. It sits somewhere between a story or episode platform, a creator publishing system, and a subscription-based content business.

Core user roles:

- Readers browse stories, read episodes, and view previews and engagement signals.
- Authors create, manage, and publish their work through a writing studio or dashboard.
- CEO/Admin manages platform-wide behavior, moderation, and business settings.

## Current Product Direction

The app is directionally feature-rich, but not yet systematized. The biggest need is to turn the existing frontend into a consistent, production-grade product experience.

Known and intended feature areas:

- Story and episode publishing
- Reader-facing homepage and discovery
- Writer dashboard / studio workflows
- Authentication and permissions
- Database-backed content models
- Stripe-based monetization
- Ad-gated or monetized reading flows
- View/read counts and analytics signals

## Main Problems To Solve

1. UI inconsistency

The frontend currently feels stitched together rather than intentionally designed. The primary goal is to reach a polished SaaS/editorial quality level similar to Base44-inspired products.

2. Architecture inconsistency

Some code was likely generated iteratively, so patterns may be mixed across components, pages, and feature areas.

3. Production stability

The app needs to be consistently deployable on Vercel with stable environment variable handling, Prisma configuration, and clean server/client boundaries.

## Design Goal

The desired visual direction is a premium editorial fiction platform with SaaS-level polish.

Site-wide UI goals:

- Unified color system
- Consistent spacing and layout rhythm
- Strong typography hierarchy
- Reusable buttons, cards, inputs, and shells
- Clean dashboard and reader experiences
- A visual identity that feels intentional rather than AI-generated

## Style Reference

Primary style reference lives in this separate folder:

`C:\Users\benjamin lee\Desktop\Dramatizedfiction chat`

From that reference fragment, the key style signals to preserve are:

- Editorial serif headings
- Clean sans-serif interface text
- Animated liquid gradient branding
- Soft glassmorphism
- Dark, cinematic, premium mood
- Reading-focused typography and content presentation

Reference files inspected there:

- `src/index.css`
- `src/components/home/LiquidWordmark.jsx`
- `src/components/layout/AppLayout.jsx`

## Recommended Work Order

1. Build a unified design system backbone
2. Standardize shared UI primitives and page shells
3. Refactor homepage, reader flows, and dashboard layouts onto that system
4. Stabilize deployment and backend integration issues

## One-Line Summary

This is a Next.js + Prisma fiction publishing platform that works directionally, but needs a coherent design system and frontend refactor to achieve premium, production-ready polish.
