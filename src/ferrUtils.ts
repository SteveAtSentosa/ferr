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

export const arrayify = input => Array.isArray(input) ? input : [input]
export const flatArrayify = input => arrayify(input).flat(Infinity)

// if toCheck is an array, return first element, otherwise return toCheck
export const headOrReflect = toCheck =>
  Array.isArray(toCheck) ? toCheck[0] : toCheck

export const doesNotHave = (propName, obj) => !hasOwn(obj, propName)

export const isNonEmptyString = toCheck => typeof toCheck === 'string' && toCheck.length > 0
export const isNotNonEmptyString = complement(isNonEmptyString)
export const propIsNonEmptyString = curryLast((propName, obj) => isNonEmptyString(getProp(obj, propName)))

export const isNonEmptyArray = toCheck => Array.isArray(toCheck) && toCheck.length > 0
export const propIsNonEmptyArray = curryLast((propName, obj) => isNonEmptyArray(getProp(obj, propName)))

export const propIsNotNil = curryLast((propName, obj) => getProp(obj, propName) !== undefined && getProp(obj, propName) !== null)

export const isNotObjectOrNonEmptyString = toCheck =>
  (typeof toCheck !== 'object' || toCheck === null || Array.isArray(toCheck)) && isNotNonEmptyString(toCheck)

export const stackStrToStackArr = stackStr =>
  // drop error message and this call from stack list
  stackStr.split('\n').map(s => s.trim()).slice(2)

export const retThrownErr = (fxnThatThrows, ...argsForFxnThatThrows) => {
  try { fxnThatThrows(...argsForFxnThatThrows); return null } catch (e) { return e }
}

export const reflect = a => a

export const applyAsync = (acc, val) => acc.then(val)

// handles pipeline of any combination of sync and asyn functions
// Always returns a promise, even if all fxns are async
// This allows .catch to be used in all pipelines
export const fPipe = (...funcs: any[]) => (x?: any) => funcs.reduce(applyAsync, Promise.resolve(x))

export const copyProp = (propName, sourceObj = {}, targetObj = {}) =>
  hasOwn(sourceObj, propName) ? { ...targetObj, [propName]: sourceObj[propName] } : targetObj

export const plainObject = classInstance => Object.assign({}, classInstance)

// Given the predicate fxn `checkPred`, check that all elements of `array` pass
// ((a->bool), a) -> boolean
export const isArrayOf = (typeCheckPred, array) =>
  Array.isArray(array) && !array.some(v => !typeCheckPred(v))

export const isStringArray = array => isArrayOf((v: any) => typeof v === 'string', array)
export const isNotStringArray = complement(isStringArray)

const isNilOrEmpty = toCheck =>
  toCheck === undefined ||
  toCheck === null ||
  (typeof toCheck === 'string' && toCheck.length === 0) ||
  (Array.isArray(toCheck) && toCheck.length === 0) ||
  (typeof toCheck === 'object' && !Array.isArray(toCheck) && Object.keys(toCheck).length === 0)

export const propIsNilOrEmpty = (propName, obj) => isNilOrEmpty(getProp(obj, propName))
export const propIsNotNilOrEmpty = complement(propIsNilOrEmpty)

export const addPropIfMissingOrEq = (propName, valToCheckAtainst, newPropVal, obj) => {
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

export const msgListToStr = (msgList, appendTo = '', pre = '') => {
  const strings = arrayify(msgList)
  if (isNotStringArray(strings)) return appendTo
  return strings.reduce((acc, cur, i) =>
    `${acc}${pre}${cur}${i < strings.length - 1 ? '\n' : ''}`, appendTo)
}

export const stackStrToArr = stackStr =>
  // drop error message from stack list
  stackStr.split('\n').map(s => s.trim()).slice(1)

export const stackArrToStr = (msg, stackArr) =>
  msgListToStr(stackArr, `Error: ${msg}\n`, '    ')
