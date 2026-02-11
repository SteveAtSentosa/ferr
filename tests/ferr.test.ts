import { omit, equals } from 'ramda'
import { describe, it, expect } from 'vitest'
import {
  addNotes, addNotesFront, makeFerr, makeFerrWithDefaults, throwFerr, throwFerrIf, throwErrIfOrRet,
  isFerr, isNotFerr, reThrowWithFerr, reThrowWithNotes, reThrowWithOp, updateOp,
  defaultErrMessage, appendErrInfo, updateErrInfo,
} from '../src/ferr'
import {
  hasOp,
  hasMessage, doesNotHaveMessage, getMessage, getMessageOrDef,
  hasDefaultMessage, doesNotHaveDefaultMessage, hasNonDefaultMessage,
  setMessage, extractMessage, getNotes,
  setStack, getStack, hasStack, doesNotHaveStack,
  _defaultErrMsg,
} from '../src/ferrAccess'

import {
  doesNotHave, stackStrToArr, stackArrToStr, arrayify, flatArrayify,
  isNonEmptyString, propIsNonEmptyString, isNonEmptyArray,
  propIsNonEmptyArray, propIsNotNil, isNotObjectOrNonEmptyString,
  retThrownErr, fPipe, reflect
} from '../src/utils'

import {
  testMsg, fErrWithMsg, errInfoWithCodeAndOpAndMsg, fErrWithCodeAndOp, fErrWithCodeAndOpAndMsg,
  fErrWithCode, fErrWithClientMsg, errInfoWithCode, fErrWithAll, errInfoWithCodeAndOp,
  fErrDefaults, fErrDefult, externalExp, errInfoWithOp, fErrWithOp, fErrWithMsgAndNotes, errInfoWithMsg,
  incomingErrInfoWithOp, incomingErrInfoWithCode, incomingErrInfoWithMsg, incomingErrInfoWithClientMsg,
  incomingErrInfoWithNotes, incomingErrInfoWithAll, incomingErrInfoWithExternaExp, incomingErrInfoWithMsgAndNotes,
  incomingErrInfoWithCodeAndOp, incomingErrInfoWithCodeAndOpAndMsg, errInfoWithNotes, fErrWithNotes
} from './testData'

const runFerrTests = () => {
  describe('server tests', () => {
    testUtils()
    testTypes()
    testAccess()
    testErrorCreation()
    testErrorCreationWithExternalExceptions()
    testErrorNotes()
    testErrorOp()
    testErrorAppend()
    testErrorUpdate()
    testErrorThrowing()
    testErrorPipelines()
  })
}

// we will skip stack comparisons
const omitStack = omit(['stack'])
const areEquivErrs = (fErr1, fErr2) => {
  const areEquiv = equals(omitStack(fErr1), omitStack(fErr2))
  // so that we can get a print out of the diff
  if (!areEquiv)
    expect(omitStack(fErr1)).to.deep.equal(omitStack(fErr2))
  return areEquiv
}

