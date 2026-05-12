<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture rules (non-negotiable)

## NO LARGE FILES

Soft cap: **~250 lines per file**. If a file is approaching that, stop and split it before adding more.

- React pages/features over the cap → split into smaller components under `features/<feature>/components/` and lift derived state into `features/<feature>/use<Feature>View.ts` (or similar) hooks.
- Routers, services, schemas — same rule. If a domain is large, group files by concern (`<domain>.queries.ts`, `<domain>.mutations.ts`, `<domain>.types.ts`) instead of stuffing everything into one file.
- This is about reviewability and grep-ability, not aesthetics. A 500-line page is a sign that responsibilities are tangled.

## NO LOGIC INSIDE tRPC ROUTERS

`app/server/routers/*.ts` must stay thin. A router procedure may only:

1. Declare input schema (zod)
2. Read `ctx.session.user.id` (auth)
3. Call into a service
4. Return / shape the result

Everything else — DB queries, aggregations, business rules, external API calls, currency conversion, FIFO matching, transformations — lives in **`app/server/services/<domain>.ts`** (create the folder if it doesn't exist).

### Why
- Routers are the API boundary. Mixing it with logic makes both harder to test and reason about.
- Services are plain functions: easy to unit-test, easy to reuse across procedures.

### Pattern

```ts
// app/server/routers/symbols.ts — THIN
export const symbolsRouter = router({
  list: protectedProcedure
    .input(SymbolListInput)
    .query(({ ctx, input }) => symbolsService.list(ctx.session.user.id, input)),
});

// app/server/services/symbols.ts — LOGIC LIVES HERE
export const symbolsService = {
  async list(userId: string, input: SymbolListInput) {
    // db queries, sorting, joining, etc.
  },
};
```

### When to refactor existing routers

If you're already touching a router that violates this rule, extract the logic into a service as part of your change. Don't leave the file dirtier than you found it.
