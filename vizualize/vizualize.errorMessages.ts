import {
  addNotes,
  addNotesFront,
  appendErrInfo,
  fErrStr,
  fErrToMessageStr,
  makeFerr,
  makeFerrWithDefaults,
  reThrowWithFerr,
  reThrowWithNotes,
  reThrowWithOp,
  throwErrIfOrRet,
  throwFerrIf,
  throwIfOrPassthrough,
  updateErrInfo,
  updateOp
} from '../src/ferr.ts'

const printSection = (title: string) => {
  console.log(`\n=== ${title} ===\n`)
}

const printFerr = (label: string, fErr: any) => {
  console.log(`\n--- ${label} ---`)
  console.log(fErrStr(fErr))
}

const caught = (fn: () => any) => {
  try {
    return fn()
  } catch (e) {
    return e
  }
}

const externalExp = new Error('exception, this could be bad')
const baseErrInfo = {
  message: 'Hey developer, some bad stuff happened',
  op: 'Operation',
  code: 'ERROR_CODE',
  clientMsg: 'Hey client, that did not work',
  notes: ['you probably should grab a beer', 'I would reccomend a nice IPA'],
  externalExp
}

printSection('Basic Creation')
printFerr('string-only makeFerr', makeFerr('An string only fErr error message'))
printFerr('makeFerr without external exception', makeFerr({
  ...baseErrInfo,
  externalExp: null
}))
printFerr('makeFerr with external exception', makeFerr(baseErrInfo))
printFerr('makeFerr with notes-only input (message inferred)', makeFerr({
  notes: ['First note becomes message', 'second note']
}))

printSection('Note Behavior')
const ferrForNotes = makeFerr({ message: 'base message', notes: ['existing note'] })
printFerr('addNotes appends', addNotes(['n2', 'n3'], ferrForNotes))
printFerr('addNotesFront prepends', addNotesFront(['n2', 'n3'], ferrForNotes))

printSection('Operation Updates')
const ferrWithOp = makeFerr({ op: 'load-users', message: 'op-msg' })
printFerr('updateOp moves prior op into notes', updateOp('save-users', ferrWithOp))
printFerr('updateOp from raw external Error', updateOp('network-call', new Error('socket down')))

printSection('appendErrInfo vs updateErrInfo')
const existing = makeFerr({
  op: 'existing-op',
  code: 'EXISTING_CODE',
  message: 'existing-msg',
  clientMsg: 'existing-client',
  notes: ['existing-note']
})
const incoming = {
  op: 'incoming-op',
  code: 'INCOMING_CODE',
  message: 'incoming-msg',
  clientMsg: 'incoming-client',
  notes: ['incoming-note'],
  externalExp: new Error('incoming-external')
}
printFerr('appendErrInfo (existing wins, incoming moves to notes)', appendErrInfo(existing, incoming))
printFerr('updateErrInfo (incoming wins, existing moves to notes)', updateErrInfo(existing, incoming))

printSection('External Exception Variants')
printFerr('appendErrInfo with raw Error', appendErrInfo(makeFerr(), new Error('raw append error')))
printFerr('updateErrInfo with raw Error', updateErrInfo(makeFerr({ message: 'keep me?' }), new Error('raw update error')))
printFerr('makeFerr externalExp as string', makeFerr({ externalExp: 'external as string' }))

printSection('Rethrow Flows')
const rethrow1 = caught(() => {
  try {
    throw new Error('base external throw')
  } catch (e) {
    reThrowWithFerr({ code: 'E_CODE' }, e)
  }
})
printFerr('reThrowWithFerr from raw Error', rethrow1)

const rethrow2 = caught(() => {
  try {
    throw makeFerr({ op: 'db-read', message: 'db blew up' })
  } catch (e) {
    reThrowWithNotes(['retrying from handler', 'captured by service layer'], e)
  }
})
printFerr('reThrowWithNotes from ferr', rethrow2)

const rethrow3 = caught(() => {
  try {
    throw new Error('raw for op')
  } catch (e) {
    reThrowWithOp('request-handler', e)
  }
})
printFerr('reThrowWithOp from raw Error', rethrow3)

printSection('Conditional Throw Helpers')
const throwIfTrue = caught(() => throwFerrIf(true, { message: 'throwFerrIf hit' }))
printFerr('throwFerrIf(true)', throwIfTrue)
console.log('\nthrowFerrIf(false):', throwFerrIf(false, { message: 'not thrown' }))

const passthrough = caught(() => throwIfOrPassthrough(false, new Error('should not throw'), 'passthrough-value'))
console.log('\nthrowIfOrPassthrough(false):', passthrough)
const throwPass = caught(() => throwIfOrPassthrough(true, new Error('throwIfOrPassthrough throw'), 'unused'))
printFerr('throwIfOrPassthrough(true) captured via makeFerr', makeFerr({ externalExp: throwPass }))

const throwErrOrRetA = caught(() => throwErrIfOrRet('ret-when-false', false, { message: 'not thrown' }))
console.log('\nthrowErrIfOrRet(false):', throwErrOrRetA)
const throwErrOrRetB = caught(() => throwErrIfOrRet('unused', true, { message: 'throwErrIfOrRet thrown' }))
printFerr('throwErrIfOrRet(true)', throwErrOrRetB)

printSection('Defaults Helper')
const defaulted = makeFerrWithDefaults(undefined, {
  op: 'default-op',
  code: 'DEFAULT_CODE',
  message: 'default-message',
  clientMsg: 'default-client',
  notes: ['default-note'],
  externalExp: null
})
printFerr('makeFerrWithDefaults(undefined, defaults)', defaulted)

printSection('Short vs Full Formatting')
const fmtTarget = makeFerr({ op: 'format-op', message: 'format message' })
console.log('\nfErrToMessageStr:', fErrToMessageStr(fmtTarget))
console.log('\nfErrStr:\n', fErrStr(fmtTarget))
