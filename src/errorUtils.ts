import { DEFAULT_FERR_MESSAGE, FErr, type FErrCause, type FErrOptions, type MsgInput } from './fErr'
import { toJson } from './ferrUtils'

/**
 * Shared options for throw helper APIs.
 * Mirrors a focused subset of {@link FErrOptions} but keeps callsites ergonomic.
 *
 * @property op - Operation name (e.g. `'db.food.add'`, `'api.foods.create'`)
 * @property code - Machine-readable error code (e.g. `'RECORD_NOT_FOUND'`, `'VALIDATION_ERROR'`)
 * @property clientMsg - Safe message for end-user display (string or `(context) => string`)
 * @property context - Structured data for debugging (e.g. `{ id, table }`)
 * @property cause - Original error that triggered this one (`Error`, `string`, or `Record`)
 * @property notes - Breadcrumb annotations (`string` or `string[]`); accumulated across rethrows
 */
export interface ThrowOptions {
  op?: string
  code?: string
  clientMsg?: MsgInput
  context?: unknown
  cause?: FErrCause | unknown
  notes?: string | string[]
}

/**
 * Wrapper-style payload for `throwFerr({ with: ... })`.
 * `op` and `message` are required in this shape.
 */
export interface ThrowFerrRequest {
  with: Required<Pick<FErrOptions, 'op' | 'message'>> & Partial<FErrOptions>
  notes?: string | string[]
}

/**
 * Wrapper-style payload for `rethrowFerr(err, { with: ... })`.
 * Defaults to `update` mode.
 *
 * @property with - Fields to merge into the caught error:
 *   - `op` — Operation name (e.g. `'api.foods.list'`)
 *   - `message` — Error message (string or `(context) => string`)
 *   - `code` — Machine-readable code (e.g. `'REQUEST_FAILED'`)
 *   - `clientMsg` — Safe message for end-user display
 *   - `context` — Structured debugging data (e.g. `{ id, table }`)
 *   - `notes` — Breadcrumb annotations
 *   - `cause` — Original error (`Error`, `string`, or `Record`)
 *   - `opTrace` — Operation call chain (auto-accumulated)
 *   - `stackLines` — Override stack trace lines
 * @property notes - Top-level notes (merged with `with.notes`)
 * @property mode - Merge strategy:
 *   - `'update'` (default) — incoming fields win conflicts
 *   - `'append'` — existing fields win; conflicts preserved in notes
 */
