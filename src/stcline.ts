// Minimal local functional helpers intended to mirror for-stcland utilities.

type AnyFn = (...args: any[]) => any

export const curryLast = (fn: AnyFn): any => {
  function curried(this: unknown, ...args: unknown[]) {
    if (args.length >= fn.length) return fn.apply(this, args as any[])
    return (...rest: unknown[]) => curried.apply(this, [...args, ...rest])
  }

  return curried
}
