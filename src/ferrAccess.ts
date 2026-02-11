import { propIsNonEmptyString, propIsNonEmptyArray, propIsNotNil, stackStrToArr } from './utils'

export const _tagFErr = '@@ferr'
export const _defaultErrMsg = 'unkown error'

const isObj = (toCheck: any) =>
  typeof toCheck === 'object' && toCheck !== null && !Array.isArray(toCheck)

const cloneVal = (v: any) =>
  Array.isArray(v) ? [...v] :
  isObj(v) ? { ...v } :
  v

const nil = (v: any) => v === undefined || v === null
const isString = (v: any) => typeof v === 'string'

export class FErr extends Error {
  _tag = _tagFErr
  op = ''
  code = ''
  clientMsg = ''
  notes: any[] = []
  stackArr: string[] = []
  externalExp: any = null

  constructor(errInfo: any = {}) {
    const message = isString(errInfo?.message) && errInfo.message.length > 0 ? errInfo.message : _defaultErrMsg
    super(message)
    this.name = 'FErr'
    // Keep message enumerable like the original plain-object ferr representation.
    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true,
      writable: true,
      configurable: true
    })
    this.op = isString(errInfo?.op) ? errInfo.op : ''
    this.code = isString(errInfo?.code) ? errInfo.code : ''
    this.clientMsg = isString(errInfo?.clientMsg) ? errInfo.clientMsg : ''
    this.notes = Array.isArray(errInfo?.notes) ? [...errInfo.notes] : []
    this.externalExp = nil(errInfo?.externalExp) ? null : errInfo.externalExp
    this.stackArr = Array.isArray(errInfo?.stackArr) ? [...errInfo.stackArr] :
      Array.isArray(errInfo?.stack) ? [...errInfo.stack] :
      []
  }

  setOp(op: any) { this.op = op; return this }
  setCode(code: any) { this.code = code; return this }
  setMessage(message: any) { this.message = message; return this }
  setClientMsg(clientMsg: any) { this.clientMsg = clientMsg; return this }
  setNotes(notes: any) { this.notes = Array.isArray(notes) ? [...notes] : notes; return this }
  setStack(stack: any) {
    this.stackArr = Array.isArray(stack) ? [...stack] :
      isString(stack) ? stackStrToArr(stack) :
      []
    return this
  }
  setExternalExp(externalExp: any) { this.externalExp = externalExp; return this }
}

export const cloneErrInfoWIthDef = (toClone?: any) => {
  const source = isObj(toClone) ? toClone : {}
  const fErr = new FErr({
    op: source.op ?? '',
    code: source.code ?? '',
    message: source.message ?? _defaultErrMsg,
    clientMsg: source.clientMsg ?? '',
    notes: source.notes ?? [],
    stackArr: source.stackArr ?? source.stack ?? [],
    externalExp: source.externalExp ?? null,
  })
  fErr._tag = source._tag ?? _tagFErr
  return fErr
}

const readProp = (obj: any, propName: string) =>
  isObj(obj) ? obj[propName] : undefined

const readPropOrDef = (obj: any, propName: string, fallback: any) => {
  const value = readProp(obj, propName)
  return nil(value) ? cloneVal(fallback) : value
}

const mutateOrCopy = (obj: any, propName: string, val: any, classSetter?: (target: FErr, value: any) => FErr) => {
  if (obj instanceof FErr && classSetter) return classSetter(obj, val)
  if (isObj(obj)) return { ...obj, [propName]: val }
  return obj
}

export const hasOp = propIsNonEmptyString('op')
export const getOp = obj => readProp(obj, 'op')
export const getOpOrDef = obj => readPropOrDef(obj, 'op', '')
export const setOp = (val, obj) => mutateOrCopy(obj, 'op', val, target => target.setOp(val))

export const hasCode = propIsNonEmptyString('code')
export const getCode = obj => readProp(obj, 'code')
export const getCodeOrDef = obj => readPropOrDef(obj, 'code', '')
export const setCode = (val, obj) => mutateOrCopy(obj, 'code', val, target => target.setCode(val))

export const hasMessage = propIsNonEmptyString('message')
export const doesNotHaveMessage = toCheck => !hasMessage(toCheck)
export const getMessage = obj => readProp(obj, 'message')
export const getMessageOrDef = obj => readPropOrDef(obj, 'message', _defaultErrMsg)
export const setMessage = (val, obj) => mutateOrCopy(obj, 'message', val, target => target.setMessage(val))

export const hasClientMsg = propIsNonEmptyString('clientMsg')
export const getClientMsg = obj => readProp(obj, 'clientMsg')
export const getClientMsgOrDef = obj => readPropOrDef(obj, 'clientMsg', '')
export const setClientMsg = (val, obj) => mutateOrCopy(obj, 'clientMsg', val, target => target.setClientMsg(val))

export const hasNotes = propIsNonEmptyArray('notes')
export const getNotes = obj => readProp(obj, 'notes')
export const getNotesOrDef = obj => readPropOrDef(obj, 'notes', [])
export const setNotes = (val, obj) => mutateOrCopy(obj, 'notes', val, target => target.setNotes(val))

export const getStack = obj => {
  if (obj instanceof FErr) {
    if (Array.isArray(obj.stackArr)) return obj.stackArr
    return []
  }
  const stackArr = readProp(obj, 'stackArr')
  if (Array.isArray(stackArr)) return stackArr
  const stack = readProp(obj, 'stack')
  if (Array.isArray(stack)) return stack
  if (isString(stack)) return stack
  return undefined
}
export const getStackOrDef = obj => nil(getStack(obj)) ? [] : getStack(obj)
export const setStack = (val, obj) => {
  if (obj instanceof FErr) return obj.setStack(val)
  if (isObj(obj)) return { ...obj, stack: val }
  return obj
}
export const hasStack = obj => !nil(getStack(obj))
export const doesNotHaveStack = obj => !hasStack(obj)

export const hasExternalExp = propIsNotNil('externalExp')
export const doesNotHaveExternalExp = obj => !hasExternalExp(obj)
export const getExternalExp = obj => readProp(obj, 'externalExp')
export const getExternalExpOrDef = obj => readPropOrDef(obj, 'externalExp', null)
export const setExternalExp = (val, obj) => mutateOrCopy(obj, 'externalExp', val, target => target.setExternalExp(val))

// if toCheck is object with { message } string prop return the message string
// if toCheck is a string return it (assuming it is a message string)
// otherwise return null
export const extractMessage = (toCheck?: any) =>
  isString(toCheck) ? toCheck :
  hasMessage(toCheck) ? getMessage(toCheck) :
  null

export const hasDefaultMessage = toCheck => getMessage(toCheck) === _defaultErrMsg
export const doesNotHaveDefaultMessage = toCheck => !hasDefaultMessage(toCheck)
export const hasNonDefaultMessage = toCheck =>
  hasMessage(toCheck) && doesNotHaveDefaultMessage(toCheck)
export const doesNotHaveNonDefaultMessage = toCheck => !hasNonDefaultMessage(toCheck)

export const isFerr = toCheck => toCheck instanceof FErr
export const isNotFerr = toCheck => !isFerr(toCheck)

export const isFerrOrString = toCheck => (isFerr(toCheck) || isString(toCheck))
export const isNotFerrOrString = toCheck => !isFerrOrString(toCheck)