const testUtils = () => {
  it('should arrayify correctly', () => {
    expect(arrayify(['a'])).to.deep.equal(['a'])
    expect(arrayify('a')).to.deep.equal(['a'])
    expect(flatArrayify(['a'])).to.deep.equal(['a'])
    expect(flatArrayify('a')).to.deep.equal(['a'])
    expect(flatArrayify([['a']])).to.deep.equal(['a'])
  })

  it('should detect missing props correctly', () => {
    expect(doesNotHave('a', { a: 'a' })).to.be.false
    expect(doesNotHave('b', { a: 'a' })).to.be.true
  })

  it('should detect non empty strings correctly', () => {
    expect(isNonEmptyString('a')).to.be.true
    expect(isNonEmptyString('')).to.be.false
    expect(isNonEmptyString({})).to.be.false
    expect(isNonEmptyString([])).to.be.false
    expect(propIsNonEmptyString('a', { a: 'a' })).to.be.true
    expect(propIsNonEmptyString('a', { a: '' })).to.be.false
    expect(propIsNonEmptyString('b', { a: 'a' })).to.be.false
    expect(propIsNonEmptyString('a', { a: {} })).to.be.false
    expect(propIsNonEmptyString('a', { a: [] })).to.be.false
  })

  it('should detect non empty arrays correctly', () => {
    expect(isNonEmptyArray(['a'])).to.be.true
    expect(isNonEmptyArray([])).to.be.false
    expect(isNonEmptyArray({})).to.be.false
    expect(propIsNonEmptyArray('a', { a: ['a'] })).to.be.true
    expect(propIsNonEmptyArray('a', { a: [] })).to.be.false
    expect(propIsNonEmptyArray('a', { a: 'a' })).to.be.false
    expect(propIsNonEmptyArray('b', { a: ['a'] })).to.be.false
  })

  it('should detect non nill props correctly', () => {
    expect(propIsNotNil('a', { a: 'a' })).to.be.true
    expect(propIsNotNil('b', { a: 'a' })).to.be.false
    expect(propIsNotNil('a', { a: undefined })).to.be.false
    expect(propIsNotNil('a', { a: null })).to.be.false
  })

  it('should detect non object/strings correctly', () => {
    expect(isNotObjectOrNonEmptyString({})).to.be.false
    expect(isNotObjectOrNonEmptyString('abc')).to.be.false
    expect(isNotObjectOrNonEmptyString(1)).to.be.true
    expect(isNotObjectOrNonEmptyString('')).to.be.true
  })

  it('should handle stack conversions properly', () => {
    const errMsg = 'stack test msg'
    const testError = new Error(errMsg)
    const stackArr = stackStrToArr(testError.stack)
    const reconstructedStackStr = stackArrToStr(errMsg, stackArr)
    expect(reconstructedStackStr).to.equal(testError.stack)
  })
}

const testTypes = () => {
  it('should detect fErr types correctly', () => {
    expect(isFerr(makeFerr())).to.be.true
    expect(isFerr(makeFerr('dude'))).to.be.true
    expect(isFerr({ message: 'dude' })).to.be.false
    expect(isFerr('message')).to.be.false
    expect(isFerr(['message'])).to.be.false
    expect(isNotFerr(makeFerr())).to.be.false
    expect(isNotFerr(makeFerr('dude'))).to.be.false
    expect(isNotFerr({ message: 'dude' })).to.be.true
    expect(isNotFerr('message')).to.be.true
    expect(isNotFerr(['message'])).to.be.true
  })
}

const testAccess = () => {
  // TODO: build these tests out and include set and gets
  it('should access op prop correctly', () => {
    expect(hasOp(errInfoWithOp)).to.be.true
    expect(hasOp({})).to.be.false
  })

  it('should access message prop correctly', () => {

    try { throw new Error('exp msg') } catch (e) { expect(hasMessage(e)).to.be.true }
    expect(hasMessage({ message: 'string' })).to.be.true
    expect(hasMessage({ message: '' })).to.be.false
    expect(hasMessage({ message: ['non str msg'] })).to.be.false

    expect(doesNotHaveMessage({ message: 'string' })).to.be.false
    expect(doesNotHaveMessage({ message: '' })).to.be.true
    expect(doesNotHaveMessage({ message: ['non str msg'] })).to.be.true

    expect(getMessage({ message: 'message' })).to.equal('message')
    expect(getMessage({})).to.equal(undefined)
    expect(getMessage('abc')).to.equal(undefined)
    expect(getMessageOrDef({})).to.equal(defaultErrMessage())

    expect(setMessage('set msg', {})).to.deep.equal({ message: 'set msg' })
    expect(getMessage(setMessage('set msg', {}))).to.equal('set msg')
    expect(getMessageOrDef(setMessage('set msg', {}))).to.equal('set msg')

    expect(hasDefaultMessage({ message: _defaultErrMsg })).to.be.true
    expect(hasDefaultMessage(makeFerr())).to.be.true
    expect(hasDefaultMessage({ message: 'non default' })).to.be.false

    expect(doesNotHaveDefaultMessage({ message: _defaultErrMsg })).to.be.false
    expect(doesNotHaveDefaultMessage(makeFerr())).to.be.false
    expect(doesNotHaveDefaultMessage({ message: 'non default' })).to.be.true

    expect(hasNonDefaultMessage({ message: 'non default msg' })).to.be.true
    expect(hasNonDefaultMessage({ message: _defaultErrMsg })).to.be.false
    expect(hasNonDefaultMessage({ message: '' })).to.be.false
    expect(hasNonDefaultMessage({  })).to.be.false
  })

  it('should extract a message correctly', () => {
    try { throw new Error('exp msg') } catch (e) { expect(extractMessage(e)).to.equal('exp msg') }
    expect(extractMessage({ message: 'str msg' })).to.equal('str msg')
    expect(extractMessage('obj msg')).to.equal('obj msg')
    expect(extractMessage()).to.be.null
    expect(extractMessage({})).to.be.null
    expect(extractMessage({ random: 'prop' })).to.be.null
  })

  it('should access stack correctly', () => {
    let stack = {}
    expect(hasStack(stack)).to.be.false
    expect(doesNotHaveStack(stack)).to.be.true
    stack = setStack(['some call stack'], stack)
    expect(hasStack(stack)).to.be.true
    expect(doesNotHaveStack(stack)).to.be.false
    expect(getStack(stack)).to.be.deep.equal(['some call stack'])
  })
}

