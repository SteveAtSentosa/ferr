import { concat, curry, head, propOr, } from 'ramda'
import { isObject, isString, isArray, isNotObject, isNotString } from 'ramda-adjunct'
import {
  flatArrayify, stackStrToArr, stackStrToStackArr, tab, msgListToStr,
  isNotObjectOrNonEmptyString, isNonEmptyArray, arrayify
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
// if an fErr is passed in, it is returned directly
// {errInfo} | 'msg' | {fErr} -> fErr
export const makeFerr = (errInfo = FE._defaultErrMsg)  => {

  if (isFerr(errInfo)) return errInfo

  // create the starting fErr object
  let fErr = FE.cloneErrInfoWIthDef(isString(errInfo) ? { message: errInfo } : errInfo)

  // If notes was passed in as a string
  if (isString(FE.getNotes(errInfo)))
    fErr = FE.setNotes([FE.getNotes(errInfo)], fErr)

  // add the callstack list
  const stackList = stackStrToStackArr((new Error()).stack)
  fErr = FE.setStack(stackList, fErr)

  // if no incomding message but notes are present,
  // use the first note as the message
  if (
    FE.doesNotHaveNonDefaultMessage(fErr) &&
    isNonEmptyArray(FE.getNotes(fErr))
  )
    fErr = FE.setMessage(head(FE.getNotes(fErr)), fErr)

  const externalExp = FE.getExternalExp(errInfo)
  if (externalExp)
    fErr = applyMessageFrom(externalExp, fErr)

  return fErr
}

// TODO: add tests
// return errInfo Objects with supplied values or defaults
export const makeFerrWithDefaults = (errInfo, errInfoDefaults) =>
  makeFerr({
    op: errInfo.op || errInfoDefaults.op,
    code: errInfo.code || errInfoDefaults.code,
    message: errInfo.message || errInfoDefaults.message,
    clientMsg: errInfo.clientMsg || errInfoDefaults.clientMsg,
    notes: errInfo.notes || errInfoDefaults.notes,
    externalExp: errInfo.externalExp || errInfoDefaults.externalExp,
  })


// Return an fErr derived from original fErr, with notes added
// '' | [''] -> fErr -> fErr
export const addNotes = curry((noteOrNoteList, fErr) => {
  const newNoteList = concat(FE.getNotesOrDef(fErr), flatArrayify(noteOrNoteList))
  return FE.setNotes(newNoteList, fErr)
})

export const addNotesFront = curry((noteOrNoteList, fErr) => {
  const newNoteList = concat(flatArrayify(noteOrNoteList), FE.getNotesOrDef(fErr))
  return FE.setNotes(newNoteList, fErr)
})

// Apply a message string or object to an existing fErr
// '' | { message } -> {fErr} -> {fErr}
const applyMessageFrom = curry((messageInfoOrStr, fErr) => {

  if (FE.isNotFerrOrString(fErr)) return fErr
  let fErrToReturn = makeFerr(fErr)

  const message = FE.extractMessage(messageInfoOrStr)
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

const fErrToMessageStr = ({ op = '', message = FE._defaultErrMsg }) =>
  `${op ? op+':: ' : ''}${message}`


const fErrToMsgList = (fErr, tabStr='') => {
  if (isNotObject(fErr)) return []

  if (isNotFerr(fErr)) {
    return fErr instanceof Error ?
      fErrToMsgList(makeFerr({ externalExp: fErr })) :
      fErrToMsgList(makeFerr(fErr))
  }

  const {
    clientMsg = '', code = '', notes = [], externalExp = null
  } = fErr

  const msgList = ['\nERROR encountered !!']
  msgList.push(tab(`Msg: ${fErrToMessageStr(fErr)}`))
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

// sets op for incoming fErr
// if incoming ferr has an op, that op is moved to notes
export const updateOp = (op, fErr) => {
  if (isNotFerr(fErr))
    return makeFerr({ op, externalExp: fErr })

  const outGoingFerr = FE.hasOp(fErr) ?
    addNotesFront(FE.getOp(fErr), fErr) : fErr

  return FE.setOp(op, outGoingFerr)
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

// throws toThrow if condition is true
export const throwIf = (condition, toThrow) => {
  if (condition) throw toThrow
}

// throws toThrow if condition is true,
// otherwise returns toPassThrough
export const throwIfOrPassthrough = curry((condition, toThrow, toPassThrough) => {
  if (condition) throw toThrow
  return toPassThrough
})

export const reThrowWithFerr = curry((existingFerr, incomingErrInfo) => {
  throw mergeErrInfo(makeFerr(existingFerr), incomingErrInfo)
})

export const reThrowWith = reThrowWithFerr
export const throwWith = reThrowWithFerr

export const reThrowWithNotes = curry((noteOrNoteList, err) => {
  if (isFerr(err))
    throw addNotes(flatArrayify(noteOrNoteList), err)

  // if err is not an fErr, treat it as external exception
  throw makeFerr({
    notes: noteOrNoteList,
    externalExp: err
  })
})

export const reThrowWithOp = curry((op, err) => {
  throw updateOp(op, err)
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
