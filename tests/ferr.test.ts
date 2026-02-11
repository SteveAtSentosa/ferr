import { describe, it, expect } from 'vitest'
import { FErr, DEFAULT_FERR_MESSAGE, getStackLines, isFerr, isNotFerr } from '../src/fErr'
import {
  createThrowErr,
  createThrowErrIf,
  createThrowIfUndefined,
  formatMsg,
  rethrowAppend,
  rethrowUpdate,
  throwErr,
  throwErrIf,
  throwFerr,
  throwFerrIf,
  throwIfUndefined
} from '../src/errorUtils'
import { retThrownErr, toJson } from '../src/ferrUtils'

const omitStack = (ferr: FErr) => {
  const { stackLines, ...rest } = ferr.toJSON()
  return rest
}

describe('FErr class-first API', () => {
  it('builds with sensible defaults from optional object input', () => {
    const ferr = new FErr()
    expect(ferr.message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(ferr.op).to.equal('')
    expect(ferr.code).to.equal('')
    expect(ferr.clientMsg).to.equal('')
    expect(ferr.context).to.equal(null)
    expect(ferr.notes).to.deep.equal([])
    expect(ferr.cause).to.equal(null)
  })

  it('supports rich constructor options', () => {
    const ferr = new FErr({
      message: 'boom',
      op: 'load-users',
      code: 'E_LOAD',
      clientMsg: 'Something went wrong',
      notes: ['first', 'second'],
      context: { id: 10 },
      cause: new Error('db-down')
    })

    expect(ferr.message).to.equal('boom')
    expect(ferr.op).to.equal('load-users')
    expect(ferr.code).to.equal('E_LOAD')
    expect(ferr.clientMsg).to.equal('Something went wrong')
    expect(ferr.notes).to.deep.equal(['first', 'second'])
    expect(ferr.context).to.deep.equal({ id: 10 })
    expect((ferr.cause as Error).message).to.equal('db-down')
  })

  it('coerces unknown inputs via FErr.from', () => {
    const fromString = FErr.from('string-msg')
    expect(fromString.message).to.equal('string-msg')

    const rawError = new Error('raw-error')
    const fromError = FErr.from(rawError)
    expect(fromError.message).to.equal('raw-error')
    expect(fromError.cause).to.equal(rawError)

    const fromObject = FErr.from({ message: 'obj-msg', notes: 'n1', externalExp: rawError })
    expect(fromObject.message).to.equal('obj-msg')
    expect(fromObject.notes).to.deep.equal(['n1', 'raw-error'])
    expect(fromObject.cause).to.equal(rawError)
  })

  it('supports cause as Error, string, object, and wraps odd primitives safely', () => {
    const errorCause = new Error('err-cause')
    const ferr1 = new FErr({ message: 'm1', cause: errorCause })
    expect(ferr1.cause).to.equal(errorCause)

    const ferr2 = new FErr({ message: 'm2', cause: 'string-cause' })
    expect(ferr2.cause).to.equal('string-cause')

    const ferr3 = new FErr({ message: 'm3', cause: { kind: 'obj-cause' } })
    expect(ferr3.cause).to.deep.equal({ kind: 'obj-cause' })

    const ferr4 = new FErr({ message: 'm4', cause: 404 as any })
    expect(ferr4.cause).to.deep.equal({ value: 404 })
  })

  it('exposes getCauseMessage() for consistent message extraction', () => {
    expect(new FErr({ message: 'x', cause: new Error('boom') }).getCauseMessage()).to.equal('boom')
    expect(new FErr({ message: 'x', cause: 'boom-str' }).getCauseMessage()).to.equal('boom-str')
    expect(new FErr({ message: 'x', cause: { message: 'boom-obj' } }).getCauseMessage()).to.equal('boom-obj')
    expect(new FErr({ message: 'x', cause: { foo: 1 } }).getCauseMessage()).to.equal(null)
  })

  it('applies explicit FErr.from message/cause precedence rules', () => {
    const fromDefault = FErr.from({ cause: 'cause-msg' })
    expect(fromDefault.message).to.equal('cause-msg')

    const fromNonDefault = FErr.from({ message: 'base-msg', cause: 'cause-msg' })
    expect(fromNonDefault.message).to.equal('base-msg')
    expect(fromNonDefault.notes).to.include('cause-msg')

    const fromSame = FErr.from({ message: 'same-msg', cause: 'same-msg' })
    expect(fromSame.message).to.equal('same-msg')
    expect(fromSame.notes).to.deep.equal([])
  })

  it('keeps Error interop', () => {
    const ferr = new FErr({ message: 'interop' })
    expect(ferr instanceof Error).to.be.true
    expect(ferr instanceof FErr).to.be.true
    expect(isFerr(ferr)).to.be.true
    expect(isNotFerr(ferr)).to.be.false
    expect(isNotFerr(new Error('x'))).to.be.true
  })

  it('uses immutable with* transforms', () => {
    const base = new FErr({ message: 'base', notes: ['n1'] })
    const updated = base.withOp('op1').withCode('E1').withNotes('n2').withContext({ env: 'test' })

    expect(base.op).to.equal('')
    expect(base.notes).to.deep.equal(['n1'])
    expect(updated.op).to.equal('op1')
    expect(updated.code).to.equal('E1')
    expect(updated.notes).to.deep.equal(['n1', 'n2'])
    expect(updated.context).to.deep.equal({ env: 'test' })
  })

  it('supports prepend notes', () => {
    const ferr = new FErr({ message: 'x', notes: ['n2'] }).withNotes('n1', 'prepend')
    expect(ferr.notes).to.deep.equal(['n1', 'n2'])
  })

  it('merges with append semantics (existing wins)', () => {
    const existing = new FErr({
      op: 'existing-op',
      code: 'EXISTING',
      message: 'existing-msg',
      clientMsg: 'existing-client',
      notes: ['existing-note'],
      context: { shared: 'existing', a: 1 }
    })

    const incoming = {
      op: 'incoming-op',
      code: 'INCOMING',
      message: 'incoming-msg',
      clientMsg: 'incoming-client',
      notes: ['incoming-note'],
      context: { shared: 'incoming', b: 2 }
    }

    const merged = existing.mergeAppend(incoming)
    expect(merged.op).to.equal('existing-op')
    expect(merged.code).to.equal('EXISTING')
    expect(merged.message).to.equal('existing-msg')
    expect(merged.clientMsg).to.equal('existing-client')
    expect(merged.notes).to.include.members(['existing-note', 'incoming-note'])
    expect(merged.context).to.deep.equal({ shared: 'existing', a: 1, b: 2 })
  })

  it('merges with update semantics (incoming wins)', () => {
    const existing = new FErr({
      op: 'existing-op',
      code: 'EXISTING',
      message: 'existing-msg',
      context: { shared: 'existing', a: 1 }
    })

    const incoming = {
      op: 'incoming-op',
      code: 'INCOMING',
      message: 'incoming-msg',
      context: { shared: 'incoming', b: 2 }
    }

    const merged = existing.mergeUpdate(incoming)
    expect(merged.op).to.equal('incoming-op')
    expect(merged.code).to.equal('INCOMING')
    expect(merged.message).to.equal('incoming-msg')
    expect(merged.context).to.deep.equal({ shared: 'incoming', b: 2, a: 1 })
  })

  it('renders detailed formatting with context and cause', () => {
    const cause = new Error('root-cause')
    const ferr = new FErr({
      op: 'fmt-op',
      message: 'fmt-message',
      context: { key: 'value', missing: undefined },
      cause
    })

    const str = ferr.toDetailedString()
    expect(str.includes('Context:')).to.be.true
    expect(str.includes('"missing": "undefined"')).to.be.true
    expect(str.includes('Cause:')).to.be.true
    expect(str.includes('root-cause')).to.be.true
  })

  it('serializes circular context safely', () => {
    const ctx: any = { stage: 'test' }
    ctx.self = ctx
    const ferr = new FErr({ message: 'circular', context: ctx })
    expect(ferr.toDetailedString().includes('"self": "[Circular]"')).to.be.true
    expect(toJson(ctx).includes('"self": "[Circular]"')).to.be.true
  })

  it('exposes stack line helpers', () => {
    const ferr = new FErr({ message: 'stack' })
    expect(ferr.stackLines.length > 0).to.be.true
    expect(getStackLines(ferr).length > 0).to.be.true
  })

  it('provides stable toJSON output shape', () => {
    const ferr = new FErr({ message: 'json', op: 'x', notes: ['n1'] })
    const json = ferr.toJSON()
    expect(json.name).to.equal('FErr')
    expect(json.message).to.equal('json')
    expect(json.op).to.equal('x')
    expect(json.notes).to.deep.equal(['n1'])
  })

  it('throws via throwFerr and throwFerrIf', () => {
    const thrown = retThrownErr(() => throwFerr('thrown-msg'))
    expect(thrown instanceof FErr).to.be.true
    expect((thrown as FErr).message).to.equal('thrown-msg')

    expect(retThrownErr(() => throwFerrIf(false, 'ignored'))).to.equal(null)
    const conditional = retThrownErr(() => throwFerrIf(true, { message: 'cond' }))
    expect((conditional as FErr).message).to.equal('cond')
  })

  it('throws formatted operation errors via throwErr and throwErrIf', () => {
    const thrown = retThrownErr(() => throwErr('load', 'failed', { context: { id: 1 } })) as FErr
    expect(thrown instanceof FErr).to.be.true
    expect(thrown.op).to.equal('load')
    expect(thrown.message).to.equal('failed')
    expect(thrown.context).to.deep.equal({ id: 1 })

    expect(retThrownErr(() => throwErrIf(false, 'x', 'y'))).to.equal(null)
    const conditional = retThrownErr(() => throwErrIf(true, 'save', 'bad')) as FErr
    expect(conditional.op).to.equal('save')
  })

  it('supports rethrow append/update helpers', () => {
    const appended = retThrownErr(() => rethrowAppend({ message: 'existing' }, { message: 'incoming' })) as FErr
    expect(appended.message).to.equal('existing')
    expect(appended.notes).to.include('incoming')

    const updated = retThrownErr(() => rethrowUpdate({ message: 'existing' }, { message: 'incoming' })) as FErr
    expect(updated.message).to.equal('incoming')
    expect(updated.notes).to.include('existing')
  })

  it('supports throwIfUndefined assertions', () => {
    let missing: string | undefined = undefined
    const thrown = retThrownErr(() => throwIfUndefined(missing, 'cfg', 'missing cfg')) as FErr
    expect(thrown.op).to.equal('cfg')

    missing = 'ok'
    expect(retThrownErr(() => throwIfUndefined(missing, 'cfg', 'missing cfg'))).to.equal(null)
  })

  it('supports custom throw factories', () => {
    class ClientError extends Error {}

    const throwClientErr = createThrowErr(ClientError)
    const throwClientErrIf = createThrowErrIf(ClientError)
    const throwClientErrIfUndef = createThrowIfUndefined(ClientError)

    const t1 = retThrownErr(() => throwClientErr('op1', 'bad', { context: { id: 1 } }))
    expect(t1 instanceof ClientError).to.be.true
    expect((t1 as Error).message).to.equal(formatMsg('op1', 'bad', { id: 1 }))

    expect(retThrownErr(() => throwClientErrIf(false, 'op2', 'bad'))).to.equal(null)
    const t2 = retThrownErr(() => throwClientErrIf(true, 'op2', 'bad'))
    expect(t2 instanceof ClientError).to.be.true

    const t3 = retThrownErr(() => throwClientErrIfUndef(undefined, 'op3', 'missing'))
    expect(t3 instanceof ClientError).to.be.true
  })

  it('preserves comparable non-stack fields for deterministic checks', () => {
    const a = FErr.from({ message: 'x', op: 'o', notes: ['n'] })
    const b = FErr.from(a)
    expect(omitStack(a)).to.deep.equal(omitStack(b))
  })
})
