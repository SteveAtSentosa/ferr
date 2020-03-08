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

export const testOp = 'orig-op'
export const testCode = 'orig-code'
export const testMsg = 'orig-msg'
export const testClientMsg = 'orig-client-msg'
export const testNotes = ['orig-note1', 'orig-note2']

export const testOpObj = { op: 'orig-op' }
export const testCodeObj = { code: 'orig-code' }
export const testMsgObj = { msg: 'orig-msg' }
export const testClientMsgObj = { clientMsg: 'orig-client-msg' }
export const testNotesObj = { notes: ['orig-note1', 'orig-note2'] }

export const incomingOp = 'incoming-op'
export const incomingCode = 'INCOMING_CODE'
export const incomingMsg = 'incoming-msg'
export const incomingClientMsg = 'incoming-client-msg'
export const incomingNotes = ['incoming-note1', 'incoming-note2']


export const incomingObjWithOp = { op: incomingOp }
export const incomingObjWithCode = { code: incomingCode }
export const incomingObjWithMsg = { msg: incomingMsg }
export const incomingObjWithClientMsg = { clientMsg: incomingClientMsg }
export const incomingObjWithNotes = { notes: incomingNotes }
export const incomingObjWithExternaExp = { externalExp }


export const incomingObjWithCodeAndOpAndMsg = {
  ...incomingObjWithCode, ...incomingObjWithOp, ...incomingObjWithMsg,
}

export const incomingObjWithAll = {
  ...incomingObjWithCode, ...incomingObjWithOp, ...incomingObjWithMsg,
  ...incomingObjWithClientMsg, ...incomingObjWithNotes, ...incomingObjWithExternaExp,
}

export const emptyOpObj = { op: '' }
export const emptyCodeObj = { code: '' }
export const emptyMsgObj = { msg: '' }
export const emptyClientMsgObj = { clientMsg: '' }
export const emptyNotesObj = { notes: [] }

export const fErrDefult = makeErr()
export const fErrWithOp = makeErr(testOpObj)
export const fErrWithCode = makeErr(testCodeObj)
export const fErrWithMsg = makeErr(testMsgObj)
export const fErrWithClientMsg = makeErr(testClientMsgObj)
export const fErrWithNotes = makeErr(testNotesObj)

export const fErrWithCodeAndOp = makeErr({ ...testCodeObj, ...testOpObj })
export const fErrWithCodeAndOpAndMsg = makeErr({ ...testCodeObj, ...testOpObj, ...testMsgObj })
