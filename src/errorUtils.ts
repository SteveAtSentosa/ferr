const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  Object.getPrototypeOf(v) === Object.prototype

const normalizeContext = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value === undefined) return 'undefined'
  if (typeof value === 'bigint') return `${value.toString()}n`
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
  if (value === null || typeof value !== 'object') return value

  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value))
    return value.map(v => normalizeContext(v, seen))

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    Object.entries(value).forEach(([k, v]) => {
      out[k] = normalizeContext(v, seen)
    })
    return out
  }

  // For non-plain objects, return a best-effort shallow shape for readability.
  const out: Record<string, unknown> = { _type: value.constructor?.name || 'Object' }
  Object.entries(value).forEach(([k, v]) => {
    out[k] = normalizeContext(v, seen)
  })
  return out
}

export const toJson = (value: unknown): string => {
  try {
    if (value === undefined) return 'undefined'
    return JSON.stringify(normalizeContext(value, new WeakSet<object>()), null, 2)
  } catch {
    return '[Unserializable]'
  }
}

export const formatMsg = (op: string, message: string, context?: unknown): string => {
  const lines = [`${op} failed: ${message}`]
  if (context !== undefined)
    lines.push(`Context: ${toJson(context)}`)
  return lines.join('\n')
}

export const throwErr = (op: string, message: string, context?: unknown): never => {
  throw new Error(formatMsg(op, message, context))
}

export const throwErrIf = (condition: boolean, op: string, message: string, context?: unknown): void => {
  if (condition) throwErr(op, message, context)
}

export const createThrowErr = <E extends Error>(
  ErrorClass: new (message: string) => E
) => (op: string, message: string, context?: unknown): never => {
    throw new ErrorClass(formatMsg(op, message, context))
  }

export const createThrowErrIf = <E extends Error>(
  ErrorClass: new (message: string) => E
) => {
  const throwFn = createThrowErr(ErrorClass)
  return (condition: boolean, op: string, message: string, context?: unknown): void => {
    if (condition) throwFn(op, message, context)
  }
}

export function throwIfUndefined<T>(
  value: T,
  op: string,
  message: string,
  context?: unknown
): asserts value is Exclude<T, undefined> {
  if (value === undefined) throwErr(op, message, context)
}

export const createThrowIfUndefined = <E extends Error>(
  ErrorClass: new (message: string) => E
) => {
  const throwFn = createThrowErr(ErrorClass)
  return <T>(
    value: T,
    op: string,
    message: string,
    context?: unknown
  ): asserts value is Exclude<T, undefined> => {
    if (value === undefined) throwFn(op, message, context)
  }
}
