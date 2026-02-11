import { isNonNullish, isString } from 'remeda'
import { propIsNonEmptyString, propIsNonEmptyArray, propIsNotNil } from './utils'


//*****************************************************************************
// all of the getters gracefuly handle attempted access to undefine objects
// all setters return new object, with original unmutated
//*****************************************************************************

export const _tagFErr = '@@ferr'
export const _defaultErrMsg = 'unkown error'

const fErrDefaultsObj = {
  _tag: _tagFErr,
  op: '',
  code: '',
  message: _defaultErrMsg,
  clientMsg: '',
  notes: [],
  stack: [],
  externalExp: null,
}

const complement = (pred: (...args: any[]) => boolean) =>
  (...args: any[]) => !pred(...args)

const isObj = (toCheck: any) =>
  typeof toCheck === 'object' && toCheck !== null && !Array.isArray(toCheck)

const cloneVal = (v: any) =>
  Array.isArray(v) ? [...v] :
  isObj(v) ? { ...v } :
  v

const readProp = (obj: any, propName: keyof typeof fErrDefaultsObj) =>
  isObj(obj) ? obj[propName] : undefined

const readPropOrDef = (obj: any, propName: keyof typeof fErrDefaultsObj) => {
  const value = readProp(obj, propName)
  return value === undefined || value === null
    ? cloneVal(fErrDefaultsObj[propName])
    : value
}

const setProp = (obj: any, propName: keyof typeof fErrDefaultsObj, val: any) =>
  isObj(obj) ? { ...obj, [propName]: val } : obj

export const cloneErrInfoWIthDef = (toClone?: any) => ({
  _tag: readPropOrDef(toClone, '_tag'),
  op: readPropOrDef(toClone, 'op'),
  code: readPropOrDef(toClone, 'code'),
  message: readPropOrDef(toClone, 'message'),
  clientMsg: readPropOrDef(toClone, 'clientMsg'),
  notes: readPropOrDef(toClone, 'notes'),
  stack: readPropOrDef(toClone, 'stack'),
  externalExp: readPropOrDef(toClone, 'externalExp'),
})

export const hasOp = propIsNonEmptyString('op')
export const getOp = obj => readProp(obj, 'op')
export const getOpOrDef = obj => readPropOrDef(obj, 'op')
export const setOp = (val, obj) => setProp(obj, 'op', val)

export const hasCode = propIsNonEmptyString('code')
export const getCode = obj => readProp(obj, 'code')
export const getCodeOrDef = obj => readPropOrDef(obj, 'code')
export const setCode = (val, obj) => setProp(obj, 'code', val)


export const hasMessage = propIsNonEmptyString('message')
export const doesNotHaveMessage = complement(hasMessage)
export const getMessage = obj => readProp(obj, 'message')
export const getMessageOrDef = obj => readPropOrDef(obj, 'message')
export const setMessage = (val, obj) => setProp(obj, 'message', val)

export const hasClientMsg = propIsNonEmptyString('clientMsg')
export const getClientMsg = obj => readProp(obj, 'clientMsg')
export const getClientMsgOrDef = obj => readPropOrDef(obj, 'clientMsg')
export const setClientMsg = (val, obj) => setProp(obj, 'clientMsg', val)

export const hasNotes = propIsNonEmptyArray('notes')
export const getNotes = obj => readProp(obj, 'notes')
export const getNotesOrDef = obj => readPropOrDef(obj, 'notes')
export const setNotes = (val, obj) => setProp(obj, 'notes', val)

export const getStackOrDef = obj => readPropOrDef(obj, 'stack')
export const setStack = (val, obj) => setProp(obj, 'stack', val)
export const getStack = obj => readProp(obj, 'stack')
export const hasStack = obj => isNonNullish(getStack(obj))
export const doesNotHaveStack = complement(hasStack)

export const hasExternalExp = propIsNotNil('externalExp')
export const doesNotHaveExternalExp = complement(hasExternalExp)
export const getExternalExp = obj => readProp(obj, 'externalExp')
export const getExternalExpOrDef = obj => readPropOrDef(obj, 'externalExp')
export const setExternalExp = (val, obj) => setProp(obj, 'externalExp', val)

// if toCheck is object with { message } string prop return the message string
// if toCheck is a string return it (assuming it is a message string)
// otherwise return null
export const extractMessage = (toCheck?: any) =>
  isString(toCheck) ? toCheck :
  hasMessage(toCheck) ? getMessage(toCheck) :
  null

export const hasDefaultMessage = toCheck => getMessage(toCheck) === _defaultErrMsg
export const doesNotHaveDefaultMessage = complement(hasDefaultMessage)
export const hasNonDefaultMessage = toCheck =>
  hasMessage(toCheck) && doesNotHaveDefaultMessage(toCheck)
export const doesNotHaveNonDefaultMessage = complement(hasNonDefaultMessage)


export const isFerr = toCheck =>
  isObj(toCheck) && toCheck._tag === _tagFErr
export const isNotFerr = complement(isFerr)

export const isFerrOrString = toCheck => (isFerr(toCheck) || isString(toCheck))
export const isNotFerrOrString = complement(isFerrOrString)
