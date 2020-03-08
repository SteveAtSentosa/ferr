import { concat, curry, propOr } from 'ramda'
import { isObject, isString, isNotObject } from 'ramda-adjunct'
import {
  flatArrayify, stackStrToArr, stackStrToStackArr, tab, msgListToStr, isNotObjectOrNonEmptyString
} from './utils'
import {
  _tagFErr, _defaultErrMsg, isNotFerr, errInfoToFerr, setCallStack,
  hasOp, getOp, setOp, hasCode, getCode, setCode, hasMsg, getMsg, setMsg,
  hasClientMsg, getClientMsg, setClientMsg, hasNotes, getNotes, getNotesOrDef, setNotes,
  hasExternalExp, doesNotHaveExternalExp, getExternalExp, setExternalExp,
} from './ferrAccess'

// TODO: better fxn docs

// create an fErr given fErrInfo
// {errInfo} | 'msg' -> fErr
export const makeErr = (errInfo = _defaultErrMsg)  => {
  const fErr = errInfoToFerr(isString(errInfo) ? { msg: errInfo } : errInfo)
  return setCallStack(stackStrToStackArr((new Error()).stack), fErr)
}

// Return an fErr derived from original fErr, with notes added
// '' | [''] -> fErr -> fErr
export const addNote = curry((noteOrNoteList, fErr) => {
  const newNoteList = concat(getNotesOrDef(fErr), flatArrayify(noteOrNoteList))
  return setNotes(newNoteList, fErr)
})

// given an existing fErr and additional error info, merge into and return a new fErr
const mergeErrInfo = (existingFerr, newErrInfo) => {

  if (isNotFerr(existingFerr)) return makeErr(newErrInfo)
  if (isNotObjectOrNonEmptyString(newErrInfo)) return existingFerr

  let noteStr = ''
  const sourceErrInfo = isString(newErrInfo) ? { msg: newErrInfo } : newErrInfo
  let targetFerr = existingFerr

  // copy over code, op, msg if missing, or add to notes if not

  if (hasCode(sourceErrInfo)) {
    if (hasCode(targetFerr))
      noteStr += `Code: ${getCode(sourceErrInfo)}`
    else
      targetFerr = setCode(getCode(sourceErrInfo), targetFerr)
  }

  if (hasOp(sourceErrInfo)) {
    if (hasOp(targetFerr))
      noteStr += `, ${getOp(sourceErrInfo)}`
    else
      targetFerr = setOp(getOp(sourceErrInfo), targetFerr)
  }


  if (hasMsg(sourceErrInfo)) {
    if (hasMsg(targetFerr) && getMsg(targetFerr) !== _defaultErrMsg)
      noteStr += ` => ${getMsg(sourceErrInfo)}`
    else
      targetFerr = setMsg(getMsg(sourceErrInfo), targetFerr)
  }

  // add note string for anything that was not coppied over
  if (noteStr)
    targetFerr = addNote(noteStr, targetFerr)

  // copy over clientMsg if missing, or add to notes if not
  if (hasClientMsg(sourceErrInfo)) {
    targetFerr = hasClientMsg(targetFerr) ?
      addNote(getClientMsg(sourceErrInfo), targetFerr) :
      setClientMsg(getClientMsg(sourceErrInfo), targetFerr)
  }

  // append any incoming notes
  if (hasNotes(sourceErrInfo))
    targetFerr = addNote(getNotes(sourceErrInfo), targetFerr)

  // grap the external exception if we don't already have one
  if (hasExternalExp(sourceErrInfo) && doesNotHaveExternalExp(targetFerr))
    targetFerr = setExternalExp(getExternalExp(sourceErrInfo), targetFerr)

  return targetFerr
}

const fErrToMsgList = (fErr, tabStr='') => {
  if (isNotObject(fErr)) return []
  const {
    op = '',  msg = _defaultErrMsg, clientMsg = '', code = '', notes = [],  externalExp = null
  } = fErr

  const msgList = ['\nERROR encountered!']
  msgList.push(tab(`Msg: ${op ? op+' => ' : ''}${msg}`))
  if (clientMsg) msgList.push(tab(`Client msg: ${clientMsg}`))
  if (code) msgList.push(tab(`Code: ${code}`))
  if (notes.length > 0) {
    msgList.push('Notes:')
    notes.forEach(note => msgList.push(tab(note)))
  }

  const e = externalExp
  if (e) {
    msgList.push('External exception Caught')
    if (e.name) msgList.push(tab(`Name: ${e.name}`))
    if (e.message) msgList.push(tab(`Message: ${e.message}`))
    if (e.code) msgList.push(tab(`Exception Code: ${e.code}`))
    if (e.errorNum) msgList.push(tab(`Error Num: ${e.errorNum}`))
    if (e.stack) {
      msgList.push('External exception callstack:')
      const stackList = stackStrToArr(e.stack)
      stackList.forEach(line => msgList.push(tab(line)))
    }
  }
  msgList.push('Internal Error Call Stack:')
  propOr([], 'callStack', fErr).forEach(line => msgList.push(tab(line)))
  return msgList
}

export const fErrStr = fErr => isObject(fErr) ? msgListToStr(fErrToMsgList(fErr)) : ''


export const throwErr = errInfo => { throw makeErr(errInfo) }

export const throwErrIf = (condition, errInfo) => {
  if (condition) throwErr(errInfo)
}

export const throwWith = (existingErr, newErrInfo) => {
}

// functions that we want to expose to testing, but not to end clients
export const testExports = {
  _tagFErr,
  _defaultErrMsg,
  mergeErrInfo
}
