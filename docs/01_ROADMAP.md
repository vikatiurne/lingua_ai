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
| E4 | Auth & Users | 3 |
| E5 | Level Test | 3 |
| E6 | Plan | 4 |
| E7 | Exercise | 6 |
| E8 | Evaluation | 5 |
| E9 | Review & Exports | 4 |
| E10 | Calendar | 3 |
| E11 | Progress & Polish | 4 |
| E12 | Deploy | 3 |

**Всього: 49 задач.**

---

## E1 — Foundation

- [ ] 01 — Monorepo setup (pnpm + Turborepo)
- [ ] 02 — Docker Compose (Postgres + Redis + Strapi)
- [ ] 03 — Strapi content-types (Topic, Subtopic, Template, Slot)
- [ ] 04 — Shared package (enums, types, constants)
- [ ] 05 — Seed 24 JSON files into Strapi

## E2 — Data & Shared

- [ ] 06 — Prisma schema + migrations
- [ ] 07 — Slot loader
- [ ] 08 — $ref resolver
- [ ] 09 — Template resolver

## E3 — AI & Cache

- [ ] 10 — AI provider interface
- [ ] 11 — OpenRouter provider
- [ ] 12 — Gemini + DeepSeek providers (fallback)
- [ ] 13 — Redis cache layer
- [ ] 14 — Rate limiting middleware

## E4 — Auth & Users

- [ ] 15 — NextAuth setup
- [ ] 16 — Register + Login pages
- [ ] 17 — User model + level field

## E5 — Level Test

- [ ] 18 — Adaptive test (30 questions)
- [ ] 19 — Test submission API
- [ ] 20 — Gap map (weak topics)

## E6 — Plan

- [ ] 21 — Plan generation (AI)
- [ ] 22 — Plan editing UI
- [ ] 23 — React Flow visualization
- [ ] 24 — Plan persistence

## E7 — Exercise

- [ ] 25 — Topic selector (next subtopic)
- [ ] 26 — Topic explanation (AI)
- [ ] 27 — Sentence generation (AI + cross-check)
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

## E10 — Calendar

- [ ] 40 — .ics generator
- [ ] 41 — Calendar UI
- [ ] 42 — BullMQ reminders

## E11 — Progress & Polish

- [ ] 43 — Progress dashboard
- [ ] 44 — Level transition logic
- [ ] 45 — i18n (uk/en)
- [ ] 46 — E2E tests (Playwright)

## E12 — Deploy

- [ ] 47 — Production Dockerfiles
- [ ] 48 — CI/CD (GitHub Actions)
- [ ] 49 — Deploy + monitoring

---

## Пріоритет MVP

Задачі 01–35 — це MVP. Далі — розширення.