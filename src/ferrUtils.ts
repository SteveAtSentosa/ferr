// Consolidated ferr utility helpers.

type AnyFn = (...args: any[]) => any

export const curryLast = (fn: AnyFn): any => {
  function curried(this: unknown, ...args: unknown[]) {
    if (args.length >= fn.length) return fn.apply(this, args as any[])
    return (...rest: unknown[]) => curried.apply(this, [...args, ...rest])
  }

  return curried
}

const hasOwn = (obj: any, propName: string) =>
  obj !== null &&
  obj !== undefined &&
  Object.prototype.hasOwnProperty.call(obj, propName)

const getProp = (obj: any, propName: string) =>
  obj === null || obj === undefined ? undefined : obj[propName]

const complement = (pred: (...args: any[]) => boolean) =>
  (...args: any[]) => !pred(...args)

export const arrayify = <T>(input: T | T[]): T[] => Array.isArray(input) ? input : [input]
export const flatArrayify = (input: unknown): unknown[] => arrayify(input as unknown | unknown[]).flat(Infinity) as unknown[]

// if toCheck is an array, return first element, otherwise return toCheck
export const headOrReflect = <T>(toCheck: T | T[]): T =>
  Array.isArray(toCheck) ? toCheck[0] : toCheck

export const doesNotHave = (propName: string, obj: unknown): boolean => !hasOwn(obj, propName)

export const isNonEmptyString = (toCheck: unknown): toCheck is string => typeof toCheck === 'string' && toCheck.length > 0
export const isNotNonEmptyString = complement(isNonEmptyString)
export const propIsNonEmptyString = curryLast((propName: string, obj: unknown): boolean => isNonEmptyString(getProp(obj, propName)))

export const isNonEmptyArray = <T>(toCheck: T[] | unknown): toCheck is T[] => Array.isArray(toCheck) && toCheck.length > 0
export const propIsNonEmptyArray = curryLast((propName: string, obj: unknown): boolean => isNonEmptyArray(getProp(obj, propName)))

export const propIsNotNil = curryLast((propName: string, obj: unknown): boolean => getProp(obj, propName) !== undefined && getProp(obj, propName) !== null)

export const isNotObjectOrNonEmptyString = (toCheck: unknown): boolean =>
  (typeof toCheck !== 'object' || toCheck === null || Array.isArray(toCheck)) && isNotNonEmptyString(toCheck)

export const stackStrToStackArr = (stackStr: string): string[] =>
  // drop error message and this call from stack list
  stackStr.split('\n').map((s: string) => s.trim()).slice(2)

export const retThrownErr = (fxnThatThrows: (...args: any[]) => unknown, ...argsForFxnThatThrows: any[]): unknown => {
  try { fxnThatThrows(...argsForFxnThatThrows); return null } catch (e) { return e }
}

export const reflect = <T>(a: T): T => a

export const applyAsync = (acc: Promise<any>, val: (x: any) => any): Promise<any> => acc.then(val)

// handles pipeline of any combination of sync and asyn functions
// Always returns a promise, even if all fxns are async
// This allows .catch to be used in all pipelines
export const fPipe = (...funcs: any[]) => (x?: any) => funcs.reduce(applyAsync, Promise.resolve(x))

export const copyProp = (propName: string, sourceObj: Record<string, unknown> = {}, targetObj: Record<string, unknown> = {}): Record<string, unknown> =>
  hasOwn(sourceObj, propName) ? { ...targetObj, [propName]: sourceObj[propName] } : targetObj

export const plainObject = (classInstance: object): object => Object.assign({}, classInstance)

// Given the predicate fxn `checkPred`, check that all elements of `array` pass
// ((a->bool), a) -> boolean
export const isArrayOf = <T>(typeCheckPred: (value: unknown) => value is T, array: unknown): array is T[] =>
  Array.isArray(array) && !array.some(v => !typeCheckPred(v))

export const isStringArray = (array: unknown): array is string[] => isArrayOf((v: unknown): v is string => typeof v === 'string', array)
export const isNotStringArray = complement(isStringArray)

const isNilOrEmpty = (toCheck: unknown): boolean =>
  toCheck === undefined ||
  toCheck === null ||
  (typeof toCheck === 'string' && toCheck.length === 0) ||
  (Array.isArray(toCheck) && toCheck.length === 0) ||
  (typeof toCheck === 'object' && !Array.isArray(toCheck) && Object.keys(toCheck).length === 0)

export const propIsNilOrEmpty = (propName: string, obj: unknown): boolean => isNilOrEmpty(getProp(obj, propName))
export const propIsNotNilOrEmpty = complement(propIsNilOrEmpty)

export const addPropIfMissingOrEq = (propName: string, valToCheckAtainst: unknown, newPropVal: unknown, obj: Record<string, unknown>): boolean => {
  if (doesNotHave(propName, obj) || getProp(obj, propName) === valToCheckAtainst) {
    obj[propName] = newPropVal
    return true
  }
  return false
}

// given a string or array of strings, prepended with the specified tab
// (['']|'', '') -> [''] | ''
export function tab(tabMe: string, tab?: string): string
export function tab(tabMe: string[], tab?: string): string[]
export function tab(tabMe: any = '', tab = '  ') {
  if (isStringArray(tabMe)) return tabMe.map((str: string) => `${tab}${str}`)
  else if (typeof tabMe === 'string') return `${tab}${tabMe}`
  else return tabMe
}

export const msgListToStr = (msgList: string | string[], appendTo = '', pre = ''): string => {
  const strings = arrayify(msgList)
  if (isNotStringArray(strings)) return appendTo
  return strings.reduce((acc: string, cur: string, i: number) =>
    `${acc}${pre}${cur}${i < strings.length - 1 ? '\n' : ''}`, appendTo)
}

export const stackStrToArr = (stackStr: string): string[] =>
  // drop error message from stack list
  stackStr.split('\n').map((s: string) => s.trim()).slice(1)

export const stackArrToStr = (msg: string, stackArr: string[]): string =>
  msgListToStr(stackArr, `Error: ${msg}\n`, '    ')

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
