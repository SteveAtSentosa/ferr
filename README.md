# ferr

`ferr` is a pragmatic error library for TypeScript/Node.

It keeps the native `Error` model (`instanceof Error` still works), while making failures easier to compose, enrich, and log in real systems.

## The spirit

Most production errors are not one event. They are a chain:

- low-level failure (`cause`)
- service-level context (`op`, `code`, `context`)
- user-facing intent (`clientMsg`)
- breadcrumbs (`notes`)

`ferr` is built for that chain.

The goal is not "fancy exceptions." The goal is readable, mergeable, diagnosable errors that survive multiple layers without losing meaning.

## Install

```bash
pnpm add ferr
```

## Quick start

```ts
import { FErr } from 'ferr'

const err = new FErr({
  op: 'loadUser',
  code: 'USER_NOT_FOUND',
  message: 'User lookup failed',
  clientMsg: 'Unable to load account right now',
  context: { userId: 'u_123' },
  cause: new Error('db timeout')
})

console.log(err.toMessageString())
console.log(err.toDetailedString())
```

## Main use cases

1. Normalize unknown caught errors

```ts
try {
  await doWork()
} catch (e) {
  throw FErr.from(e).withOp('doWork').withCode('WORK_FAILED')
}
```

2. Add context without mutation

```ts
const enriched = ferr.withContext({ requestId, tenantId }).withNotes('retry path used')
```

3. Merge failures across boundaries

```ts
const appErr = new FErr({ op: 'createOrder', message: 'Order failed' })
const merged = appErr.mergeAppend(externalErr)
```

4. Throw helpers for guard clauses

```ts
import { rethrowFerr, throwFerr, throwIfUndefined } from 'ferr'

throwFerr({
  with: {
    op: 'authorize',
    message: 'Unauthorized',
    context: { userId }
  }
})

try {
  await doWork()
} catch (e) {
  rethrowFerr(e, {
    with: { op: 'api.handleRequest', code: 'REQUEST_FAILED', message: 'Request failed' }
  })
}

throwIfUndefined(config, 'boot', 'Missing config')
```

## API overview

### `FErr`

- `new FErr(options)`
- `FErr.from(input, overrides?)`
- `FErr.is(value)`
- `mergeAppend(...)`, `mergeUpdate(...)`
- `withMessage/withOp/withCode/withClientMsg/withContext/withCause/withNotes`
- `toMessageString()`, `toDetailedString()`
- `toOptions()`, `toJSON()`

### Throw/rethrow helpers

- `throwFerr`, `throwFerrIf`
- `rethrowFerr`
- `throwErr`, `throwErrIf`
- `rethrowAppend`, `rethrowUpdate`
- `throwIfUndefined`
- custom factories: `createThrowErr`, `createThrowErrIf`, `createThrowIfUndefined`

Note: root package exports are intentionally limited to the `FErr` API and throw/rethrow helpers.
Internal utility helpers are implementation details and are not part of the stable public API contract.

## Why this over plain `Error`?

Plain `Error` is good for simple throw/catch, but it does not define how to:

- carry structured runtime context
- merge error information from multiple layers
- keep short and detailed formats in sync
- coerce arbitrary thrown values consistently

`ferr` gives those patterns first-class APIs.

## Runtime compatibility

- Node-first package
- ESM/CJS build outputs
- Works with standard `try/catch`
- `FErr` remains `instanceof Error`

## Development

```bash
pnpm lint
pnpm sanity
pnpm run viz
```