export interface RethrowFerrRequest {
  with?: Partial<FErrOptions>
  notes?: string | string[]
  mode?: 'update' | 'append'
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(item => typeof item === 'string')

const toNotes = (notes: unknown): string[] =>
  typeof notes === 'string' ? [notes] :
  isStringArray(notes) ? notes :
  []

const mergeNotes = (a: unknown, b: unknown): string[] => {
  const merged = [...toNotes(a), ...toNotes(b)]
  return [...new Set(merged)]
}

const isThrowFerrRequest = (input: unknown): input is ThrowFerrRequest => {
  if (!input || typeof input !== 'object' || !('with' in input)) return false
  const w = (input as { with?: { op?: unknown, message?: unknown } }).with
  if (typeof w?.op !== 'string') return false
  const msgType = typeof w?.message
  return msgType === 'string' || msgType === 'function'
}

const toFerrOptions = (message: MsgInput, options: ThrowOptions = {}): FErrOptions => ({
  message,
  op: options.op,
  code: options.code,
  clientMsg: options.clientMsg,
  context: options.context,
  cause: options.cause,
  notes: options.notes
})

/**
 * Build a readable operation-scoped message.
 * Useful for non-`FErr` custom throw factories.
 */
export const formatMsg = (op: string, message: MsgInput, context?: unknown): string => {
  const resolved = typeof message === 'function' ? message(context) : message
  const lines = [`${op} failed: ${resolved}`]
  if (context !== undefined) lines.push(`Context: ${toJson(context)}`)
  return lines.join('\n')
}

/**
 * Throw an `FErr` from unknown input.
 *
 * Accepts two calling styles:
 * - **Direct:** `throwFerr(errorOrString, { op, code, ... })`
 * - **Wrapper:** `throwFerr({ with: { op, message, code, clientMsg, context, notes, cause } })`
 *
 * Input is coerced via `FErr.from()` — supports `Error`, `string`, `FErr`,
 * plain objects with ferr-like keys, or anything else (safe defaults).
 *
 * @param input - The error source (Error, string, FErr, ThrowFerrRequest, or unknown)
 * @param overrides - Optional FErrOptions fields to merge over the coerced error
 */
export const throwFerr = (input: unknown, overrides?: Partial<FErrOptions>): never => {
  if (isThrowFerrRequest(input)) {
    const withPatch = input.with
    const notes = mergeNotes(withPatch.notes, input.notes)
    throw FErr.from({
      ...withPatch,
      notes
    })
  }

  throw FErr.from(input, overrides)
}

/**
 * Conditional variant of {@link throwFerr} — only throws when `condition` is `true`.
 *
 * @param condition - Throws when truthy
 * @param input - The error source (Error, string, FErr, ThrowFerrRequest, or unknown)
 * @param overrides - Optional FErrOptions fields to merge over the coerced error
 */
export const throwFerrIf = (condition: boolean, input: unknown, overrides?: Partial<FErrOptions>): void => {
  if (condition) throwFerr(input, overrides)
}

/**
 * Throw an `FErr` from operation + message inputs.
 *
 * Simpler ergonomic API when you know the op and message at the callsite.
 *
 * @param op - Operation name (e.g. `'db.food.add'`)
 * @param message - Error message (string or `(context) => string`)
 * @param options - Additional fields: `{ code, clientMsg, context, cause, notes }`
 *
 * @example
 * throwErr('db.food.add', 'Duplicate name', {
 *   code: 'DUPLICATE',
 *   context: { name: 'Brown Rice' },
 * })
 */
export const throwErr = (
  op: string,
  message: MsgInput,
  options: ThrowOptions = {}
): never => {
  return throwFerr(toFerrOptions(message, { ...options, op }))
}

/**
 * Conditional variant of {@link throwErr} — only throws when `condition` is `true`.
 *
 * @param condition - Throws when truthy
 * @param op - Operation name (e.g. `'db.food.add'`)
 * @param message - Error message (string or `(context) => string`)
 * @param options - Additional fields: `{ code, clientMsg, context, cause, notes }`
 *
 * @example
 * throwErrIf(!exists, 'db.ornishServing.add', 'Food not found', {
 *   code: 'RECORD_NOT_FOUND',
 *   clientMsg: 'Food not found',
 *   context: { id },
 * })
 */
export const throwErrIf = (
  condition: boolean,
  op: string,
  message: MsgInput,
  options: ThrowOptions = {}
): void => {
  if (condition) throwErr(op, message, options)
}

/**
 * Re-throw by append-merging incoming error data into an existing error.
 *
 * **Append semantics:** existing error fields win conflicts.
 * Conflicting incoming fields are preserved in notes.
 *
 * @param existing - The caught error (coerced via `FErr.from()`)
 * @param incoming - New context to merge in (Error, string, FErrOptions, or unknown)
 */
export const rethrowAppend = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeAppend(incoming)
}

/**
 * Re-throw by update-merging incoming error data over an existing error.
 *
 * **Update semantics:** incoming fields win conflicts.
 *
 * @param existing - The caught error (coerced via `FErr.from()`)
 * @param incoming - New context to merge over (Error, string, FErrOptions, or unknown)
 */
export const rethrowUpdate = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeUpdate(incoming)
}

/**
 * Wrapper-style rethrow helper — the primary catch-block API.
 *
 * Coerces the caught error via `FErr.from()`, then merges the `with` fields.
 * Defaults to **update** semantics (incoming fields win).
 *
 * @param caught - The caught error (any type — coerced to FErr)
 * @param options - Rethrow configuration:
 *   - `with` — Fields to merge: `{ op, message, code, clientMsg, context, notes, cause, opTrace }`
 *   - `notes` — Top-level breadcrumb notes (merged with `with.notes`)
 *   - `mode` — `'update'` (default, incoming wins) or `'append'` (existing wins)
 *
 * @example
 * try {
 *   await doWork()
 * } catch (e) {
 *   rethrowFerr(e, {
 *     with: { op: 'api.foods.create', code: 'CREATE_FAILED', message: 'Failed to create food' },
 *     notes: 'caught in handler',
 *   })
 * }
 */
