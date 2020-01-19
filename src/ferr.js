import { concat, curry, propOr, propSatisfies } from  'ramda'
import { isObject, isString } from 'ramda-adjunct'
import { flatArrayify } from './utils'

const _tag = '@@ferr'

const isErrInfo = toCheck =>
  isObject(toCheck) && isString(propOr(null, 'msg', toCheck))

// Building upon Error class to take advantage of automatic stack generation,
// and because some 3rd party libraries (i.e Jest) assume exceptions are of type Error
// This is the only place in the code where we do any OO like stuff

class FErr extends Error {
  constructor(message) {
    super(message)
    this._tag = _tag,
    this.msg = 'unkown err'
    this.op = ''
    this.code = ''
    this.clientMsg = ''
    this.notes = [],
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

export const makeErr = errInfo => {
  const msg =
    isString(errInfo) ? errInfo :
    propSatisfies(isString, 'msg', errInfo) ? errInfo.msg : 'unkown err'

  const fErr = new FErr(msg)
  fErr.msg = msg
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

// functions that we want to expose to testing, but not to end clients
export const testExports = {
  FErr,
  isErrInfo
}



