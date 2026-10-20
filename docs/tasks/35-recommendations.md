# 35 — Recommendations (Media Content)

**Епік:** E9 — Review & Exports
**Розмір:** M (2 год)
**Залежності:** 33, 03 (Strapi)
**Статус:** ✅ Done
**Гілка:** `feat/35-recommendations`

> ⚠️ **ЦЯ ЗАДАЧА — РЕКОМЕНДАЦІЯ ЗОВНІШНЬОГО КОНТЕНТУ.**
> Після проходження теми користувач має отримати список фільмів, серіалів, подкастів або статей де активно використовується ця тема.
> Якщо в базі (Strapi) немає матеріалів для цієї теми, AI має згенерувати текстові рекомендації.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
>
> - Наповнення бази (Задача 36)
> - Генерація Quizlet (Задача 37)

---

## 🎯 Мета

Після завершення:

- На сторінці результатів (`/exercise/[id]/result`) з'являється блок "Practice with Media".
- Система робить запит до БД (CuratedMaterial).
- Якщо є матеріали — показує 2-3 картки.
- Якщо база порожня — робить запит до AI (через `lib/ai/`), який генерує 2-3 текстові рекомендації (назви подкастів/фільмів), і показує їх у тому ж вигляді.

---

## ✅ Acceptance Criteria

- [ ] Створити компонент `MediaRecommendations` (`components/exercise/media-recommendations.tsx`).
- [ ] Створити API ендпоінт `GET /api/topics/[id]/materials`.
- [ ] **Логіка API:**
  1. Шукає `CuratedMaterial` за `topicId` у БД.
  2. Якщо знайдено > 0 — повертає їх.
  3. Якщо 0 — викликає AI (новий промпт `lib/ai/prompts/recommend-media.ts`), передаючи `topicName` та `level` (наприклад: "Згенеруй 2 рекомендації фільмів/подкастів для теми Present Perfect рівня B1 у форматі JSON").
- [ ] Компонент рендерить картки (Title, Type, Description, URL).
- [ ] Додати блок на сторінку `/exercise/[id]/result`.
- [ ] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Структура відповіді AI (Zod)

Якщо AI генерує рекомендації, він має повертати суворо відформатований JSON:

```json
[
  {
    "title": "Серіал 'Friends' (сезон 1)",
    "type": "movie",
    "description": "Багато діалогів у Present Perfect.",
    "url": "https://www.netflix.com"
  }
]

Обов'язково валідуй це через Zod, щоб UI не зламався, якщо AI вирішить написати вірш замість JSON.

2. Fallback при помилці AI
Якщо AI впав або БД порожня, і AI не зміг відповісти — краще просто не показувати цей блок на сторінці, ніж показувати помилку.

💬 Commit message
text
feat(exercise): add media recommendations with AI fallback

- create MediaRecommendations component for results page
- fetch CuratedMaterial from DB by topicId
- add AI prompt to generate fallback recommendations if DB is empty
- display cards with external links to movies, podcasts, and articles
```