export const rethrowFerr = (caught: unknown, options: RethrowFerrRequest): never => {
  const patch: Partial<FErrOptions> = {
    ...(options.with || {}),
    notes: mergeNotes(options.with?.notes, options.notes)
  }

  if (options.mode === 'append')
    throw FErr.from(caught).mergeAppend(patch)

  throw FErr.from(caught).mergeUpdate(patch)
}

/**
 * Assert that a value is defined; throw `FErr` if `undefined`.
 *
 * Narrows the TypeScript type to exclude `undefined` on success.
 *
 * @param value - The value to check
 * @param op - Operation name (e.g. `'db.food.getById'`)
 * @param message - Error message (string or `(context) => string`)
 * @param options - Additional fields: `{ code, clientMsg, context, cause, notes }`
 *
 * @example
 * const food = maybeFetch()
 * throwIfUndefined(food, 'db.food.getById', 'Food not found', {
 *   code: 'RECORD_NOT_FOUND', context: { id }
 * })
 * // food is now typed as Food (not Food | undefined)
 */
export function throwIfUndefined<T>(
  value: T,
  op: string,
  message: MsgInput = DEFAULT_FERR_MESSAGE,
  options: ThrowOptions = {}
): asserts value is Exclude<T, undefined> {
  if (value === undefined) throwErr(op, message, options)
}

/**
 * Create a formatter-backed throw helper for a custom `Error` class.
 */
export const createThrowErr = <E extends Error>(
  ErrorClass: new (message: string) => E
) => (
    op: string,
    message: MsgInput,
    options: ThrowOptions = {}
  ): never => {
    throw new ErrorClass(formatMsg(op, message, options.context))
  }

/**
 * Conditional variant factory of {@link createThrowErr}.
 */
export const createThrowErrIf = <E extends Error>(
  ErrorClass: new (message: string) => E
) => {
  const throwFn = createThrowErr(ErrorClass)
  return (
    condition: boolean,
    op: string,
    message: MsgInput,
    options: ThrowOptions = {}
  ): void => {
    if (condition) throwFn(op, message, options)
  }
}

/**
 * Create a typed `undefined` assertion helper for a custom `Error` class.
 */
export const createThrowIfUndefined = <E extends Error>(
  ErrorClass: new (message: string) => E
) => {
  const throwFn = createThrowErr(ErrorClass)
  return <T>(
    value: T,
    op: string,
    message: MsgInput = DEFAULT_FERR_MESSAGE,
    options: ThrowOptions = {}
  ): asserts value is Exclude<T, undefined> => {
    if (value === undefined) throwFn(op, message, options)
  }
}

// ─── Pipe-friendly versions ─────────────────────────────────────────
// Curried variants designed for use in `.catch()` and pipeline chains.

/**
 * Curried `rethrowFerr` for `.catch()` and pipeline chains.
 *
 * Accepts two calling styles:
 * - **Short form:** `pRethrowFerr({ op, message, code, clientMsg, context, notes, cause })`
 * - **Full form:** `pRethrowFerr({ with: { op, ... }, notes, mode })`
 *
 * Returns `(caught: unknown) => never` — plug directly into `.catch()`.
 *
 * @param options - Either `Partial<FErrOptions>` (short) or `RethrowFerrRequest` (full)
 *
 * @example
 * // Short form — just the fields to merge
 * getDb().getAllFoods()
 *   .then(sendOk(res))
 *   .catch(pRethrowFerr({
 *     op: 'api.foods.list',
 *     code: 'REQUEST_FAILED',
 *     message: 'Failed to list foods',
 *   }))
 *
 * @example
 * // Full form — with mode and top-level notes
 * fetchExternal()
 *   .catch(pRethrowFerr({
 *     with: { op: 'api.proxy', code: 'UPSTREAM_ERROR' },
 *     notes: 'external service timeout',
 *     mode: 'append',
 *   }))
 */
export const pRethrowFerr = (options: RethrowFerrRequest | Partial<FErrOptions>) =>
  (caught: unknown): never =>
    rethrowFerr(caught, 'with' in options ? options as RethrowFerrRequest : { with: options })
