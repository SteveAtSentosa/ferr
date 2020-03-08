import { complement, propEq } from 'ramda'
import { isObject } from 'ramda-adjunct'
import LG from 'ramda-lens-groups'
import { propIsNonEmptyString, propIsNonEmptyArray, propIsNotNil } from './utils'

export const _tagFErr = '@@ferr'
export const _defaultErrMsg = 'unkown error'

const fErrProps =    ['_tag',    'op', 'code', 'msg',         'clientMsg', 'notes', 'callStack', 'externalExp']
const fErrDefaults = [_tagFErr,  '',   '',     _defaultErrMsg, '',          [],      [],          null]

const fErrLg = LG.create(fErrProps, fErrDefaults)
export const errInfoToFerr = LG.cloneWithDef(fErrLg)

export const hasOp = propIsNonEmptyString('op')
export const getOp = LG.view(fErrLg, 'op')
export const setOp = LG.set(fErrLg, 'op')

export const hasCode = propIsNonEmptyString('code')
export const getCode = LG.view(fErrLg, 'code')
export const setCode = LG.set(fErrLg, 'code')

export const hasMsg = propIsNonEmptyString('msg')
export const getMsg = LG.view(fErrLg, 'msg')
export const setMsg = LG.set(fErrLg, 'msg')

export const hasClientMsg = propIsNonEmptyString('clientMsg')
export const getClientMsg = LG.view(fErrLg, 'clientMsg')
export const setClientMsg = LG.set(fErrLg, 'clientMsg')

export const hasNotes = propIsNonEmptyArray('notes')
export const getNotes = LG.view(fErrLg, 'notes')
export const getNotesOrDef = LG.viewOrDef(fErrLg, 'notes')
export const setNotes = LG.set(fErrLg, 'notes')

export const setCallStack = LG.set(fErrLg, 'callStack')

export const hasExternalExp = propIsNotNil('externalExp')
export const doesNotHaveExternalExp = complement(hasExternalExp)
export const getExternalExp = LG.view(fErrLg, 'externalExp')
export const setExternalExp = LG.set(fErrLg, 'externalExp')

export const isFerr = toCheck => isObject(toCheck) && propEq('_tag', _tagFErr, toCheck)
export const isNotFerr = complement(isFerr)
