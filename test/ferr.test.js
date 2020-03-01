import { omit, assoc, keysIn, keys } from 'ramda'
import { expect } from 'chai'
import { addNote, makeErr, testExports } from '../src/ferr'
import {
  plainObject, doesNotHave, addPropIfMissing, addPropIfMissingOrEq, propIsNilOrEmpty, addPropIfNillOrEmpty
} from '../src/utils'

const { _defaultErrMsg, msgIsEmptyOrDefault, msgIsNotEmptyOrDefault, isErrInfo, mergeErrorInfo, FErr  } = testExports

let externalExp
try { throw Error('external-exception') } catch (e) { externalExp = e }
const emptyErr = makeErr({ msg: 'empty-err' })
const omitStack = omit(['stack', 'callStack'])

const runFerrTests = () => {
  describe('server tests', () => {
    testTypes()
    testUtils()
    testErrorCreation()
    testErrorNotes()
    testErrorMerging()
  })
}

const testTypes = () =>
  it('should detect fErr types correctly', () => {
    expect(isErrInfo({ msg: 'yo' })).to.be.true
    expect(isErrInfo({ msg: 'yo', code: 'HO' })).to.be.true
    expect(isErrInfo('yo')).to.be.false
    expect(isErrInfo({})).to.be.false
  })

const testUtils = () => {
  it('should detect empty or default errInfo msg', () => {
    expect(msgIsEmptyOrDefault({})).to.be.true
    expect(msgIsNotEmptyOrDefault({})).to.be.false
    expect(msgIsEmptyOrDefault({ msg: _defaultErrMsg })).to.be.true
    expect(msgIsNotEmptyOrDefault({ msg: _defaultErrMsg })).to.be.false
    expect(msgIsEmptyOrDefault({ msg: '' })).to.be.true
    expect(msgIsNotEmptyOrDefault({ msg: '' })).to.be.false
    expect(msgIsEmptyOrDefault({ msg: 'hi' })).to.be.false
    expect(msgIsNotEmptyOrDefault({ msg: 'hi' })).to.be.true
  })

  it('should detect missing props', () => {
    expect(doesNotHave('missing', { someProp : 'someProp' })).to.be.true
    expect(doesNotHave('someProp', { someProp : 'someProp' })).to.be.false
  })

  it('should detect nil or empty props', () => {
    expect(propIsNilOrEmpty('p', { p: undefined })).to.be.true
    expect(propIsNilOrEmpty('p', { p: null })).to.be.true
    expect(propIsNilOrEmpty('p', { p: '' })).to.be.true
    expect(propIsNilOrEmpty('p', { p: [] })).to.be.true
    expect(propIsNilOrEmpty('p', { p: {} })).to.be.true
    expect(propIsNilOrEmpty('p', undefined)).to.be.true
    expect(propIsNilOrEmpty('p', { p: 'p' })).to.be.false
  })
}

const testErrorCreation = () =>
  it('should make errors correctly', async () => {

    // test only string given
    expect(makeErr('test-error')).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr('test-error'))).to.deep.equal(omitStack(makeErr({ ...emptyErr, msg: 'test-error' })))
    expect(omitStack(plainObject(makeErr('test-error')))).to.deep.equal(omitStack({ ...emptyErr, msg: 'test-error' }))

    // test partial error info given
    const partialErr = { op: 'partial-op', msg: 'partial-msg', externalExp, }
    expect(makeErr(partialErr)).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr(partialErr))).to.deep.equal(omitStack(makeErr({ ...emptyErr, ...partialErr })))
    expect(plainObject(omitStack(makeErr(partialErr)))).to.deep.equal(omitStack({ ...emptyErr, ...partialErr }))

    // test full error info given
    const fullErr = { op: 'full-op', code: 'full-code', msg: 'full-msg', clientMsg: 'full-client-msg', notes: ['some', 'note'], externalExp }
    expect(makeErr(fullErr)).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr(fullErr))).to.deep.equal(omitStack(makeErr({ ...emptyErr, ...fullErr })))
    expect(omitStack(plainObject(makeErr(fullErr)))).to.deep.equal(omitStack({ ...emptyErr, ...fullErr }))
  })

const testErrorNotes = () => {
  it('should handle error notes correcly', async () => {
    const msg = 'notes-msg'

    // test default to empty notes list
    expect(makeErr({ msg }).notes).to.deep.equal([])

    // test note list provided at err creation
    const notes = ['a', 'b']
    expect(makeErr({ msg, notes }).notes).to.deep.equal(notes)
    expect(omitStack(makeErr({ msg, notes }))).to.deep.equal(omitStack(makeErr({ ...emptyErr, msg, notes })))
    expect(omitStack(plainObject(makeErr({ msg, notes })))).to.deep.equal(omitStack({ ...emptyErr, msg, notes }))

    // test single note add
    const addedNote = 'c'
    let errSingleNoteAdded = makeErr({ msg, notes })
    errSingleNoteAdded = addNote(addedNote, errSingleNoteAdded)
    expect(errSingleNoteAdded).to.equal(errSingleNoteAdded)
    expect(omitStack(plainObject(errSingleNoteAdded))).deep.equal(omitStack({ ...emptyErr, msg, notes: [...notes, 'c'] }))

    // test multiple note add
    const addedNotes = ['x', 'y', 'z']
    let errMulNotesAdded = makeErr({ msg, notes })
    errMulNotesAdded = addNote(addedNotes, errMulNotesAdded)
    expect(errMulNotesAdded).to.equal(errMulNotesAdded)
    expect(omitStack(plainObject(errMulNotesAdded))).to.deep.equal(omitStack({ ...emptyErr, msg, notes: [...notes, ...addedNotes] }))
  })
}

const testErrorMerging = () => {
  it('should merge errors correcly', async () => {
    // const fErrDefault = makeErr()
    // mergeErrorInfo(fErrDefault, { op: 'new op' })

    //  expect(mergeErrorInfo(fErrDefault, { op: 'new op' })).to.deep.equal(makeErr({ op: 'new op' }))

  })
}

runFerrTests()
