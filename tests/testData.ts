import { makeFerr, testExports } from '../src/ferr-depracated'
const { _defaultErrMsg } = testExports

// leaving off call stack (matching on call stack is not practical)
// matches defaults created by makeErr
export const fErrDefaults = {
  _tag: '@@ferr',
  name: 'FErr',
  op: '',
  code: '',
  message: _defaultErrMsg,
  clientMsg: '',
  context: null,
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
export const errInfoWithMsg = { message: testMsg }
export const errInfoWithClientMsg = { clientMsg: testClientMsg }
export const errInfoWithNotes = { notes: testNotes }
export const errInfoWithCodeAndOp = { ...errInfoWithCode, ...errInfoWithOp }
export const errInfoWithCodeAndOpAndMsg = { ...errInfoWithCodeAndOp, ...errInfoWithMsg }

export const incomingOp = 'incoming-op'
export const incomingCode = 'incoming-code'
export const incomingMsg = 'incoming-msg'
export const incomingClientMsg = 'incoming-client-msg'
export const incomingNotes = ['incoming-note1', 'incoming-note2']

export const incomingErrInfoWithOp = { op: incomingOp }
export const incomingErrInfoWithCode = { code: incomingCode }
export const incomingErrInfoWithMsg = { message: incomingMsg }
export const incomingErrInfoWithClientMsg = { clientMsg: incomingClientMsg }
export const incomingErrInfoWithNotes = { notes: incomingNotes }
export const incomingErrInfoWithExternaExp = { externalExp }


export const incomingErrInfoWithCodeAndOp = {
  ...incomingErrInfoWithCode, ...incomingErrInfoWithOp,
}

export const incomingErrInfoWithCodeAndOpAndMsg = {
  ...incomingErrInfoWithCode, ...incomingErrInfoWithOp, ...incomingErrInfoWithMsg,
}

export const incomingErrInfoWithMsgAndNotes = {
  ...incomingErrInfoWithMsg, ...incomingErrInfoWithNotes
}

export const incomingErrInfoWithAll = {
  ...incomingErrInfoWithCode, ...incomingErrInfoWithOp,
  ...incomingErrInfoWithMsg, ...incomingErrInfoWithClientMsg,
  ...incomingErrInfoWithNotes, ...incomingErrInfoWithExternaExp,
}

export const emptyOpObj = { op: '' }
export const emptyCodeObj = { code: '' }
export const emptyMsgObj = { message: '' }
export const emptyClientMsgObj = { clientMsg: '' }
export const emptyNotesObj = { notes: [] }

export const fErrDefult = makeFerr()
export const fErrWithOp = makeFerr(errInfoWithOp)
export const fErrWithCode = makeFerr(errInfoWithCode)
export const fErrWithMsg = makeFerr(errInfoWithMsg)
export const fErrWithClientMsg = makeFerr(errInfoWithClientMsg)
export const fErrWithNotes = makeFerr(errInfoWithNotes)

export const fErrWithCodeAndOp = makeFerr(errInfoWithCodeAndOp)
export const fErrWithCodeAndOpAndMsg = makeFerr(errInfoWithCodeAndOpAndMsg)
export const fErrWithMsgAndNotes = makeFerr(incomingErrInfoWithMsgAndNotes)
export const fErrWithAll = makeFerr(incomingErrInfoWithAll)