const testErrorCreation = () =>
  it('should make errors correctly', () => {

    // test no error info given
    const fErrNoInfo = makeFerr()
    expect(fErrNoInfo.stack).to.be.an.instanceof(Array)
    expect(areEquivErrs(fErrNoInfo, fErrDefaults)).to.be.true

    // test only string given
    const fErrFromString = makeFerr('test-error')
    expect(fErrFromString.stack).to.be.an.instanceof(Array)
    expect(areEquivErrs(fErrFromString, setMessage('test-error', fErrDefaults))).to.be.true

    // test partial error info given
    const partialErrInfo = { op: 'partial-op', message: 'partial-msg', externalExp, }
    const fErrFromPartialInfo = makeFerr(partialErrInfo)
    expect(fErrFromPartialInfo.stack).to.be.an.instanceof(Array)

    expect(areEquivErrs(fErrFromPartialInfo, {
      ...fErrDefaults,
      ...partialErrInfo,
      notes: ['external-exception']
    })).to.be.true

    // test full error info given
    const fullErrInfo = {
      op: 'full-op', code: 'full-code', message: 'full-msg',
      clientMsg: 'full-client-msg', notes: ['some', 'note'], externalExp
    }
    const fErrFromFullInfo = makeFerr(fullErrInfo)
    expect(fErrFromFullInfo.stack).to.be.an.instanceof(Array)
    expect(areEquivErrs(fErrFromFullInfo, {
      ...fErrDefaults,
      ...fullErrInfo,
      notes: ['some', 'note', 'external-exception']
    })).to.be.true

    // check that if an fErr is provided it is simply returned
    expect(areEquivErrs(fErrFromPartialInfo, fErrFromPartialInfo)).to.be.true
    expect(areEquivErrs(fErrFromFullInfo, fErrFromFullInfo)).to.be.true

    // test using notes as message when not present
    expect(areEquivErrs(
      makeFerr(errInfoWithNotes),
      { ...fErrWithNotes, message: errInfoWithNotes.notes[0] }
    )).to.be.true
    expect(areEquivErrs(
      makeFerr(incomingErrInfoWithMsgAndNotes),
      fErrWithMsgAndNotes
    )).to.be.true

    const fallbackDefaults = {
      op: 'default-op',
      code: 'default-code',
      message: 'default-message',
      clientMsg: 'default-client-msg',
      notes: ['default-note'],
      externalExp: null
    }

    expect(areEquivErrs(
      makeFerrWithDefaults(undefined, fallbackDefaults),
      makeFerr(fallbackDefaults)
    )).to.be.true

    expect(areEquivErrs(
      makeFerrWithDefaults(null, fallbackDefaults),
      makeFerr(fallbackDefaults)
    )).to.be.true
  })

