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

- [х] 18 — Adaptive test UI
- [x] 19 — Test submission API
- [x] 20 — Gap map
- [x] 20.1 — Split progress tables (chore)
- [x] 20.2 — Fix level filtering in gap map and TestResult
- [x] 20.3 — Dashboard show all gap topics


## E6 — Plan

- [х] 21 — Plan generation (AI)
- [х] 22 — Dashboard (з планом)
- [х] 23 — Plan visualization (interactive timeline)
- [ ] 24 — Plan editing UI
- [х] 24.5 — Topic Library UI (Explore mode)   

## E7 — Exercise
- [х] 25 — Exercise Setup (вибір режиму: PDF або в додатку + вибір кількості речень)  ← ТЕКУЩАЯ
- [x] 26 — Topic explanation (AI) + Rule Accordion
- [x] 27 — Sentence generation (AI + Error recycling)
- [ ] 28 — PDF generation (для режиму друку)
- [ ] 29 — Exercise UI (Інпути для введення відповідей у додатку)
- [ ] 30 — Exercise state persistence

## E8 — Evaluation
- [ ] 31 — Answer evaluation (AI + обробка `...` для пропущених слів)
- [ ] 32 — Double score (topic + grammar)
- [ ] 33 — Error breakdown
...

## E9 — Review & Exports
- [ ] 36 — Review exercise
- [ ] 37 — Recommendations
- [ ] 38 — Curated materials DB
- [ ] 39 — Quizlet file generator (відредагований список користувачем)
- [ ] 39.5 — Flashcards (Quizlet-style UI)  ← НОВАЯ ЗАДАЧА
- [ ] 39.6 — Spelling exercise (вивчення написання слів)  ← НОВАЯ ЗАДАЧА

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
