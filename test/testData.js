import { makeErr, testExports } from '../src/ferr'
const { _defaultErrMsg, _tagFErr } = testExports

// leaving off call stack matching on call stack is not practical
export const fErrDefaults = {
  _tag: _tagFErr,
  msg: _defaultErrMsg,
  op: '',
  code: '',
  clientMsg: '',
  notes: [],
  externalExp: null
}

let testExp
try { throw Error('external-exception') } catch (e) { testExp = e }
export const externalExp = testExp

export const testOp = 'test-op'
export const testCode = 'test-code'
export const testMsg = 'test-msg'
export const testClientMsg = 'test-client-msg'
export const testNotes = ['test-note1', 'test-note2']

export const errInfoWithOp = { op: testOp }
export const errInfoWithCode = { code: testCode }
export const errInfoWithMsg = { msg: testMsg }
export const errInfoWithClientMsg = { clientMsg: testClientMsg }
export const errInfoWithNotes = { notes: testNotes }
export const errInfoWithCodeAndOp = { ...errInfoWithCode, ...errInfoWithOp }
export const errInfoWithCodeAndOpAndMsg = { ...errInfoWithCodeAndOp, ...errInfoWithMsg }

export const incomingOp = 'incoming-op'
export const incomingCode = 'INCOMING_CODE'
export const incomingMsg = 'incoming-msg'
export const incomingClientMsg = 'incoming-client-msg'
export const incomingNotes = ['incoming-note1', 'incoming-note2']


export const incomingErrInfoWithOp = { op: incomingOp }
export const incomingErrInfoWithCode = { code: incomingCode }
export const incomingErrInfoWithMsg = { msg: incomingMsg }
export const incomingErrInfoWithClientMsg = { clientMsg: incomingClientMsg }
export const incomingErrInfoWithNotes = { notes: incomingNotes }
export const incomingErrInfoWithExternaExp = { externalExp }

export const incomingErrInfoWithCodeAndOpAndMsg = {
  ...incomingErrInfoWithCode, ...incomingErrInfoWithOp, ...incomingErrInfoWithMsg,
}

export const incomingErrInfoWithAll = {
  ...incomingErrInfoWithCode, ...incomingErrInfoWithOp, ...incomingErrInfoWithMsg,
  ...incomingErrInfoWithClientMsg, ...incomingErrInfoWithNotes, ...incomingErrInfoWithExternaExp,
}

export const emptyOpObj = { op: '' }
export const emptyCodeObj = { code: '' }
export const emptyMsgObj = { msg: '' }
export const emptyClientMsgObj = { clientMsg: '' }
export const emptyNotesObj = { notes: [] }

export const fErrDefult = makeErr()
export const fErrWithOp = makeErr(errInfoWithOp)
export const fErrWithCode = makeErr(errInfoWithCode)
export const fErrWithMsg = makeErr(errInfoWithMsg)
export const fErrWithClientMsg = makeErr(errInfoWithClientMsg)
export const fErrWithNotes = makeErr(errInfoWithNotes)

export const fErrWithCodeAndOp = makeErr(errInfoWithCodeAndOp)
export const fErrWithCodeAndOpAndMsg = makeErr(errInfoWithCodeAndOpAndMsg)
