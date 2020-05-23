import { concat, curry, propOr, prop, has } from 'ramda'
import { isObject, isString, isNotObject } from 'ramda-adjunct'
import {
  flatArrayify, stackStrToArr, stackStrToStackArr, tab, msgListToStr,
  isNotObjectOrNonEmptyString, stackArrToStr
} from './utils'
import {
  _tagFErr, _defaultErrMsg, isFerr, isNotFerr, errInfoToFerr, setCallStack, getCallStackOrDef,
  hasOp, getOp, setOp, hasCode, getCode, setCode, hasMsg, getMsg, getMsgOrDef, setMsg,
  hasClientMsg, getClientMsg, setClientMsg, hasNotes, getNotes, getNotesOrDef, setNotes,
  hasExternalExp, doesNotHaveExternalExp, getExternalExp, setExternalExp,
  getExternalExpMessage, hasExternalExpWithMessage
} from './ferrAccess'

// TODO:
// * 'message from ALL external excpetion encoutered to our notes
// * better fxn docs


// if (hasExternalExp(sourceErrInfo) && doesNotHaveExternalExp(targetFerr))
// targetFerr = setExternalExp(getExternalExp(sourceErrInfo), targetFerr)

// add message and stack so that this can be accessed as an Error Object
const finalizeErr = fErr => ({
  ...fErr,
  message: getMsgOrDef(fErr),
  stack: stackArrToStr(getCallStackOrDef(fErr))

})


// create an fErr given fErrInfo
// {errInfo} | 'msg' -> fErr
export const makeErr = (errInfo = _defaultErrMsg)  => {
  let fErr
  // create the error
  fErr = errInfoToFerr(isString(errInfo) ? { msg: errInfo } : errInfo)

  // add the callstack list
  const stackList = stackStrToStackArr((new Error()).stack)
  fErr = setCallStack(stackList, fErr)

  // TODO:
  // * update tests to accomidate this
  // * make util
  // if external exception with 'message', add 'message to notes
  if (hasExternalExpWithMessage(errInfo))
    fErr = addNote(getExternalExpMessage(errInfo), fErr)

  return finalizeErr(fErr)
}

// TODO: test
// TODO: can I do a conditional calls, allowing for pips (addNoteIf, addExternalExpIf, etc ...)
export const addExternalExp = curry((externalExp, fErr) => {
  if (!externalExp) return fErr
  let fErrToReturn = fErr
  if (has('message', externalExp))
    fErrToReturn = addNote(prop('message', externalExp), fErrToReturn)
  if (doesNotHaveExternalExp(fErr))
    fErrToReturn = setExternalExp(externalExp, fErrToReturn)
  return finalizeErr(fErrToReturn)
})

// TODO: test
export const addExternalExpAndThrow = curry((externalExp, fErr) => {
  throw addExternalExp(externalExp, fErr)
})

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

  return finalizeErr(targetFerr)
}

const fErrToMsgList = (fErr, tabStr='') => {
  if (isNotObject(fErr)) return []

  // TODO: test this line
  if (isNotFerr(fErr)) {
    // assume its an external exception
    return fErrToMsgList(makeErr({ externalExp: fErr }))
  }

  const {
    op = '',  msg = _defaultErrMsg, clientMsg = '', code = '', notes = [], externalExp = null
  } = fErr

  const msgList = ['\nERROR encountered!']
  msgList.push(tab(`Msg: ${op ? op+' => ' : ''}${msg}`))
  if (clientMsg) msgList.push(tab(`Client msg: ${clientMsg}`))
  if (code) msgList.push(tab(`Code: ${code}`))
  if (notes.length > 0) {
    msgList.push('Notes:')
    notes.forEach(note => msgList.push(tab(note)))
  }

  msgList.push('Internal Error Call Stack:')
  propOr([], 'callStack', fErr).forEach(line => msgList.push(tab(line)))

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

  return msgList
}

export const fErrStr = fErr => isObject(fErr) ? msgListToStr(fErrToMsgList(fErr)) : ''

// passes fErr through
export const logFerr = fErr => {
  console.log(fErrStr(fErr) + '\n')
  return fErr
}

export const throwErr = errInfo => { throw makeErr(errInfo) }

export const throwErrIf = (condition, errInfo) => {
  if (condition) throwErr(errInfo)
}

// throws toThrow if condition is true, otherwise
// returns toPassThrough
// TODO: test
export const throwIf = curry((condition, toThrow) => {
  if (condition) throw toThrow
})

// TODO: test
export const fThrow = e => { throw e }

// TODO: This might be a bit too much
export const throwErrIfOrRet = (toRetIfConditionIsFalse, condition, errInfo) => {
  if (condition) throwErr(errInfo)
  return toRetIfConditionIsFalse
}

export const throwWith = (existingErr, newErrInfo) => {
}

// passthrough exports
export {
  isFerr, isNotFerr, getCode
}

// functions that we want to expose to testing, but not to end clients
export const testExports = {
  _tagFErr,
  _defaultErrMsg,
  mergeErrInfo
}
