import { FErr } from '../src/fErr.ts'
import {
  rethrowAppend,
  rethrowUpdate,
  throwErr,
  throwErrIf,
  throwFerr,
  throwFerrIf,
} from '../src/errorUtils.ts'

const printSection = (title: string) => {
  console.log(`\n=== ${title} ===\n`)
}

const printFerr = (label: string, ferr: unknown) => {
  console.log(`\n--- ${label} ---`)
  console.log(FErr.from(ferr).toDetailedString())
}

const caught = (fn: () => any) => {
  try {
    return fn()
  } catch (e) {
    return e
  }
}

printSection('Basic Creation')
printFerr('new FErr defaults', new FErr())
printFerr('FErr.from string', FErr.from('string-only message'))
printFerr('FErr.from raw Error', FErr.from(new Error('raw-error')))

printSection('Immutable transforms')
const transformed = new FErr({ message: 'base', notes: ['n1'] })
  .withOp('save-user')
  .withCode('E_SAVE')
  .withClientMsg('Try again later')
  .withContext({ requestId: 'req-1', role: 'admin' })
  .withNotes(['n2', 'n3'])
printFerr('with* chain', transformed)

printSection('Merge Behavior')
const existing = new FErr({
  op: 'existing-op',
  code: 'EXISTING',
  message: 'existing-msg',
  clientMsg: 'existing-client',
  notes: ['existing-note'],
  context: { shared: 'existing', existingOnly: 1 },
})

const incoming = {
  op: 'incoming-op',
  code: 'INCOMING',
  message: 'incoming-msg',
  clientMsg: 'incoming-client',
  notes: ['incoming-note'],
  context: { shared: 'incoming', incomingOnly: 2 },
  cause: new Error('incoming-cause')
}

printFerr('mergeAppend (existing wins)', existing.mergeAppend(incoming))
printFerr('mergeUpdate (incoming wins)', existing.mergeUpdate(incoming))

printSection('Context Behavior')
const circularContext: any = { stage: 'viz-context' }
circularContext.self = circularContext
printFerr(
  'circular context safe formatting',
  new FErr({ op: 'ctx-circular', message: 'demo', context: circularContext })
)

printSection('Throw helpers')
const t1 = caught(() => throwFerr({ message: 'throwFerr hit', op: 'throw-op' }))
printFerr('throwFerr', t1)

const t2 = caught(() => throwFerrIf(true, { message: 'throwFerrIf hit', op: 'if-op' }))
printFerr('throwFerrIf(true)', t2)
console.log('\nthrowFerrIf(false):', throwFerrIf(false, { message: 'not-thrown' }))

const t3 = caught(() => throwErr('db-read', 'db failed', { context: { table: 'users' } }))
printFerr('throwErr', t3)

const t4 = caught(() => throwErrIf(true, 'cache-read', 'cache failed'))
printFerr('throwErrIf(true)', t4)
console.log('\nthrowErrIf(false):', throwErrIf(false, 'x', 'y'))

printSection('Rethrow helpers')
const r1 = caught(() => rethrowAppend({ message: 'existing-msg' }, new Error('incoming raw')))
printFerr('rethrowAppend', r1)

const r2 = caught(() => rethrowUpdate({ message: 'existing-msg' }, { message: 'incoming-msg' }))
printFerr('rethrowUpdate', r2)

printSection('Compact vs Detailed')
const fmtTarget = new FErr({ op: 'format-op', message: 'format message' })
console.log('\nmessage:', fmtTarget.toMessageString())
console.log('\ndetailed:\n', fmtTarget.toDetailedString())