const testErrorCreationWithExternalExceptions = () => {
  it('should make handle external exception objects correctly', async () => {
    let fErr
    fErr = makeFerr({ externalExp: new Error('Error obj exp') })
    expect(getMessage(fErr)).to.equal('Error obj exp')
    expect(getNotes(fErr)).to.deep.equal([])

    fErr = makeFerr({  message: 'message', externalExp: new Error('Error obj exp') })
    expect(getMessage(fErr)).to.equal('message')
    expect(getNotes(fErr)).to.deep.equal(['Error obj exp'])

    fErr = makeFerr({ externalExp: { message: 'Object w message exp' } })
    expect(getMessage(fErr)).to.equal('Object w message exp')
    expect(getNotes(fErr)).to.deep.equal([])

    fErr = makeFerr({ message: 'message', externalExp: { message: 'Object w message exp' } })
    expect(getMessage(fErr)).to.equal('message')
    expect(getNotes(fErr)).to.deep.equal(['Object w message exp'])
  })

  it('should make handle external exception strings correctly', async () => {
    let fErr
    fErr = makeFerr({ externalExp: 'string exp' })
    expect(getMessage(fErr)).to.equal('string exp')
    expect(getNotes(fErr)).to.deep.equal([])

    fErr = makeFerr({ message: 'message', externalExp: 'string exp' })
    expect(getMessage(fErr)).to.equal('message')
    expect(getNotes(fErr)).to.deep.equal(['string exp'])
  })

  it.skip('should incmoing external exceptions correcty', async () => {
  })
}

const testErrorNotes = () => {
  it('should handle error notes correcly', async () => {
    const message = 'notes-msg'

    // test default to empty notes list
    expect(makeFerr({ message }).notes).to.deep.equal([])
    expect(areEquivErrs(
      makeFerr({ message }),
      { ...fErrDefaults, message }
    )).to.be.true

    // test note list provided at err creation

    const notes = ['a', 'b']
    expect(makeFerr({ message, notes }).notes).to.deep.equal(notes)
    expect(areEquivErrs(
      makeFerr({ message, notes }),
      { ...fErrDefaults, message, notes }
    )).to.be.true

    // test single note add

    const addedNote = 'c'
    const fErrWithOrigNotes = makeFerr({ message, notes })
    expect(areEquivErrs(
      makeFerr(fErrWithOrigNotes),
      { ...fErrDefaults, message, notes }
    )).to.be.true

    const fErrWithAddedNote = addNotes(addedNote, fErrWithOrigNotes)
    expect(areEquivErrs(
      fErrWithAddedNote,
      { ...fErrDefaults, message, notes: [...notes, addedNote] }
    )).to.be.true

    const fErrWithAddedNoteFront = addNotesFront(addedNote, fErrWithOrigNotes)
    expect(areEquivErrs(
      fErrWithAddedNoteFront,
      { ...fErrDefaults, message, notes: [addedNote, ...notes] }
    )).to.be.true

    expect(areEquivErrs(
      fErrWithOrigNotes,
      { ...fErrDefaults, message, notes }
    )).to.be.true // non-mutation check

    // test multiple note add

    const addedNotes = ['x', 'y', 'z']
    const fErrWithAddedNoteList = addNotes(addedNotes, fErrWithOrigNotes)
    expect(areEquivErrs(
      fErrWithAddedNoteList,
      { ...fErrDefaults, message, notes: [...notes, ...addedNotes] }
    )).to.be.true

    const fErrWithAddedNoteListFront = addNotesFront(addedNotes, fErrWithOrigNotes)
    expect(areEquivErrs(
      fErrWithAddedNoteListFront,
      { ...fErrDefaults, message, notes: [...addedNotes, ...notes] }
    )).to.be.true

    expect(areEquivErrs(
      fErrWithOrigNotes,
      { ...fErrDefaults, message, notes }
    )).to.be.true // non-mutation check
  })
}

const testErrorOp = () => {
  it('should handle error operation changes correcly', async () => {
    const op = 'updated-op'
    expect(areEquivErrs(
      updateOp(op, fErrWithAll),
      { ...fErrWithAll, op, notes: [fErrWithAll.op, ...fErrWithAll.notes] }
    )).to.be.true

    // incmoing error not fErr
    expect(areEquivErrs(
      updateOp(op, externalExp),
      makeFerr({ op, externalExp })
    )).to.be.true
  })
}

