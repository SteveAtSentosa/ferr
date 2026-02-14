# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/` with entry points such as `index.ts`, `fErr.ts`, and utility helpers like `errorUtils.ts`; keep new modules lowerCamelCase and colocate related tests when practical. Bundled output is generated into `dist/` via tsup—never edit it manually because `pnpm build` will overwrite it. Vitest specs sit in `tests/` (e.g., `ferr.test.ts`), while `vizualize/` holds exploratory scripts outside the build. Core configs (`tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`) stay at the repo root for quick discovery.

## Build, Test, and Development Commands
Use `pnpm build` for clean CJS/ESM bundles, or `pnpm clean` / `pnpm clean:all` when you must reset artifacts and dependencies. `pnpm build:tests` type-checks the suite via `tsconfig.test.json`; run it after structural changes to avoid runtime surprises. Execute `pnpm test` for the standard Vitest run or `pnpm test:verbose` for per-spec detail. `pnpm sanity` runs build → type-check → tests in one pass and is the preferred pre-push check.

## Coding Style & Naming Conventions
TypeScript uses 2-space indentation enforced by ESLint + TypeScript ESLint (`eslint.config.js`). Favor descriptive camelCase exports, with classes like `FErr` defined before helper functions such as `throwFerr` or `throwIfUndefined`. Keep module filenames lowerCamelCase (`ferrUtils.ts`) and align API docs with the behavior captured in `README.md`.

## Testing Guidelines
Tests live under `tests/` and follow the `*.test.ts` pattern. Use Vitest’s standard APIs plus `expectTypeOf` when asserting types. Always run `pnpm test` (or `pnpm sanity`) before opening a PR and update/extend specs when changing observable error semantics.

## Commit & Pull Request Guidelines
Commits should be short, imperative, and often reference release bumps (e.g., `2.1.14`) or the behavior they introduce (`add wrapper-style throw/rethrow ferr APIs`). PR descriptions must summarize behavior changes, mention test coverage (`pnpm sanity`, etc.), and highlight any API or error-contract changes. Keep `dist/` out of diffs unless the PR explicitly targets build artifacts.

## Security & Configuration Tips
This package targets Node runtimes via tsup, so avoid browser-only APIs or dependencies without a strong justification. Watch for config drift: if you change tsconfig or ESLint settings, explain the rationale in the PR. Never store secrets; local experiments should rely on `.env` ignored files if necessary.
