import { describe, it, expect } from 'vitest'
import { FErr, DEFAULT_FERR_MESSAGE, getStackLines, isFerr, isNotFerr } from '../src/fErr'
import {
  createThrowErr,
  createThrowErrIf,
  createThrowIfUndefined,
  formatMsg,
  rethrowFerr,
  rethrowAppend,
  rethrowUpdate,
  throwErr,
  throwErrIf,
  throwFerr,
  throwFerrIf,
  throwIfUndefined
} from '../src/errorUtils'
import {
  addPropIfMissingOrEq,
  applyAsync,
  arrayify,
  copyProp,
  curryLast,
  doesNotHave,
  fPipe,
  flatArrayify,
  headOrReflect,
  isArrayOf,
  isNonEmptyArray,
  isNonEmptyString,
  isNotObjectOrNonEmptyString,
  isStringArray,
  msgListToStr,
  plainObject,
  propIsNilOrEmpty,
  propIsNonEmptyArray,
  propIsNonEmptyString,
  propIsNotNil,
  propIsNotNilOrEmpty,
  reflect,
  retThrownErr,
  stackArrToStr,
  stackStrToArr,
  stackStrToStackArr,
  tab,
  toJson
} from '../src/ferrUtils'

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

  it('keeps FErr.from idempotent for FErr inputs', () => {
    const base = new FErr({ message: 'base', notes: ['n1'], cause: new Error('cause-msg') })
    const cloned = FErr.from(base)
    expect(cloned.notes).to.deep.equal(['n1'])
    expect(cloned.message).to.equal('base')
  })

  it('coerces undefined/null/number/array safely', () => {
    expect(FErr.from(undefined).message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(FErr.from(null).message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(FErr.from(42).message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(FErr.from(['x']).message).to.equal(DEFAULT_FERR_MESSAGE)
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

  it('tracks operation history and renders it as Operations', () => {
    const ferr = new FErr({ op: 'repo.load', message: 'x' })
      .withOp('service.load')
      .withOp('api.handle')

    expect(ferr.opTrace).to.deep.equal(['repo.load', 'service.load', 'api.handle'])
    const out = ferr.toDetailedString()
    expect(out).to.contain('Operations:')
    expect(out).to.contain('repo.load')
    expect(out).to.contain('service.load')
    expect(out).to.contain('api.handle')
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
    expect(merged.opTrace).to.deep.equal(['existing-op', 'incoming-op'])
  })

  it('handles merge defaults with notes-only incoming payloads', () => {
    const base = new FErr()
    const appendResult = base.mergeAppend({ notes: ['n1', 'n2'] })
    expect(appendResult.message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(appendResult.notes).to.deep.equal(['n1', 'n2'])

    const updateResult = base.mergeUpdate({ notes: ['u1'] })
    expect(updateResult.message).to.equal(DEFAULT_FERR_MESSAGE)
    expect(updateResult.notes).to.deep.equal(['u1'])
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
    expect(merged.opTrace).to.deep.equal(['incoming-op', 'existing-op'])
  })

  it('covers merge branch behavior for conflicts and cause precedence', () => {
    const existingCause = new Error('existing-cause')
    const incomingCause = new Error('incoming-cause')

    const existing = new FErr({
      op: 'e-op',
      code: 'E_CODE',
      message: 'e-msg',
      clientMsg: 'e-client',
      notes: ['e-note'],
      cause: existingCause
    })

    const incoming = new FErr({
      op: 'i-op',
      code: 'I_CODE',
      message: 'i-msg',
      clientMsg: 'i-client',
      notes: ['i-note'],
      cause: incomingCause
    })

    const appended = existing.mergeAppend(incoming)
    expect(appended.op).to.equal('e-op')
    expect(appended.code).to.equal('E_CODE')
    expect(appended.message).to.equal('e-msg')
    expect(appended.clientMsg).to.equal('e-client')
    expect(appended.cause).to.equal(existingCause)
    expect(appended.notes).to.include.members([
      'e-note',
      'Code: I_CODE',
      'i-msg',
      'i-client',
      'i-note',
      'incoming-cause'
    ])
    expect(appended.opTrace).to.deep.equal(['e-op', 'i-op'])

    const updated = existing.mergeUpdate(incoming)
    expect(updated.op).to.equal('i-op')
    expect(updated.code).to.equal('I_CODE')
    expect(updated.message).to.equal('i-msg')
    expect(updated.clientMsg).to.equal('i-client')
    expect(updated.cause).to.equal(incomingCause)
    expect(updated.notes).to.include.members([
      'i-note',
      'Code: E_CODE',
      'e-msg',
      'e-client',
      'e-note',
      'existing-cause'
    ])
    expect(updated.opTrace).to.deep.equal(['i-op', 'e-op'])
  })

  it('does not duplicate repeated incoming note/message/cause values during merge', () => {
    const incoming = new FErr({
      message: 'incoming-msg',
      notes: ['incoming-msg'],
      cause: new Error('incoming-msg')
    })
    const merged = new FErr({ message: 'existing-msg' }).mergeAppend(incoming)
    expect(merged.notes.filter(n => n === 'incoming-msg').length).to.equal(1)
  })

  it('uses scalar context precedence when context is not a plain object', () => {
    const existing = new FErr({ message: 'e', context: 'existing-ctx' })
    const incoming = new FErr({ message: 'i', context: { incoming: true } })

    expect(existing.mergeAppend(incoming).context).to.equal('existing-ctx')
    expect(existing.mergeUpdate(incoming).context).to.deep.equal({ incoming: true })
  })

  it('adopts secondary merge fields when primary is missing them', () => {
    const primary = new FErr()
    const secondaryCause = new Error('secondary-cause')
    const secondary = new FErr({
      op: 's-op',
      code: 'S_CODE',
      message: 's-msg',
      clientMsg: 's-client',
      cause: secondaryCause
    })

    const merged = primary.mergeAppend(secondary)
    expect(merged.op).to.equal('s-op')
    expect(merged.code).to.equal('S_CODE')
    expect(merged.message).to.equal('s-msg')
    expect(merged.clientMsg).to.equal('s-client')
    expect(merged.cause).to.equal(secondaryCause)
    expect(merged.notes).to.deep.equal([])
  })

  it('preserves cause conflict without adding note when secondary cause has no message', () => {
    const primaryCause = new Error('primary-cause')
    const merged = new FErr({ message: 'p', cause: primaryCause }).mergeAppend({
      message: 's',
      cause: { status: 500 }
    })

    expect(merged.cause).to.equal(primaryCause)
    expect(merged.notes).to.include('s')
    expect(merged.notes).to.not.include('primary-cause')
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

  it('supports explicit stackLines override via with(...)', () => {
    const ferr = new FErr({ message: 'stack-x' })
    const overridden = ferr.with({ stackLines: ['at fake:1:1', 'at fake:2:2'] })
    expect(overridden.stackLines).to.deep.equal(['at fake:1:1', 'at fake:2:2'])
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

  it('supports wrapper throw semantics via throwFerr({ with: ... })', () => {
    const thrown = retThrownErr(() => throwFerr({
      with: {
        op: 'api.handleRequest',
        message: 'Request failed',
        code: 'REQUEST_FAILED',
        context: { requestId: 'r1' }
      }
    })) as FErr

    expect(thrown.op).to.equal('api.handleRequest')
    expect(thrown.message).to.equal('Request failed')
    expect(thrown.code).to.equal('REQUEST_FAILED')
    expect(thrown.context).to.deep.equal({ requestId: 'r1' })
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

  it('supports wrapper rethrow semantics via rethrowFerr(err, { with: ... })', () => {
    const updateThrown = retThrownErr(() => rethrowFerr(
      new FErr({ op: 'db.call', message: 'db failed' }),
      {
        with: {
          op: 'api.handleRequest',
          message: 'Request failed',
          code: 'REQUEST_FAILED',
          context: { requestId: 'r1' }
        }
      }
    )) as FErr

    expect(updateThrown.op).to.equal('api.handleRequest')
    expect(updateThrown.message).to.equal('Request failed')
    expect(updateThrown.code).to.equal('REQUEST_FAILED')
    expect(updateThrown.notes).to.include('db failed')

    const appendThrown = retThrownErr(() => rethrowFerr(
      new FErr({ op: 'db.call', message: 'db failed' }),
      {
        mode: 'append',
        with: {
          op: 'api.handleRequest',
          message: 'Request failed',
          code: 'REQUEST_FAILED',
        }
      }
    )) as FErr

    expect(appendThrown.op).to.equal('db.call')
    expect(appendThrown.message).to.equal('db failed')
    expect(appendThrown.notes).to.include('Request failed')
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

describe('MsgInput — function messages resolved from context', () => {

  it('resolves function message in constructor using context', () => {
    const ferr = new FErr({
      message: (ctx) => `Record ${(ctx as { id: string }).id} not found`,
      context: { id: 'food:oatmeal' },
    })
    expect(ferr.message).to.equal('Record food:oatmeal not found')
  })

  it('resolves function clientMsg in constructor using context', () => {
    const ferr = new FErr({
      message: 'internal error',
      clientMsg: (ctx) => `Item ${(ctx as { id: string }).id} missing`,
      context: { id: 'dish:tacos' },
    })
    expect(ferr.clientMsg).to.equal('Item dish:tacos missing')
  })

  it('resolves both message and clientMsg as functions', () => {
    const msgFn = (ctx: unknown) => `Not found: ${(ctx as { table: string }).table}`
    const ferr = new FErr({
      message: msgFn,
      clientMsg: msgFn,
      context: { table: 'food' },
    })
    expect(ferr.message).to.equal('Not found: food')
    expect(ferr.clientMsg).to.equal('Not found: food')
  })

  it('function message receives null when context is omitted', () => {
    const ferr = new FErr({
      message: (ctx) => `ctx is ${ctx}`,
    })
    expect(ferr.message).to.equal('ctx is null')
  })

  it('function returning empty string yields DEFAULT_FERR_MESSAGE', () => {
    const ferr = new FErr({
      message: () => '',
      context: { id: 1 },
    })
    expect(ferr.message).to.equal(DEFAULT_FERR_MESSAGE)
  })

  it('withMessage resolves function against existing context', () => {
    const base = new FErr({ message: 'original', context: { id: 42 } })
    const updated = base.withMessage((ctx) => `updated: ${(ctx as { id: number }).id}`)
    expect(updated.message).to.equal('updated: 42')
    expect(base.message).to.equal('original')
  })

  it('withClientMsg resolves function against existing context', () => {
    const base = new FErr({ message: 'x', context: { name: 'oatmeal' } })
    const updated = base.withClientMsg((ctx) => `${(ctx as { name: string }).name} not found`)
    expect(updated.clientMsg).to.equal('oatmeal not found')
  })

  it('throwErr accepts function message resolved via context', () => {
    const thrown = retThrownErr(() =>
      throwErr('db.lookup', (ctx) => `Record ${(ctx as { id: string }).id} missing`, {
        context: { id: 'food:banana' },
      })
    ) as FErr
    expect(thrown.message).to.equal('Record food:banana missing')
    expect(thrown.op).to.equal('db.lookup')
  })

  it('throwErrIf accepts function message', () => {
    const thrown = retThrownErr(() =>
      throwErrIf(true, 'guard', (ctx) => `${(ctx as { table: string }).table} not found`, {
        context: { table: 'category' },
      })
    ) as FErr
    expect(thrown.message).to.equal('category not found')

    expect(retThrownErr(() =>
      throwErrIf(false, 'guard', (ctx) => `${(ctx as { table: string }).table} not found`, {
        context: { table: 'category' },
      })
    )).to.equal(null)
  })

  it('throwFerr wrapper-style accepts function message', () => {
    const thrown = retThrownErr(() =>
      throwFerr({
        with: {
          op: 'api.create',
          message: (ctx: unknown) => `Item ${(ctx as { id: string }).id} exists`,
          context: { id: 'food:rice' },
        },
      })
    ) as FErr
    expect(thrown.message).to.equal('Item food:rice exists')
    expect(thrown.op).to.equal('api.create')
  })

  it('FErr.from preserves function message from plain object', () => {
    const ferr = FErr.from({
      message: (ctx: unknown) => `resolved: ${(ctx as { v: number }).v}`,
      context: { v: 99 },
    })
    expect(ferr.message).to.equal('resolved: 99')
  })

  it('formatMsg resolves function message', () => {
    const result = formatMsg('op', (ctx) => `Record ${(ctx as { id: string }).id} gone`, { id: 'x:1' })
    expect(result).to.contain('Record x:1 gone')
    expect(result).to.contain('op failed:')
  })

  it('throwIfUndefined accepts function message', () => {
    const thrown = retThrownErr(() =>
      throwIfUndefined(undefined, 'cfg', (ctx) => `missing ${(ctx as { key: string }).key}`, {
        context: { key: 'DB_URL' },
      })
    ) as FErr
    expect(thrown.message).to.equal('missing DB_URL')
  })

  it('string messages still work everywhere (backwards compat)', () => {
    const ferr = new FErr({ message: 'plain string', clientMsg: 'client string', context: { x: 1 } })
    expect(ferr.message).to.equal('plain string')
    expect(ferr.clientMsg).to.equal('client string')

    const thrown = retThrownErr(() => throwErr('op', 'static msg')) as FErr
    expect(thrown.message).to.equal('static msg')
  })
})

describe('ferrUtils quick coverage checks', () => {
  it('handles currying and array/object helpers', async () => {
    const join3 = curryLast((a: string, b: string, c: string) => `${a}-${b}-${c}`)
    expect(join3('a')('b')('c')).to.equal('a-b-c')
    expect(join3('x', 'y', 'z')).to.equal('x-y-z')

    expect(arrayify('x')).to.deep.equal(['x'])
    expect(arrayify(['x'])).to.deep.equal(['x'])
    expect(flatArrayify([['x'], ['y']])).to.deep.equal(['x', 'y'])
    expect(headOrReflect(['x', 'y'])).to.equal('x')
    expect(headOrReflect('z')).to.equal('z')

    expect(doesNotHave('a', { b: 1 })).to.equal(true)
    expect(copyProp('a', { a: 1 }, { b: 2 })).to.deep.equal({ b: 2, a: 1 })
    expect(copyProp('missing', { a: 1 }, { b: 2 })).to.deep.equal({ b: 2 })
    expect(plainObject(new FErr({ message: 'x' }))).to.be.an('object')

    expect(isArrayOf((v: unknown): v is string => typeof v === 'string', ['a'])).to.equal(true)
    expect(isArrayOf((v: unknown): v is string => typeof v === 'string', ['a', 1])).to.equal(false)
    expect(isStringArray(['a', 'b'])).to.equal(true)
    expect(isStringArray(['a', 2])).to.equal(false)
  })

  it('handles prop predicates and formatting helpers', async () => {
    const obj = { s: 'x', arr: ['y'], n: null, empty: '', present: 1 }
    expect(isNonEmptyString('x')).to.equal(true)
    expect(isNonEmptyString('')).to.equal(false)
    expect(isNonEmptyArray(['x'])).to.equal(true)
    expect(isNonEmptyArray([])).to.equal(false)
    expect(isNotObjectOrNonEmptyString(1)).to.equal(true)
    expect(isNotObjectOrNonEmptyString('x')).to.equal(false)

    expect(propIsNonEmptyString('s', obj)).to.equal(true)
    expect(propIsNonEmptyString('empty', obj)).to.equal(false)
    expect(propIsNonEmptyArray('arr', obj)).to.equal(true)
    expect(propIsNotNil('present', obj)).to.equal(true)
    expect(propIsNotNil('n', obj)).to.equal(false)
    expect(propIsNilOrEmpty('empty', obj)).to.equal(true)
    expect(propIsNotNilOrEmpty('s', obj)).to.equal(true)

    expect(tab('x')).to.equal('  x')
    expect(tab(['x', 'y'])).to.deep.equal(['  x', '  y'])
    expect(tab(123 as any)).to.equal(123)
    expect(msgListToStr(['a', 'b'])).to.equal('a\nb')
    expect(msgListToStr([1, 2] as any, 'fallback')).to.equal('fallback')
  })

  it('handles stack helpers, throw capture, async pipeline, and json serialization', async () => {
    const err = new Error('boom')
    expect(stackStrToArr(err.stack as string).length).to.be.greaterThan(0)
    expect(stackStrToStackArr(err.stack as string).length).to.be.greaterThan(0)
    expect(stackArrToStr('boom', stackStrToArr(err.stack as string))).to.contain('Error: boom')

    const thrown = retThrownErr(() => { throw new Error('x') }) as Error
    expect(thrown.message).to.equal('x')
    expect(retThrownErr(() => 1)).to.equal(null)

    const applied = await applyAsync(Promise.resolve(1), (x: number) => x + 1)
    expect(applied).to.equal(2)
    const piped = await fPipe((x: number) => x + 1, (x: number) => x * 2)(2)
    expect(piped).to.equal(6)
    expect(reflect('ok')).to.equal('ok')

    const target: Record<string, unknown> = { a: 1 }
    expect(addPropIfMissingOrEq('b', null, 2, target)).to.equal(true)
    expect(addPropIfMissingOrEq('a', null, 3, target)).to.equal(false)

    const circular: any = { a: 1 }
    circular.self = circular
    const json = toJson({
      circular,
      undef: undefined,
      big: BigInt(1),
      sym: Symbol('s'),
      fn: () => 1,
      date: new Date('2020-01-01T00:00:00.000Z'),
    })
    expect(json).to.contain('"[Circular]"')
    expect(json).to.contain('"undefined"')
    expect(json).to.contain('"1n"')
    expect(json).to.contain('Symbol(s)')
    expect(json).to.contain('[Function')
    expect(json).to.contain('"_type"')
  })
})
