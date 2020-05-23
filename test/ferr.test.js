import { omit, equals } from 'ramda'
import { expect } from 'chai'
import { addNote, makeErr, throwErr, throwErrIf, throwErrIfOrRet, testExports } from '../src/ferr'
import { isFerr, isNotFerr, hasOp } from '../src/ferrAccess'

import {
  doesNotHave, stackStrToArr, stackArrToStr, arrayify, flatArrayify,
  isNonEmptyString, propIsNonEmptyString, isNonEmptyArray,
  propIsNonEmptyArray, propIsNotNil, isNotObjectOrNonEmptyString,
  retThrownErr
} from '../src/utils'

import {
  testMsg, fErrWithMsg, errInfoWithCodeAndOpAndMsg, fErrWithCodeAndOp, fErrWithCodeAndOpAndMsg,
  fErrDefaults, fErrDefult, externalExp, errInfoWithOp,
  incomingErrInfoWithOp, incomingErrInfoWithCode, incomingErrInfoWithMsg, incomingErrInfoWithClientMsg,
  incomingErrInfoWithNotes, incomingErrInfoWithAll, incomingErrInfoWithExternaExp
} from './testData'

const { mergeErrInfo } = testExports

// TODO
// * convert all tests over to areEquivErrs()

const runFerrTests = () => {
  describe('server tests', () => {
    testUtils()
    testTypes()
    testAccess()
    testErrorCreation()
    testErrorNotes()
    testErrorMerging()
    testErrorThrowing()
  })
}

// we will skip stack comparisons
const omitCallStack = omit(['callStack'])
const areEquivErrs = (fErr1, fErr2) => equals(omitCallStack(fErr1), omitCallStack(fErr2))

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
    expect(isFerr(makeErr())).to.be.true
    expect(isFerr(makeErr('dude'))).to.be.true
    expect(isFerr({ msg: 'dude' })).to.be.false
    expect(isFerr('msg')).to.be.false
    expect(isFerr(['msg'])).to.be.false
    expect(isNotFerr(makeErr())).to.be.false
    expect(isNotFerr(makeErr('dude'))).to.be.false
    expect(isNotFerr({ msg: 'dude' })).to.be.true
    expect(isNotFerr('msg')).to.be.true
    expect(isNotFerr(['msg'])).to.be.true
  })
}

const testAccess = () => {
  it('should access fErr props correctly', () => {
    // TODO: build these tests out
    expect(hasOp(errInfoWithOp)).to.be.true
    expect(hasOp({})).to.be.false
  })
}


const testErrorCreation = () =>
  it('should make errors correctly', async () => {

    // test no error info given
    const fErrNoInfo = makeErr()
    expect(fErrNoInfo.callStack).to.be.an.instanceof(Array)
    expect(omitCallStack(fErrNoInfo)).to.deep.equal(fErrDefaults)

    // test only string given
    const fErrFromString = makeErr('test-error')
    expect(fErrFromString.callStack).to.be.an.instanceof(Array)
    expect(omitCallStack(fErrFromString)).to.deep.equal({ ...fErrDefaults, msg: 'test-error' })

    // test partial error info given
    const partialErrInfo = { op: 'partial-op', msg: 'partial-msg', externalExp, }
    const fErrFromPartialInfo = makeErr(partialErrInfo)
    expect(fErrFromPartialInfo.callStack).to.be.an.instanceof(Array)
    expect(omitCallStack(fErrFromPartialInfo)).to.to.deep.equal({ ...fErrDefaults, ...partialErrInfo })

    // test full error info given
    const fullErrInfo = { op: 'full-op', code: 'full-code', msg: 'full-msg', clientMsg: 'full-client-msg', notes: ['some', 'note'], externalExp }
    const fErrFromFullInfo = makeErr(fullErrInfo)
    expect(fErrFromFullInfo.callStack).to.be.an.instanceof(Array)
    expect(omitCallStack(fErrFromFullInfo)).to.to.deep.equal({ ...fErrDefaults, ...fullErrInfo })
  })

