import { DEFAULT_FERR_MESSAGE, FErr, type FErrOptions } from './fErr'
import { toJson } from './ferrUtils'

export interface ThrowOptions {
  op?: string
  code?: string
  clientMsg?: string
  context?: unknown
  cause?: unknown
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

export const formatMsg = (op: string, message: string, context?: unknown): string => {
  const lines = [`${op} failed: ${message}`]
  if (context !== undefined) lines.push(`Context: ${toJson(context)}`)
  return lines.join('\n')
}

export const throwFerr = (input: unknown, overrides?: Partial<FErrOptions>): never => {
  throw FErr.from(input, overrides)
}

export const throwFerrIf = (condition: boolean, input: unknown, overrides?: Partial<FErrOptions>): void => {
  if (condition) throwFerr(input, overrides)
}

export const throwErr = (
  op: string,
  message: string,
  options: ThrowOptions = {}
): never => {
  return throwFerr(toFerrOptions(message, { ...options, op }))
}

export const throwErrIf = (
  condition: boolean,
  op: string,
  message: string,
  options: ThrowOptions = {}
): void => {
  if (condition) throwErr(op, message, options)
}

export const rethrowAppend = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeAppend(incoming)
}

export const rethrowUpdate = (existing: unknown, incoming: unknown): never => {
  throw FErr.from(existing).mergeUpdate(incoming)
}

export function throwIfUndefined<T>(
  value: T,
  op: string,
  message = DEFAULT_FERR_MESSAGE,
  options: ThrowOptions = {}
): asserts value is Exclude<T, undefined> {
  if (value === undefined) throwErr(op, message, options)
}

export const createThrowErr = <E extends Error>(
  ErrorClass: new (message: string) => E
) => (
    op: string,
    message: string,
    options: ThrowOptions = {}
  ): never => {
    throw new ErrorClass(formatMsg(op, message, options.context))
  }

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
