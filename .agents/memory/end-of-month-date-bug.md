---
name: End-of-month date bug
description: PostgreSQL rejects date strings like "2026-06-31" (June only has 30 days). Using hardcoded "31" as month end breaks analytics, dashboard, and budgets queries.
---

## The Rule
Never hardcode "31" as the end day of a month in date range queries. Always compute the actual last day.

**Why:** PostgreSQL strictly validates date strings. "2026-02-31" or "2026-06-31" cause a 500 error.

**How to apply:**
Use this helper in any backend route file that builds date ranges:
```typescript
function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate(); // month is 1-indexed here
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
```
`new Date(year, month, 0)` exploits the JS Date constructor: month is 0-indexed, so passing the 1-indexed month and day 0 gives the last day of the previous month — i.e., the last day of the desired month.

Applied in: `analytics.ts`, `dashboard.ts`, `budgets.ts` (all three had the bug).