const testErrorAppend = () => {
  it('should copy over non-existant props for append', async () => {
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithOp)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithOp
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithCode)).to.deep.equal({
      ...fErrDefult, ...incomingErrInfoWithCode
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithMsg)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithMsg
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithClientMsg)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithClientMsg
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithNotes)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithNotes,
      message: incomingErrInfoWithNotes.notes[0]
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithExternaExp)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithExternaExp,
      message: incomingErrInfoWithExternaExp.externalExp.message
    })
    expect(appendErrInfo(fErrDefult, incomingErrInfoWithAll)).to.deep.equal({
      ...fErrDefult,
      ...incomingErrInfoWithAll,
      notes: [
        ...incomingErrInfoWithAll.notes,
        incomingErrInfoWithAll.externalExp.message
      ]
    })
    // test with msg string input
    expect(appendErrInfo(fErrDefult, 'string-only-msg')).to.deep.equal({
      ...fErrDefult,
      message: 'string-only-msg'
    })
  })

  it('should append existing props to message/notes', async () => {
    let opStr = `Op: ${incomingErrInfoWithOp.op}`
    expect(areEquivErrs(
      appendErrInfo(fErrWithOp, incomingErrInfoWithOp),
      { ...fErrWithOp, notes: [opStr] }
    )).to.be.true

    let codeStr = `Code: ${incomingErrInfoWithCode.code}`
    expect(areEquivErrs(
      appendErrInfo(fErrWithCode, incomingErrInfoWithCode),
      { ...fErrWithCode, notes: [`Code: ${incomingErrInfoWithCode.code}`] }
    )).to.be.true

    const clientMsgStr = incomingErrInfoWithClientMsg.clientMsg
    expect(areEquivErrs(
      appendErrInfo(fErrWithClientMsg, incomingErrInfoWithClientMsg),
      { ...fErrWithClientMsg, notes: [clientMsgStr] }
    )).to.be.true

    codeStr = `Code: ${incomingErrInfoWithCodeAndOp.code}, `
    opStr = `Op: ${incomingErrInfoWithCodeAndOp.op}`
    expect(areEquivErrs(
      appendErrInfo(fErrWithCodeAndOp, incomingErrInfoWithCodeAndOp),
      { ...fErrWithCodeAndOp, notes: [codeStr + opStr] }
    )).to.be.true

    codeStr = `Code: ${incomingErrInfoWithCodeAndOpAndMsg.code}, `
    opStr = `Op: ${incomingErrInfoWithCodeAndOpAndMsg.op}: `
    let msgStr = incomingErrInfoWithCodeAndOpAndMsg.message
    expect(areEquivErrs(
      appendErrInfo(fErrWithCodeAndOpAndMsg, incomingErrInfoWithCodeAndOpAndMsg),
      { ...fErrWithCodeAndOpAndMsg, notes: [codeStr + opStr + msgStr] }
    )).to.be.true

    expect(areEquivErrs(
      appendErrInfo(fErrWithCodeAndOp, incomingErrInfoWithMsg),
      { ...fErrWithCodeAndOpAndMsg, ...incomingErrInfoWithMsg }
    )).to.be.true

    codeStr = `Code: ${incomingErrInfoWithCodeAndOpAndMsg.code}, `
    opStr = `Op: ${incomingErrInfoWithCodeAndOpAndMsg.op}: `
    msgStr = incomingErrInfoWithCodeAndOpAndMsg.message
    expect(areEquivErrs(
      appendErrInfo(fErrWithCodeAndOp, incomingErrInfoWithCodeAndOpAndMsg),
      {
        ...fErrWithCodeAndOpAndMsg,
        message: codeStr + opStr + msgStr,
      }
    )).to.be.true
  })
}


