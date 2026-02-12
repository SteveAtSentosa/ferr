import { DEFAULT_FERR_MESSAGE, FErr, type FErrCause, type FErrOptions } from './fErr'
import { toJson } from './ferrUtils'

/**
 * Shared options for throw helper APIs.
 * Mirrors a focused subset of {@link FErrOptions} but keeps callsites ergonomic.
 */
export interface ThrowOptions {
  op?: string
  code?: string
  clientMsg?: string
  context?: unknown
  cause?: FErrCause | unknown
  notes?: string | string[]
}

const toFerrOptions = (message: string, options: ThrowOptions = {}): FErrOptions => ({
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
export const formatMsg = (op: string, message: string, context?: unknown): string => {
  const lines = [`${op} failed: ${message}`]
  if (context !== undefined) lines.push(`Context: ${toJson(context)}`)
  return lines.join('\n')
}

/**
 * Throw an `FErr` from unknown input.
 */
export const throwFerr = (input: unknown, overrides?: Partial<FErrOptions>): never => {
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
  message: string,
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
  message: string,
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
 * Assert that a value is defined; throw `FErr` if not.
 */
export function throwIfUndefined<T>(
  value: T,
  op: string,
  message = DEFAULT_FERR_MESSAGE,
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
    message: string,
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
    message: string,
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
    message = DEFAULT_FERR_MESSAGE,
    options: ThrowOptions = {}
  ): asserts value is Exclude<T, undefined> => {
    if (value === undefined) throwFn(op, message, options)
  }
}
