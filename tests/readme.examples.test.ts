import { describe, expect, it } from 'vitest'
import { FErr, rethrowFerr, throwFerr, throwIfUndefined } from '../src/index'

const caught = (fn: () => unknown): unknown => {
  try {
    return fn()
  } catch (e) {
    return e
  }
}

describe('README examples', () => {
  it('normalizes unknown caught errors with FErr.from(...)', async () => {
    const doWork = async () => {
      throw new Error('db timeout')
    }

    const thrown = await (async () => {
      try {
        await doWork()
      } catch (e) {
        throw FErr.from(e)
          .withOp('service.doWork')
          .withCode('WORK_FAILED')
          .withContext({ jobId: 'j_123' })
      }
    })().catch(e => e as unknown)

    expect(thrown instanceof FErr).to.be.true
    const ferr = thrown as FErr
    expect(ferr.message).to.equal('db timeout')
    expect(ferr.op).to.equal('service.doWork')
    expect(ferr.code).to.equal('WORK_FAILED')
    expect(ferr.context).to.deep.equal({ jobId: 'j_123' })
  })

  it('adds context without mutation', () => {
    const base = new FErr({ op: 'auth.login', message: 'Login failed' })
    const enriched = base
      .withContext({ requestId: 'r_123', tenantId: 't_9' })
      .withNotes('retry path used')

    expect(base.context).to.equal(null)
    expect(base.notes).to.deep.equal([])
    expect(enriched.context).to.deep.equal({ requestId: 'r_123', tenantId: 't_9' })
    expect(enriched.notes).to.deep.equal(['retry path used'])
  })

  it('merges failures across boundaries with mergeAppend', () => {
    const appErr = new FErr({ op: 'createOrder', message: 'Order failed' })
    const externalErr = new FErr({
      op: 'payments.charge',
      code: 'PAYMENT_DECLINED',
      message: 'Card was declined',
      context: { orderId: 'o_1' }
    })

    const merged = appErr.mergeAppend(externalErr)
    expect(merged.op).to.equal('createOrder')
    expect(merged.code).to.equal('PAYMENT_DECLINED')
    expect(merged.message).to.equal('Order failed')
    expect(merged.notes).to.include('Card was declined')
  })

  it('supports throw helpers for guard clauses', () => {
    const thrown1 = caught(() => throwFerr({
      with: {
        op: 'authorize',
        message: 'Unauthorized',
        context: { userId: 'u_1' }
      }
    })) as FErr
    expect(thrown1.op).to.equal('authorize')
    expect(thrown1.message).to.equal('Unauthorized')

    const thrown2 = caught(() => {
      try {
        throw new Error('db boom')
      } catch (e) {
        rethrowFerr(e, {
          with: { op: 'api.handleRequest', code: 'REQUEST_FAILED', message: 'Request failed' }
        })
      }
    }) as FErr
    expect(thrown2.op).to.equal('api.handleRequest')
    expect(thrown2.code).to.equal('REQUEST_FAILED')
    expect(thrown2.message).to.equal('Request failed')
    expect(thrown2.notes).to.include('db boom')

    const cfgThrown = caught(() => {
      const config: string | undefined = undefined
      throwIfUndefined(config, 'boot', 'Missing config')
    }) as FErr
    expect(cfgThrown.op).to.equal('boot')
    expect(cfgThrown.message).to.equal('Missing config')
  })

  it('supports wrapper-style throw/rethrow flow', async () => {
    const authorize = (userId: string) => {
      if (!userId) {
        throwFerr({
          with: {
            op: 'auth.authorize',
            code: 'AUTH_MISSING_USER',
            message: 'Missing user id'
          }
        })
      }
    }

    const handleRequest = async (userId: string) => {
      try {
        await Promise.resolve(authorize(userId))
      } catch (caughtErr) {
        rethrowFerr(caughtErr, {
          with: {
            op: 'api.handleRequest',
            code: 'REQUEST_FAILED',
            message: 'Request failed'
          }
        })
      }
    }

    const thrown = await handleRequest('').catch(e => e as unknown)
    expect(thrown instanceof FErr).to.be.true
    const ferr = thrown as FErr
    expect(ferr.op).to.equal('api.handleRequest')
    expect(ferr.code).to.equal('REQUEST_FAILED')
    expect(ferr.message).to.equal('Request failed')
    expect(ferr.notes).to.include('Missing user id')
  })
})