const testErrorUpdate = () => {
  it('should copy over non-existant props for update', async () => {

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithOp),
      { ...fErrDefult, ...incomingErrInfoWithOp }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithCode),
      { ...fErrDefult, ...incomingErrInfoWithCode }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithMsg),
      {  ...fErrDefult,  ...incomingErrInfoWithMsg }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithClientMsg),
      { ...fErrDefult, ...incomingErrInfoWithClientMsg }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithNotes), {
        ...fErrDefult,
        ...incomingErrInfoWithNotes,
        message: incomingErrInfoWithNotes.notes[0],
      }
    )).to.be.true

    const newProps = { ...errInfoWithCodeAndOp, externalExp }
    const res = makeFerr(newProps)
    const res2 = updateErrInfo(errInfoWithCodeAndOp, externalExp)
    // console.log('res: ', res)
    // console.log('res2: ', res2)

    expect(areEquivErrs(res, res2)).to.be.true

    expect(areEquivErrs(
      updateErrInfo(errInfoWithCodeAndOp, externalExp),
      { ...makeFerr(newProps) }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithExternaExp), {
        ...fErrDefult,
        ...incomingErrInfoWithExternaExp,
        message: incomingErrInfoWithExternaExp.externalExp.message
      }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, incomingErrInfoWithAll), {
        ...fErrDefult,
        ...incomingErrInfoWithAll,
        notes: [
          ...incomingErrInfoWithAll.notes,
          incomingErrInfoWithAll.externalExp.message
        ]
      }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrDefult, 'string-only-msg'),
      { ...fErrDefult, message: 'string-only-msg' }
    )).to.be.true
  })

  it('should merge existing props to message/notes', async () => {
    const newOp = { op: 'new-op' }
    const oldOpStr = `Op: ${fErrWithOp.op}`
    expect(areEquivErrs(
      updateErrInfo(fErrWithOp, newOp),
      { ...makeFerr(newOp), notes: [oldOpStr] }
    )).to.be.true

    const newCode = { code: 'new-code' }
    const oldCodeStr = `Code: ${fErrWithCode.code}`
    expect(areEquivErrs(
      updateErrInfo(fErrWithCode, newCode),
      { ...makeFerr(newCode), notes: [oldCodeStr] }
    )).to.be.true

    const newMsg = { message: 'new-message' }
    const oldMsgStr = fErrWithMsg.message
    expect(areEquivErrs(
      updateErrInfo(fErrWithMsg, newMsg),
      { ...makeFerr(newMsg), notes: [oldMsgStr] }
    )).to.be.true

    const newClientMsg = { clientMsg: 'new-client-msg' }
    const oldClientMsgStr = fErrWithClientMsg.clientMsg
    expect(areEquivErrs(
      updateErrInfo(fErrWithClientMsg, newClientMsg),
      { ...makeFerr(newClientMsg), notes: [oldClientMsgStr] }
    )).to.be.true

    const newOpAndCode = { ...newOp, ...newCode }
    const oldCodeAndOpStr = `${oldCodeStr}, ${oldOpStr}`
    expect(areEquivErrs(
      updateErrInfo(fErrWithCodeAndOp, newOpAndCode),
      { ...makeFerr(newOpAndCode), notes: [oldCodeAndOpStr] }
    )).to.be.true

    const newOpAndCodeAndMsg =  { ...newOp, ...newCode, ...newMsg }
    const oldCodeAndOpAndMsgStr = `${oldCodeStr}, ${oldOpStr}: ${oldMsgStr}`
    expect(areEquivErrs(
      updateErrInfo(fErrWithCodeAndOpAndMsg, newOpAndCodeAndMsg),
      { ...makeFerr(newOpAndCodeAndMsg), notes: [oldCodeAndOpAndMsgStr] }
    )).to.be.true

    expect(areEquivErrs(
      updateErrInfo(fErrWithCodeAndOp, newMsg),
      { ...makeFerr({ ...errInfoWithCodeAndOp, ...newMsg }) }
    )).to.be.true

    // codeStr = `Code: ${incomingErrInfoWithCodeAndOpAndMsg.code}, `
    // opStr = `Op: ${incomingErrInfoWithCodeAndOpAndMsg.op}: `
    // msgStr = incomingErrInfoWithCodeAndOpAndMsg.message
    expect(areEquivErrs(
      updateErrInfo(fErrWithCodeAndOp, newOpAndCodeAndMsg),
      {
        ...makeFerr(newOpAndCodeAndMsg),
        notes: [`${oldCodeStr}, ${oldOpStr}`]
      }
    )).to.be.true
  })
}

