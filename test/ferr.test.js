import { omit } from 'ramda'
import { expect } from 'chai'
import { addNote, makeErr, testExports } from '../src/ferr'
import { plainObject } from '../src/utils'

const { isErrInfo, FErr  } = testExports

// TODO: put this in pre test stuff
// base testing utils & data
const emptyErr = makeErr({ msg: 'empty-err' })
let externalExp
try { throw Error('external-exception') } catch (e) { externalExp = e }

const omitStack = omit(['stack'])

const runFerrTests = () => {
  describe('server tests', () => {
    testTypes()
    testErrorCreation()
    testErrorNotes()
  })
}

const testTypes = () =>
  it('should detect fErr types correctly', () => {
    expect(isErrInfo({ msg: 'yo' })).to.be.true
    expect(isErrInfo({ msg: 'yo', code: 'HO' })).to.be.true
    expect(isErrInfo('yo')).to.be.false
    expect(isErrInfo({})).to.be.false
  })

const testErrorCreation = () =>
  it('should make errors correctly', async () => {

    // test only string given
    expect(makeErr('test-error')).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr('test-error'))).to.deep.equal(omitStack(makeErr({ ...emptyErr, msg: 'test-error' })))
    expect(plainObject(makeErr('test-error'))).to.deep.equal(({ ...emptyErr, msg: 'test-error' }))

    // test partial error info given
    const partialErr = { op: 'partial-op', msg: 'partial-msg', externalExp, }
    expect(makeErr(partialErr)).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr(partialErr))).to.deep.equal(omitStack(makeErr({ ...emptyErr, ...partialErr })))
    expect(plainObject(makeErr(partialErr))).to.deep.equal(({ ...emptyErr, ...partialErr }))

    // test full error info given
    const fullErr = { op: 'full-op', code: 'full-code', msg: 'full-msg', clientMsg: 'full-client-msg', notes: ['some', 'note'], externalExp }
    expect(makeErr(fullErr)).to.be.an.instanceof(FErr)
    expect(omitStack(makeErr(fullErr))).to.deep.equal(omitStack(makeErr({ ...emptyErr, ...fullErr })))
    expect(plainObject(makeErr(fullErr))).to.deep.equal(({ ...emptyErr, ...fullErr }))
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
    expect(plainObject(makeErr({ msg, notes }))).to.deep.equal({ ...emptyErr, msg, notes })

    // test single note add
    const addedNote = 'c'
    let errSingleNoteAdded = makeErr({ msg, notes })
    errSingleNoteAdded = addNote(addedNote, errSingleNoteAdded)
    expect(errSingleNoteAdded).to.equal(errSingleNoteAdded)
    expect(plainObject(errSingleNoteAdded)).deep.equal({ ...emptyErr, msg, notes: [...notes, 'c'] })

    // test multiple note add
    const addedNotes = ['x', 'y', 'z']
    let errMulNotesAdded = makeErr({ msg, notes })
    errMulNotesAdded = addNote(addedNotes, errMulNotesAdded)
    expect(errMulNotesAdded).to.equal(errMulNotesAdded)
    expect(plainObject(errMulNotesAdded)).to.deep.equal({ ...emptyErr, msg, notes: [...notes, ...addedNotes] })
  })
}

runFerrTests()
