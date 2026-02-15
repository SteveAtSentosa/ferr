import { DEFAULT_FERR_MESSAGE, FErr, type FErrCause, type FErrOptions, type MsgInput } from './fErr'
import { toJson } from './ferrUtils'

/**
 * Shared options for throw helper APIs.
 * Mirrors a focused subset of {@link FErrOptions} but keeps callsites ergonomic.
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
 * Conditional variant of {@link throwFerr}.
 */
export const throwFerrIf = (condition: boolean, input: unknown, overrides?: Partial<FErrOptions>): void => {
  if (condition) throwFerr(input, overrides)
}

/**
 * Throw an `FErr` from operation + message inputs.
 */
export const throwErr = (
  op: string,
  message: MsgInput,
  options: ThrowOptions = {}
): never => {
  return throwFerr(toFerrOptions(message, { ...options, op }))
}

/**
 * Conditional variant of {@link throwErr}.
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
 */
export const rethrowAppend = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeAppend(incoming)
}

/**
 * Re-throw by update-merging incoming error data over an existing error.
 */
export const rethrowUpdate = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeUpdate(incoming)
}

/**
 * Wrapper-style rethrow helper.
 *
 * Defaults to update semantics:
 * `rethrowFerr(err, { with: { op, code, ... } })`
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
 * Assert that a value is defined; throw `FErr` if not.
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
 * Curried `rethrowFerr` for `.catch()` chains.
 *
 * @example
 * getDb().getAllFoods()
 *   .then(sendOk(res))
 *   .catch(pRethrowFerr({ op: 'api.foods.list', code: 'REQUEST_FAILED', message: 'Failed to list foods' }))
 */
export const pRethrowFerr = (options: RethrowFerrRequest | Partial<FErrOptions>) =>
  (caught: unknown): never =>
    rethrowFerr(caught, 'with' in options ? options as RethrowFerrRequest : { with: options })