const testErrorThrowing = () => {
  it('should throw errors correctly', async () => {
    expect(areEquivErrs(retThrownErr(throwFerr, testMsg), fErrWithMsg)).to.be.true
    expect(areEquivErrs(
      retThrownErr(throwFerr, errInfoWithCodeAndOpAndMsg),
      fErrWithCodeAndOpAndMsg
    )).to.be.true
  })

  it('should conditionally throw errors correctly', async () => {
    expect(areEquivErrs(retThrownErr(throwFerrIf, true, fErrWithCodeAndOp), fErrWithCodeAndOp)).to.be.true
    expect(areEquivErrs(retThrownErr(throwFerrIf, 10 > 1, {}), fErrDefult)).to.be.true
    expect(retThrownErr(throwFerrIf, false, fErrWithCodeAndOp), fErrWithCodeAndOp).to.be.null
    expect(retThrownErr(throwFerrIf, 10 < 1, {}), fErrDefult).to.be.null
  })

  it('should conditionally throw errors or return specified value', async () => {
    expect(areEquivErrs(
      retThrownErr(throwErrIfOrRet, 'should-not-be-returned', true, fErrWithCodeAndOp),
      fErrWithCodeAndOp
    )).to.be.true

    expect(areEquivErrs(
      retThrownErr(throwErrIfOrRet, 'should-not-be-returned', 10 > 1, {}),
      fErrDefult
    )).to.be.true

    // not sure why I created throwErrIfOrRet
    expect(throwErrIfOrRet('should-be-returned', false, fErrWithCodeAndOp)).to.equal('should-be-returned')
    expect(throwErrIfOrRet('should-be-returned-also', 10 < 1, fErrWithCodeAndOp)).to.equal('should-be-returned-also')
  })

  it('should rethrow with notes correctly', async () => {
    expect(areEquivErrs(
      retThrownErr(reThrowWithNotes, ['note added on throw'], fErrWithCodeAndOpAndMsg),
      { ...fErrWithCodeAndOpAndMsg, notes: ['note added on throw'] }
    )).to.be.true
    expect(areEquivErrs(
      retThrownErr(reThrowWithNotes, ['t1', 't2'], fErrWithMsgAndNotes),
      { ...fErrWithMsgAndNotes, notes: [...fErrWithMsgAndNotes.notes, 't1', 't2'] }
    )).to.be.true
    expect(areEquivErrs(
      retThrownErr(reThrowWithNotes, 't3', fErrWithMsgAndNotes),
      { ...fErrWithMsgAndNotes, notes: [...fErrWithMsgAndNotes.notes, 't3'] }
    )).to.be.true
    expect(areEquivErrs(
      retThrownErr(reThrowWithNotes, ['this aint good'], externalExp),
      makeFerr({ message: 'this aint good', notes: ['this aint good'], externalExp })
    )).to.be.true
    expect(areEquivErrs(
      retThrownErr(reThrowWithNotes, 'I mean its really bad', externalExp),
      makeFerr({ message: 'I mean its really bad', notes: ['I mean its really bad'], externalExp })
    )).to.be.true
  })
  it('should rethrow with op correctly', async () => {
    const op = 'thrown-op'
    expect(areEquivErrs(
      retThrownErr(reThrowWithOp, op, fErrWithOp),
      { ...fErrWithOp, op, notes: [fErrWithOp.op, ...fErrWithOp.notes] }
    )).to.be.true
    expect(areEquivErrs(
      retThrownErr(reThrowWithOp, op, externalExp),
      makeFerr({ op, externalExp })
    )).to.be.true

  })
}

const testErrorPipelines = () => {
  it('should rethrow in pipelines correctly', async () => {
    expect(await fPipe(reflect, reflect)(1).catch(reflect)).to.equal(1)

    expect(areEquivErrs(
      await fPipe(
        reflect,
        () => throwFerr(errInfoWithCodeAndOpAndMsg)
      )()
        .catch(reflect),
      fErrWithCodeAndOpAndMsg)).to.be.true

    const ferr1 = await fPipe(
      reflect,
      () => { throw externalExp },
      reflect,
    )()
      .catch(reThrowWithFerr(errInfoWithCode))
      .catch(reThrowWithFerr(errInfoWithOp))
      .catch(reThrowWithFerr(errInfoWithMsg))
      .catch(reflect)
    expect(areEquivErrs(
      ferr1,
      { ...fErrWithCodeAndOpAndMsg, notes: [externalExp.message], externalExp }
    )).to.be.true
  })
}



runFerrTests()