const testErrorNotes = () => {
  it('should handle error notes correcly', async () => {
    const msg = 'notes-msg'

    // test default to empty notes list
    expect(makeErr({ msg }).notes).to.deep.equal([])
    expect(omitCallStack(makeErr({ msg }))).to.deep.equal({ ...fErrDefaults, msg })

    // test note list provided at err creation
    const notes = ['a', 'b']
    expect(makeErr({ msg, notes }).notes).to.deep.equal(notes)
    expect(omitCallStack(makeErr({ msg, notes }))).to.deep.equal({ ...fErrDefaults, msg, notes })

    // test single note add
    const addedNote = 'c'
    const fErrWithOrigNotes = makeErr({ msg, notes })
    expect(omitCallStack(makeErr(fErrWithOrigNotes))).to.deep.equal({ ...fErrDefaults, msg, notes })
    const fErrWithAddedNote = addNote(addedNote, fErrWithOrigNotes)
    expect(omitCallStack(fErrWithAddedNote)).to.deep.equal({ ...fErrDefaults, msg, notes: [...notes, addedNote] })
    expect(omitCallStack(fErrWithOrigNotes)).to.deep.equal({ ...fErrDefaults, msg, notes }) // non-mutation check

    // test multiple note add
    const addedNotes = ['x', 'y', 'z']
    const fErrWithAddedNoteList = addNote(addedNotes, fErrWithOrigNotes)
    expect(omitCallStack(fErrWithAddedNoteList)).to.deep.equal({ ...fErrDefaults, msg, notes: [...notes, ...addedNotes] })
    expect(omitCallStack(fErrWithOrigNotes)).to.deep.equal({ ...fErrDefaults, msg, notes }) // non-mutation check
  })
}

const testErrorMerging = () => {
  it('should copy over non-existant props for merge', async () => {
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithOp)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithOp })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithCode)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithCode })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithMsg)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithMsg })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithClientMsg)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithClientMsg })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithNotes)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithNotes })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithExternaExp)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithExternaExp })
    expect(mergeErrInfo(fErrDefult, incomingErrInfoWithAll)).to.deep.equal({ ...fErrDefult, ...incomingErrInfoWithAll })

    // test with msg string input
    expect(mergeErrInfo(fErrDefult, 'string-only-msg')).to.deep.equal({ ...fErrDefult, msg: 'string-only-msg' })
  })

  xit('should merge existing props to notes', async () => {
  })
}

const testErrorThrowing = () => {
  it('should throw errors correctly', async () => {
    expect(areEquivErrs(retThrownErr(throwErr, testMsg), fErrWithMsg)).to.be.true
    expect(areEquivErrs(retThrownErr(throwErr, errInfoWithCodeAndOpAndMsg), fErrWithCodeAndOpAndMsg)).to.be.true
  })

  it('should conditionally throw errors correctly', async () => {
    expect(areEquivErrs(retThrownErr(throwErrIf, true, fErrWithCodeAndOp), fErrWithCodeAndOp)).to.be.true
    expect(areEquivErrs(retThrownErr(throwErrIf, 10 > 1, {}), fErrDefult)).to.be.true
    expect(retThrownErr(throwErrIf, false, fErrWithCodeAndOp), fErrWithCodeAndOp).to.be.null
    expect(retThrownErr(throwErrIf, 10 < 1, {}), fErrDefult).to.be.null
  })
  it('should conditionally throw errors or return specified value', async () => {
    expect(areEquivErrs(retThrownErr(throwErrIfOrRet, 'should-not-be-returned', true, fErrWithCodeAndOp), fErrWithCodeAndOp)).to.be.true
    expect(areEquivErrs(retThrownErr(throwErrIfOrRet, 'should-not-be-returned', 10 > 1, {}), fErrDefult)).to.be.true
    expect(throwErrIfOrRet('should-be-returned', false, fErrWithCodeAndOp)).to.equal('should-be-returned')
    expect(throwErrIfOrRet('should-be-returned-also', 10 < 1, fErrWithCodeAndOp)).to.equal('should-be-returned-also')

  })
}

runFerrTests()
