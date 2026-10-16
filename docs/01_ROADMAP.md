# 01_ROADMAP.md — Roadmap проєкту

> Цей файл **не в контексті сесії агента**. Він — для тебе.
> Після завершення кожної задачі — оновлюй статус тут.

---

## Епіки

| ID | Назва | Задач |
|---|---|---|
| E1 | Foundation | 5 |
| E2 | Data & Shared | 4 |
| E3 | AI & Cache | 5 |
| E4 | Auth & Users | 5 |
| E5 | Level Test | 3 |
| E6 | Plan | 4 |
| E7 | Exercise | 8 |
| E8 | Evaluation | 5 |
| E9 | Review & Exports | 6 |
| E10 | Calendar | 3 |
| E11 | Progress & Polish | 9 |
| E12 | Deploy | 3 |
| E13 | Reinforcement Stories | 6 |

**Всього: 66 задач.**

---

## E1 — Foundation

- [x] 01 — Monorepo setup (pnpm@9.15.9 + Turborepo)
- [x] 02 — Docker Compose (Postgres 5433 + Redis 6380 + Strapi 1338)
- [x] 03 — Strapi content-types (Level, Topic, Subtopic, CuratedMaterial)
- [х] 04 — Shared package (enums, types, constants)
- [х] 05 — Seed data (Levels, Topics, Subtopics)

## E2 — Data & Shared

- [х] 06 — Prisma schema + migrations
- [х] 07 — Slot loader
- [х] 08 — $ref resolver
- [x] 09 — Template service

## E3 — AI & Cache

- [х] 10 — AI provider interface
- [x] 11 — OpenRouter provider
- [х] 12 — Gemini + DeepSeek providers + cross-check
- [х] 13 — Redis cache layer
- [х] 14 — Rate limiting middleware

## E4 — Auth & Users

- [х] 15 — NextAuth setup (credentials + JWT)
- [x] 16 — Login + Register pages
- [х] 16.5 — UI Foundation (shadcn/ui + базовые компоненты)
- [х] 16.6 — Landing page
- [х] 17 — User helpers + session callback + /api/user/me

## E5 — Level Test

- [ ] 18 — Adaptive test UI
- [ ] 19 — Test submission API
- [ ] 20 — Gap map

## E6 — Plan

- [ ] 21 — Plan generation (AI)
- [ ] 22 — Dashboard (з планом)
- [ ] 23 — React Flow visualization
- [ ] 24 — Plan editing UI

## E7 — Exercise

- [ ] 25 — Topic selector (next subtopic)
- [ ] 26 — Topic explanation (AI)
- [ ] 26.1 — Error/Quizlet context for generation
- [ ] 27 — Sentence generation (AI + cross-check)
- [ ] 27.1 — Error recycling logic
- [ ] 28 — PDF generation
- [ ] 29 — Exercise UI (input + checkboxes) 
- [ ] 30 — Exercise state persistence

## E8 — Evaluation

- [ ] 31 — Answer evaluation (AI)
- [ ] 32 — Double score (topic + grammar)
- [ ] 33 — Error breakdown
- [ ] 34 — Error review button
- [ ] 35 — Quizlet export

## E9 — Review & Exports

- [ ] 36 — Review exercise (only errors)
- [ ] 37 — Recommendations (podcasts, films, articles)
- [ ] 38 — Curated materials DB
- [ ] 39 — Quizlet file generator
- [ ] 39.1 — Save Quizlet exports to DB ← NEW
- [ ] 39.2 — Quizlet history page in cabinet ← NEW

## E10 — Calendar

- [ ] 40 — .ics generator
- [ ] 41 — Calendar UI
- [ ] 42 — BullMQ reminders

## E11 — Progress & Polish

- [ ] 43 — Progress dashboard
- [ ] 43.1 — Weak areas analysis (top-5 problematic topics)
- [ ] 43.2 — Error categories breakdown
- [ ] 43.3 — Errors history page (/progress/errors)
- [ ] 43.4 — Stuck errors banner + special task CTA
- [ ] 44 — Level transition logic
- [ ] 45 — i18n (uk/en)
- [ ] 46 — E2E tests (Playwright)

## E12 — Deploy

- [ ] 47 — Production Dockerfiles
- [ ] 48 — CI/CD (GitHub Actions)
- [ ] 49 — Deploy + monitoring

## E13 — Reinforcement Stories (після MVP)

- [ ] 50 — Story generation (AI + cross-check)
- [ ] 51 — Story reader UI (clickable words)
- [ ] 52 — Word translation (Google Translate link)
- [ ] 53 — Speech playback (Web Speech API)
- [ ] 54 — Save stories (Prisma + UI)
- [ ] 55 — Story detail page

---

## Пріоритет MVP

Задачі 01–49 — це MVP. E13 — розширення після MVP.
