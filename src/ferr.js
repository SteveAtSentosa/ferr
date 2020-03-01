import { concat, curry, propOr, prop, propEq, propSatisfies, complement, omit, has } from 'ramda'
import { isObject, isString, isNotNil, isNilOrEmpty, isNotNilOrEmpty, isNotObject, isNotString } from 'ramda-adjunct'
import { flatArrayify, stackStrToArr, tab, msgListToStr, propIsNilOrEmpty, propIsNotNilOrEmpty } from './utils'

const _tag = '@@ferr'
const _defaultErrMsg = 'unkown error'

const isErrInfo = toCheck =>
  isObject(toCheck) && isString(propOr(null, 'msg', toCheck))

const isFerr = toCheck => isObject(toCheck) && propEq('_tag', _tag, toCheck)
const isNotFerr = complement(isFerr)

// Building upon Error class to take advantage of automatic stack generation,
// and because some 3rd party libraries (i.e Jest) assume exceptions are of type Error
// This is the only place in the code where we do any OO like stuff
//

// TODO: add ability to construct from errInfo or fErr
// esp fErr, cause would be nice to be able to return new fErr based on old rather thatn mutating
class FErr extends Error {
  constructor(message) {
    const msg = message || _defaultErrMsg
    super(msg)
    this._tag = _tag
    this.msg = msg
    this.op = ''
    this.code = ''
    this.clientMsg = ''
    this.notes = []
    this.callStack = []
    this.externalExp = null
  }
}

//
// return an Error object given with the additional props in errInfo added, and message set to msg
// errInfo {
//   op: 'operation'
//   code: 'error code string'
//   msg: 'error message'
//   clientMsg: 'message for clients to display'
//   notes: ['notes', 'about', 'the', 'error']
// }
// if isString(errInfo), then errInfo is assumed to be 'msg' (i.e. an error message)
// {} | '' => FErr
//
export const makeErr = (errInfo = {})  => {
  const msg =
    isString(errInfo) ? errInfo :
    propSatisfies(isString, 'msg', errInfo) ? errInfo.msg : _defaultErrMsg

  const fErr = new FErr(msg)
  fErr.msg = msg
  fErr.callStack = stackStrToArr(fErr.stack)
  if (isErrInfo(errInfo)) {
    fErr.op = propOr('', 'op', errInfo)
    fErr.code = propOr('', 'code', errInfo)
    fErr.clientMsg = propOr('', 'clientMsg', errInfo)
    fErr.notes = propOr([], 'notes', errInfo)
    fErr.externalExp = propOr(null, 'externalExp', errInfo)
  }
  return fErr
}

//
// Add a single note, or list of notes to an fErr
// Return the original fErr object
// '' | [''] -> fErr -> fErr
//
export const addNote = curry((noteOrNoteList, fErr) => {
  fErr.notes = concat(fErr.notes, flatArrayify(noteOrNoteList))
  return fErr
})

export const throwErr = errInfo => { throw makeErr(errInfo) }

export const throwErrIf = (condition, errInfo) => {
  if (condition) throwErr(errInfo)
}

const msgIsEmptyOrDefault = fErrOrErrInfo => {
  if (isNotObject(fErrOrErrInfo)) return true
  const msg = propOr(null, 'msg', fErrOrErrInfo)
  return isNotString(msg) || msg.length === 0 || msg === _defaultErrMsg
}

const msgIsNotEmptyOrDefault = complement(msgIsEmptyOrDefault)

// TODO: make this non mutating (need to figure out how to cloine classes)
// given an existing error, and info about a new error,
// return an error that reasonably merged information from both
// ({fErr}, {errInfo}) -> {fErr}
const mergeErrorInfo = (existingErr, newErrInfo) => {
  if (isNotFerr(existingErr)) return makeErr(newErrInfo)
  if (isNotObject(newErrInfo)) return existingErr

  let errInfoForNotes = newErrInfo

  if (msgIsEmptyOrDefault(existingErr) && msgIsNotEmptyOrDefault(newErrInfo)) {
    existingErr.msg = prop('msg', newErrInfo)
    errInfoForNotes = omit('msg', errInfoForNotes)
  }

  // TODO: write a transferPropIfNeeded, which returns new resulting objects w/o mutating original
  if (propIsNilOrEmpty('op', existingErr) && propIsNotNilOrEmpty('op', newErrInfo)) {
    existingErr.msg = prop('op', newErrInfo)
    errInfoForNotes = omit('op', errInfoForNotes)
  }

  if (propIsNilOrEmpty('clientMsg', existingErr) && propIsNotNilOrEmpty('clientMsg', newErrInfo)) {
    existingErr.msg = prop('clientMsg', newErrInfo)
    errInfoForNotes = omit('clientMsg', errInfoForNotes)
  }

  return addNote(fErrToMsgList(errInfoForNotes, '    '))
}


export const throwWith = (existingErr, newErrInfo) => {
  // if (isNotFerr(existingErr)) return makeErr

  /*

  If existingErr.msg == default && newErrorInfo.msg != Nill && != defaul: existingErr.msg = newErrInfo.msg

  */


  //   op: 'operation'
  //   code: 'error code string'
  //   msg: 'error message'
  //   clientMsg: 'message for clients to display'
  //   notes: ['notes', 'about', 'the', 'error']

  // if exsiting error was externally generated, make new fErr which includes it
  if (isNotFerr(existingErr) && propSatisfies(isNotNil, 'externalExp', newErrInfo)) {
    throwErr({ ...newErrInfo, externalExp: existingErr })

  // ifexistingErr is an fErr, then add new error info as a note
  } else {
    // addNote
  }

  /*
  if exiting error is not FERR
    create a new FErr, and pass in existin error
  else
    construct string from newErrorInfo, and add as a note to incoming fErr
  */


}


// also takes errInfo
// TODO: think about a way for fErr and errInfo to be somewhat interchangable?
const fErrToMsgList = (fErr, tabStr='') => {
  if (isNotObject(fErr)) return []
  const {
    op = '',  msg = _defaultErrMsg, clientMsg = '', code = '', notes = [],  externalExp = null
  } = fErr

  const msgList = ['\nERROR encountered!']
  msgList.push(tab(`Msg: ${op ? op+': ' : ''}${msg}`))
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

// functions that we want to expose to testing, but not to end clients
export const testExports = {
  _defaultErrMsg,
  FErr,
  isErrInfo,
  msgIsEmptyOrDefault,
  msgIsNotEmptyOrDefault,
  fErrToMsgList,
  mergeErrorInfo
}
