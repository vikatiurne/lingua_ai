# 23 — Plan Visualization (React Flow)

**Епік:** E6 — Plan
**Розмір:** M (2–3 год)
**Залежності:** 21, 22
**Статус:** ⬜ Todo
**Гілка:** `feat/23-plan-visualization`

> ⚠️ **ЦЯ ЗАДАЧА — ВІЗУАЛІЗАЦІЯ ПЛАНУ.**
> Створює сторінку `/plan`, де навчальний план показано у вигляді
> інтерактивного графа (вузли — теми та підтеми).
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Редагування плану (24)
> - Генерація плану (21)

---

## 🎯 Мета

Після завершення:
- Сторінка `/plan` доступна з sidebar (більше не 404).
- Використовує `reactflow` для рендерингу графа.
- Вузли тем (`TopicNode`) з'єднані з вузлами підтем (`SubtopicNode`).
- Пріоритетні теми (`high`) виділені кольором/іконкою.
- Автоматичне розташування вузлів (використовуємо `@dagrejs/dagre`, щоб не писати координати вручну).

---

## ✅ Acceptance Criteria

- [ ] Встановлено `reactflow` та `@dagrejs/dagre`.
- [ ] Є сторінка `app/(dashboard)/plan/page.tsx` (Server Component).
- [ ] Сторінка отримує активний план через `requireUser()` + `prisma.plan.findFirst`.
- [ ] Якщо плану немає — показує `<NoPlanCTA />` (з задачі 22).
- [ ] Є компонент `components/plan/plan-flow.tsx` (Client Component, `"use client"`).
- [ ] Кастомні вузли: `components/plan/topic-node.tsx` та `components/plan/subtopic-node.tsx`.
- [ ] Вузли зв'язані ребрами (Topic → Subtopic).
- [ ] Використовується `@dagrejs/dagre` для розрахунку координат (layout: `TB`).
- [ ] Кольори: `high` пріоритет — акцентний, `normal` — звичайний.
- [ ] Граф адаптивний (`fitView`, висота контейнера).
- [ ] `pnpm typecheck` і `pnpm build` проходять.

---

## 🚫 Що НЕ входить

- ❌ Перетягування вузлів із збереженням (drag-n-drop) — тільки перегляд (`nodesDraggable={false}`).
- ❌ Видалення/додавання тем (24).
- ❌ Клік на вузол для переходу до вправи (25+).
- ❌ Показ прогресу на вузлах (43).

---

## 📁 Файли

### Створити
- `apps/web/app/(dashboard)/plan/page.tsx`
- `apps/web/components/plan/plan-flow.tsx`
- `apps/web/components/plan/topic-node.tsx`
- `apps/web/components/plan/subtopic-node.tsx`
- `apps/web/lib/plan/layout.ts` (хелпер для Dagre)

### Змінити
- `apps/web/package.json` — додати `reactflow`, `@dagrejs/dagre`, `@types/dagre`.

### Не чіпати
- `apps/web/lib/plan/generate.ts` (тільки імпорт типів)
- `apps/web/app/api/**`
- `apps/web/prisma/**`

---

## 🔧 Контракти (обов'язково)

### Типи даних для вузлів
```ts
// data для кастомних вузлів React Flow
type TopicNodeData = {
  label: string;
  priority: "high" | "normal";
};

type SubtopicNodeData = {
  label: string;
  priority: "high" | "normal";
};
```

### Сигнатура хелпера layout
```ts
export function getLayoutedElements(plan: PlanContent): {
  nodes: Node[];
  edges: Edge[];
};
```

---

## 🧠 Алгоритм (словами)

### 1. `app/(dashboard)/plan/page.tsx`
1. `user = await requireUser()`.
2. `plan = await prisma.plan.findFirst({ where: { userId: user.id, isActive: true } })`.
3. Якщо `!plan` → рендер `<NoPlanCTA />`.
4. Інакше → `<PlanFlow content={plan.content as PlanContent} />`.

### 2. `lib/plan/layout.ts` — `getLayoutedElements(plan)`
1. Створити масиви `nodes` та `edges`.
2. Для кожної теми створити вузол `type: "topic"`, для кожної підтеми — `type: "subtopic"`.
3. Додати ребра від теми до її підтем.
4. Ініціалізувати Dagre з напрямком `TB` (Top to Bottom).
5. Передати Dagre всі вузли (з розмірами, наприклад `width: 200, height: 80`) та ребра.
6. Запустити `dagre.layout(g)`.
7. Оновити `position` кожного вузла координатами з Dagre.
8. Повернути `{ nodes, edges }`.

### 3. `components/plan/plan-flow.tsx`
1. Отримує `content: PlanContent`.
2. Викликає `getLayoutedElements(content)`.
3. Рендерить `<ReactFlow nodes={...} edges={...} nodeTypes={{ topic: TopicNode, subtopic: SubtopicNode }} fitView nodesDraggable={false} />`.

### 4. Кастомні вузли
- **`TopicNode`**: більший шрифт, жирний. Якщо `priority === "high"` — акцентна рамка/фон + іконка. Має `<Handle type="source" position={Position.Bottom} />`.
- **`SubtopicNode`**: менший шрифт, сірий фон. Має `<Handle type="target" position={Position.Top} />`.

---

## ⚠️ Ключові нюанси

- **`"use client"`** — обов'язково у `plan-flow.tsx`, `topic-node.tsx`, `subtopic-node.tsx`.
- **`fitView`** — проп React Flow, щоб граф автоматично вмістився в екран.
- **Висота контейнера** — React Flow вимагає явної висоти. Використати `className="h-[600px] w-full"` або `h-[calc(100vh-200px)]`.
- **`nodesDraggable={false}`** — щоб не було спокуси зберігати позиції (це задача 24).
- **Handles** — обов'язкові для з'єднання. Без них ребра не рендеряться.
- **Dagre** — якщо не хочете тягнути залежність, можна спробувати `elkjs`, але Dagre простіше для дерев.
- **`NoPlanCTA`** — перевикористати з `@/components/dashboard/no-plan-cta` (створений у 22).

---

## 📎 Контекст

- `docs/tasks/21-plan-generation.md` (`PlanContent`)
- `docs/tasks/22-dashboard.md` (`NoPlanCTA`)
- `AGENT_RULES.md` → 7.1 (чисті компоненти)

---

## 💬 Commit message

```
feat(plan): add React Flow visualization for plan

- install reactflow and @dagrejs/dagre
- add /plan page with PlanFlow client component
- add custom TopicNode and SubtopicNode components
- auto-layout using dagre (top-to-bottom)
- highlight high-priority topics with accent styles
- readonly graph (fitView, no drag)
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/23-plan-visualization
# ...
git add .
git commit -m "feat(plan): add React Flow visualization for plan"
git push origin feat/23-plan-visualization
```

---

## 📝 Нотатки

- Чи коректно `dagre` розраховує координати?
- Чи вміщається граф в екран (`fitView`)?
- Чи видно пріоритетні теми (кольори)?
- Чи не ламається `pnpm build` через `reactflow`?