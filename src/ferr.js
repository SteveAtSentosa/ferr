import { concat, curry, propOr, } from 'ramda'
import { isObject, isString, isNotObject } from 'ramda-adjunct'
import {
  flatArrayify, stackStrToArr, stackStrToStackArr, tab, msgListToStr,
  isNotObjectOrNonEmptyString
} from './utils'
// to reexport
import {
  isFerr,
  isNotFerr
} from './ferrAccess'
import * as FE from './ferrAccess'

export const defaultErrMessage = () => FE._defaultErrMsg

const isExternalExp = toCheck =>
  isNotFerr(toCheck) && FE.hasMessage(toCheck) && FE.hasStack(toCheck)

// create an fErr given errInfo
// errInfo {
//   op: string - operation undeway when error occured
//   code: string - error code
//   message: string - error message
//   clientMsg: string - user friendly message
//   notes: 'string' | ['string'] - notes about the message
//   externalExp: any - external exception that was caught
// }

// {errInfo} | 'msg' -> fErr
export const makeFerr = (errInfo = FE._defaultErrMsg)  => {

  // create the starting fErr object
  let fErr = FE.cloneErrInfoWIthDef(isString(errInfo) ? { message: errInfo } : errInfo)

  // add the callstack list
  const stackList = stackStrToStackArr((new Error()).stack)
  fErr = FE.setStack(stackList, fErr)

  const externalExp = FE.getExternalExp(errInfo)
  if (externalExp)
    fErr = applyMessageFrom(externalExp, fErr)

  return fErr
}

// Return an fErr derived from original fErr, with notes added
// '' | [''] -> fErr -> fErr
export const addNotes = curry((noteOrNoteList, fErr) => {
  const newNoteList = concat(FE.getNotesOrDef(fErr), flatArrayify(noteOrNoteList))
  return FE.setNotes(newNoteList, fErr)
})

// Apply a message string or object to an existing fErr
// '' | { message } -> {fErr} -> {fErr}
const applyMessageFrom = curry((messageInfo, fErr) => {

  if (isNotFerr(fErr)) return fErr
  let fErrToReturn = fErr

  const message = FE.extractMessage(messageInfo)
  if (message)
    fErrToReturn = FE.hasNonDefaultMessage(fErr) ?
      addNotes(message, fErr) :
      FE.setMessage(message, fErr)

  return fErrToReturn
})

// given an existing fErr and incomingErrInfo as one of the following:
//   (1) incoming fErr
//   (2) incoming fErrInfo
//   (3) incoming external exception
//   (4) incoming error string
// A new fErr is returned with incomingErrInfo merged into existingFerr
// {fErr} -> {fErr} | { errInfo } | 'message' | {exception} -> {fErr}
const mergeErrInfo = (existingFerr, incomingErrInfo) => {

  if (isNotFerr(existingFerr)) return makeFerr(incomingErrInfo)
  if (isNotObjectOrNonEmptyString(incomingErrInfo)) return existingFerr

  let noteStr = ''
  const sourceErrInfo = isString(incomingErrInfo) ? { message: incomingErrInfo } : incomingErrInfo
  let targetFerr = existingFerr

  // copy over code, op, msg if missing, or add to notes if not

  if (FE.hasCode(sourceErrInfo)) {
    if (FE.hasCode(targetFerr))
      noteStr += `Code: ${FE.getCode(sourceErrInfo)}`
    else
      targetFerr = FE.setCode(FE.getCode(sourceErrInfo), targetFerr)
  }

  if (FE.hasOp(sourceErrInfo)) {
    if (FE.hasOp(targetFerr))
      noteStr += `${noteStr ? ', ' : ''}` + `Op: ${FE.getOp(sourceErrInfo)}`
    else
      targetFerr = FE.setOp(FE.getOp(sourceErrInfo), targetFerr)
  }

  // copy over clientMsg if missing, or add to notes if not
  if (FE.hasClientMsg(sourceErrInfo)) {
    targetFerr = FE.hasClientMsg(targetFerr) ?
      addNotes(FE.getClientMsg(sourceErrInfo), targetFerr) :
      FE.setClientMsg(FE.getClientMsg(sourceErrInfo), targetFerr)
  }

  // if incoming errInfo has a message, adopt it if target does not,
  // or else add to notes
  if (FE.hasNonDefaultMessage(sourceErrInfo)) {
    if (FE.hasNonDefaultMessage(targetFerr))
      noteStr += `${noteStr?': ':''}` +  `${FE.getMessage(sourceErrInfo)}`
    else {
      targetFerr = FE.setMessage(
        noteStr + `${noteStr?': ':''}` + `${FE.getMessage(sourceErrInfo)}`, targetFerr
      )
      noteStr = ''
    }
  }
  // add note string for anything that was not coppied over
  if (noteStr)
    targetFerr = addNotes(noteStr, targetFerr)

  // append any incoming notes
  if (FE.hasNotes(sourceErrInfo))
    targetFerr = addNotes(FE.getNotes(sourceErrInfo), targetFerr)

  const externalExp =
    isExternalExp(incomingErrInfo) ? incomingErrInfo :
    FE.hasExternalExp(incomingErrInfo) ? FE.getExternalExp(incomingErrInfo) :
    null

  if (externalExp && FE.doesNotHaveExternalExp(targetFerr))
    targetFerr =FE.setExternalExp(externalExp, targetFerr)

  return targetFerr
}

const fErrToMsgList = (fErr, tabStr='') => {
  if (isNotObject(fErr)) return []

  // TODO: test this line
  if (isNotFerr(fErr)) {
    return fErr instanceof Error ?
      fErrToMsgList(makeFerr({ externalExp: fErr })) :
      fErrToMsgList(makeFerr(fErr))
  }

  const {
    op = '',  message = FE._defaultErrMsg, clientMsg = '', code = '', notes = [], externalExp = null
  } = fErr

  const msgList = ['\nERROR encountered!']
  msgList.push(tab(`Msg: ${op ? op+' => ' : ''}${message}`))
  if (clientMsg) msgList.push(tab(`Client msg: ${clientMsg}`))
  if (code) msgList.push(tab(`Code: ${code}`))
  if (notes.length > 0) {
    msgList.push('Notes:')
    notes.forEach(note => msgList.push(tab(note)))
  }

  msgList.push('Call Stack:')
  propOr([], 'stack', fErr).forEach(line => msgList.push(tab(line)))

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

export const throwFerr = errInfo => { throw makeFerr(errInfo) }

export const throwFerrIf = (condition, errInfo) => {
  if (condition) throwFerr(errInfo)
}

// throws toThrow if condition is true,
// otherwise returns toPassThrough
export const throwIfOrPassthrough = curry((condition, toThrow, toPassThrough) => {
  if (condition) throw toThrow
  return toPassThrough
})

// throws toThrow if condition is true
export const throwIf = (condition, toThrow) => {
  if (condition) throw toThrow
}

export const reThrowWithFerr = curry((newErrorInfo, incomingErrInfo) => {
  throw mergeErrInfo(makeFerr(newErrorInfo), incomingErrInfo)
})

// TODO: This might be a bit too much ??
export const throwErrIfOrRet = (toRetIfConditionIsFalse, condition, errInfo) => {
  if (condition) throwFerr(errInfo)
  return toRetIfConditionIsFalse
}

// passthrough exports
export {
  isFerr,
  isNotFerr,
}

// functions that we want to expose to testing, but not to end clients
export const testExports = {
  _tagFErr: FE._tagFErr,
  _defaultErrMsg: FE._defaultErrMsg,
  mergeErrInfo
}
