import { complement, prop, pipe } from 'ramda'
import { isObject, isString, isNotNil } from 'ramda-adjunct'
import LG from 'ramda-lens-groups'
import { propIsNonEmptyString, propIsNonEmptyArray, propIsNotNil } from './utils'


//*****************************************************************************
// all of the getters gracefuly handle attempted access to undefine objects
// all setters return new object, with original unmutated
//*****************************************************************************

export const _tagFErr = '@@ferr'
export const _defaultErrMsg = 'unkown error'

const fErrProps =    ['_tag',    'op', 'code', 'message',         'clientMsg', 'notes', 'stack', 'externalExp']
const fErrDefaults = [_tagFErr,  '',   '',     _defaultErrMsg,    '',           [],      [],      null]

const fErrLg = LG.create({
  propList: fErrProps,
  defaults: fErrDefaults
})

export const cloneErrInfoWIthDef = LG.cloneWithDef(fErrLg)

export const hasOp = propIsNonEmptyString('op')
export const getOp = LG.view(fErrLg, 'op')
export const getOpOrDef = LG.viewOrDef(fErrLg, 'op')
export const setOp = LG.set(fErrLg, 'op')

export const hasCode = propIsNonEmptyString('code')
export const getCode = LG.view(fErrLg, 'code')
export const getCodeOrDef = LG.viewOrDef(fErrLg, 'code')
export const setCode = LG.set(fErrLg, 'code')


export const hasMessage = propIsNonEmptyString('message')
export const doesNotHaveMessage = complement(hasMessage)
export const getMessage = LG.view(fErrLg, 'message')
export const getMessageOrDef = LG.viewOrDef(fErrLg, 'message')
export const setMessage = LG.set(fErrLg, 'message')

export const hasClientMsg = propIsNonEmptyString('clientMsg')
export const getClientMsg = LG.view(fErrLg, 'clientMsg')
export const getClientMsgOrDef = LG.viewOrDef(fErrLg, 'clientMsg')
export const setClientMsg = LG.set(fErrLg, 'clientMsg')

export const hasNotes = propIsNonEmptyArray('notes')
export const getNotes = LG.view(fErrLg, 'notes')
export const getNotesOrDef = LG.viewOrDef(fErrLg, 'notes')
export const setNotes = LG.set(fErrLg, 'notes')

export const getStackOrDef = LG.viewOrDef(fErrLg, 'stack')
export const setStack = LG.set(fErrLg, 'stack')
export const getStack = LG.view(fErrLg, 'stack')
export const hasStack = pipe(getStack, isNotNil)
export const doesNotHaveStack = complement(hasStack)

export const hasExternalExp = propIsNotNil('externalExp')
export const doesNotHaveExternalExp = complement(hasExternalExp)
export const getExternalExp = LG.view(fErrLg, 'externalExp')
export const getExternalExpOrDef = LG.viewOrDef(fErrLg, 'externalExp')
export const setExternalExp = LG.set(fErrLg, 'externalExp')

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
  isObject(toCheck) && prop('_tag', toCheck) === _tagFErr
export const isNotFerr = complement(isFerr)

export const isFerrOrString = toCheck => (isFerr(toCheck) || isString(toCheck))
export const isNotFerrOrString = complement(isFerrOrString)
