import { msgListToStr, stackStrToArr, tab, toJson } from './ferrUtils'

/**
 * Default message used when no explicit message can be derived.
 */
export const DEFAULT_FERR_MESSAGE = 'unknown error'

/**
 * Accepted input for note updates.
 */
export type FErrNotesInput = string | string[]
/**
 * Canonical cause payload supported by {@link FErr}.
 * - `Error`: structured runtime errors
 * - `string`: lightweight cause message
 * - `Record<string, unknown>`: structured metadata
 * - `null`: no cause
 */
export type FErrCause = Error | string | Record<string, unknown> | null

/**
 * Construction options for {@link FErr}.
 *
 * All fields are optional and have safe defaults.
 * `stackLines` is primarily for deterministic tests or custom formatting flows.
 */
export interface FErrOptions {
  message?: string
  op?: string
  opTrace?: string[]
  code?: string
  clientMsg?: string
  notes?: FErrNotesInput
  context?: unknown
  cause?: FErrCause | unknown
  stackLines?: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isNonEmptyString = (value: unknown): value is string => isString(value) && value.length > 0

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.getPrototypeOf(value) === Object.prototype

const toNoteList = (notes: FErrNotesInput | undefined): string[] => {
  if (isNil(notes)) return []
  if (Array.isArray(notes)) return notes.filter(isString)
  if (isString(notes)) return [notes]
  return []
}

const toStackLines = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(isString)
  if (isString(value)) return stackStrToArr(value)
  return []
}

const toOpTrace = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(isString) : []

const appendUnique = (list: string[], maybeValue: unknown): string[] => {
  if (!isString(maybeValue) || maybeValue.length === 0) return list
  return list.includes(maybeValue) ? list : [...list, maybeValue]
}

const mergeOperations = (left: string[], right: string[]): string[] => {
  const out: string[] = []
  left.forEach(op => {
    if (!out.includes(op)) out.push(op)
  })
  right.forEach(op => {
    if (!out.includes(op)) out.push(op)
  })
  return out
}

const normalizeCause = (value: unknown): FErrCause => {
  if (isNil(value)) return null
  if (value instanceof Error || isString(value)) return value
  if (isRecord(value)) return value
  return { value }
}

const nonDefaultMessage = (message: string): boolean => message !== DEFAULT_FERR_MESSAGE

const messageFromCause = (input: FErrCause): string | null => {
  if (isString(input)) return input
  if (input instanceof Error) return input.message || DEFAULT_FERR_MESSAGE
  if (isRecord(input) && isString(input.message)) return input.message
  return null
}

const normalizeOptionsFromUnknown = (input: unknown): FErrOptions => {
  if (input instanceof FErr) return input.toOptions()
  if (isString(input)) return { message: input }

  if (input instanceof Error)
    return {
      message: input.message || DEFAULT_FERR_MESSAGE,
      cause: input
    }

  if (!isRecord(input)) return {}

  const out: FErrOptions = {}
  if (isString(input.message)) out.message = input.message
  if (isString(input.op)) out.op = input.op
  if (Array.isArray(input.opTrace)) out.opTrace = toOpTrace(input.opTrace)
  if (isString(input.code)) out.code = input.code
  if (isString(input.clientMsg)) out.clientMsg = input.clientMsg
  if (!isNil(input.context)) out.context = input.context

  if (Array.isArray(input.notes) || isString(input.notes))
    out.notes = input.notes as FErrNotesInput

  if (!isNil(input.cause)) out.cause = input.cause
  // transitional support for older naming in incoming objects
  if (isNil(out.cause) && !isNil(input.externalExp)) out.cause = input.externalExp

  if (Array.isArray(input.stackLines)) out.stackLines = toStackLines(input.stackLines)
  else if (Array.isArray(input.stackArr)) out.stackLines = toStackLines(input.stackArr)
  else if (isString(input.stack)) out.stackLines = toStackLines(input.stack)

  return out
}

const mergeContext = (preferred: unknown, secondary: unknown): unknown => {
  if (!isNil(preferred) && !isNil(secondary) && isPlainObject(preferred) && isPlainObject(secondary))
    return { ...secondary, ...preferred }

  return !isNil(preferred) ? preferred : secondary
}

const mergeAppend = (preferred: FErr, secondary: FErr): FErr => {
  const noteList: string[] = [...preferred.notes]
  const addNote = (note: string): void => {
    if (!noteList.includes(note)) noteList.push(note)
  }

  let code = preferred.code
  if (secondary.code) {
    if (code) addNote(`Code: ${secondary.code}`)
    else code = secondary.code
  }

  let op = preferred.op
  if (secondary.op) {
    if (!op) op = secondary.op
  }

  let message = preferred.message
  const secondaryMessage = secondary.message
  if (nonDefaultMessage(secondaryMessage)) {
    if (nonDefaultMessage(message)) addNote(secondaryMessage)
    else message = secondaryMessage
  }

  let clientMsg = preferred.clientMsg
  if (secondary.clientMsg) {
    if (clientMsg) addNote(secondary.clientMsg)
    else clientMsg = secondary.clientMsg
  }

  secondary.notes.forEach(addNote)

  let cause: FErrCause = preferred.cause
  if (!isNil(secondary.cause)) {
    if (isNil(cause)) cause = secondary.cause
    else {
      const secondaryCauseMessage = messageFromCause(secondary.cause)
      if (secondaryCauseMessage) addNote(secondaryCauseMessage)
    }
  }

  return new FErr({
    op,
    opTrace: mergeOperations(preferred.opTrace, secondary.opTrace),
    code,
    message,
    clientMsg,
    notes: noteList,
    context: mergeContext(preferred.context, secondary.context),
    cause,
    stackLines: preferred.stackLines
  })
}

export class FErr extends Error {
  readonly op: string
  readonly opTrace: string[]
  readonly code: string
  readonly clientMsg: string
  readonly notes: string[]
  readonly context: unknown
  override readonly cause: FErrCause
  readonly stackLines: string[]

  /**
   * Create a strongly-typed `Error` with operational context.
   *
   * Constructor input is object-based (not positional) so callers can provide
   * only the fields they have without brittle argument ordering.
   */
  constructor(options: FErrOptions = {}) {
    const message = isNonEmptyString(options.message) ? options.message : DEFAULT_FERR_MESSAGE
    super(message, isNil(options.cause) ? undefined : { cause: options.cause })
    this.name = 'FErr'

    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true,
      writable: false,
      configurable: true
    })

    this.op = isString(options.op) ? options.op : ''
    this.opTrace = appendUnique(toOpTrace(options.opTrace), this.op)
    this.code = isString(options.code) ? options.code : ''
    this.clientMsg = isString(options.clientMsg) ? options.clientMsg : ''
    this.notes = toNoteList(options.notes)
    this.context = isNil(options.context) ? null : options.context
    this.cause = normalizeCause(options.cause)

    this.stackLines =
      toStackLines(options.stackLines).length > 0 ? toStackLines(options.stackLines) :
      toStackLines(this.stack)

    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Runtime type guard.
   */
  static is(value: unknown): value is FErr {
    return value instanceof FErr
  }

  /**
   * Coerce unknown input into `FErr`.
   *
   * Supported input:
   * - `FErr` (cloned, optionally patched)
   * - `Error`
   * - `string` message
   * - plain object with ferr-like keys
   * - anything else (safe defaults)
   *
   * Message/cause rules:
   * - If message is default and cause has a message/string, adopt cause message.
   * - If message is non-default and cause has a different message/string, append to notes.
   * - Raw string causes are intentionally supported.
   */
  static from(input: unknown, overrides: Partial<FErrOptions> = {}): FErr {
    if (input instanceof FErr) {
      return new FErr({
        ...input.toOptions(),
        ...overrides,
        notes: !isNil(overrides.notes) ? overrides.notes : input.notes,
        stackLines: toStackLines(overrides.stackLines).length > 0 ? overrides.stackLines : input.stackLines
      })
    }

    const base = normalizeOptionsFromUnknown(input)
    const merged: FErrOptions = {
      ...base,
      ...overrides,
      notes: !isNil(overrides.notes) ? overrides.notes : base.notes,
      stackLines: toStackLines(overrides.stackLines).length > 0 ? overrides.stackLines : base.stackLines
    }

    const ferr = new FErr(merged)
    const incomingMessage = messageFromCause(ferr.cause)
    if (!incomingMessage) return ferr

    if (!nonDefaultMessage(ferr.message))
      return ferr.withMessage(incomingMessage)

    if (ferr.message !== incomingMessage)
      return ferr.withNotes(incomingMessage)

    return ferr
  }

  /**
   * Merge with append precedence (primary wins conflicts).
   * Conflicting secondary fields are preserved in notes.
   */
  static mergeAppend(primary: unknown, secondary: unknown): FErr {
    return mergeAppend(FErr.from(primary), FErr.from(secondary))
  }

  /**
   * Merge with update precedence (incoming wins conflicts).
   * Equivalent to mergeAppend with argument order swapped.
   */
  static mergeUpdate(existing: unknown, incoming: unknown): FErr {
    return mergeAppend(FErr.from(incoming), FErr.from(existing))
  }

  /** @deprecated Use `cause` instead. */
  get externalExp(): FErrCause {
    return this.cause
  }

  /**
   * Get a message-like string from cause when available.
   */
  getCauseMessage(): string | null {
    return messageFromCause(this.cause)
  }

  /**
   * Export normalized instance fields for cloning/patching.
   */
  toOptions(): FErrOptions {
    return {
      op: this.op,
      opTrace: [...this.opTrace],
      code: this.code,
      message: this.message,
      clientMsg: this.clientMsg,
      notes: [...this.notes],
      context: this.context,
      cause: this.cause,
      stackLines: [...this.stackLines]
    }
  }

  /**
   * Export a plain JSON-friendly object.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      op: this.op,
      opTrace: [...this.opTrace],
      code: this.code,
      message: this.message,
      clientMsg: this.clientMsg,
      notes: [...this.notes],
      context: this.context,
      cause: this.cause,
      stackLines: [...this.stackLines]
    }
  }

  /**
   * Immutable patch operation.
   */
  with(patch: Partial<FErrOptions>): FErr {
    return new FErr({
      ...this.toOptions(),
      ...patch,
      notes: !isNil(patch.notes) ? patch.notes : this.notes,
      stackLines: toStackLines(patch.stackLines).length > 0 ? patch.stackLines : this.stackLines
    })
  }

  /** Return a copy with updated `message`. */
  withMessage(message: string): FErr {
    return this.with({ message })
  }

  /** Return a copy with updated `op`. */
  withOp(op: string): FErr {
    return this.with({
      op,
      opTrace: appendUnique(this.opTrace, op)
    })
  }

  /** Return a copy with updated `code`. */
  withCode(code: string): FErr {
    return this.with({ code })
  }

  /** Return a copy with updated `clientMsg`. */
  withClientMsg(clientMsg: string): FErr {
    return this.with({ clientMsg })
  }

  /** Return a copy with updated `context`. */
  withContext(context: unknown): FErr {
    return this.with({ context })
  }

  /** Return a copy with updated `cause`. */
  withCause(cause: unknown): FErr {
    return this.with({ cause })
  }

  /**
   * Return a copy with notes appended or prepended.
   */
  withNotes(notes: FErrNotesInput, position: 'append' | 'prepend' = 'append'): FErr {
    const incoming = toNoteList(notes)
    const next = position === 'prepend' ? [...incoming, ...this.notes] : [...this.notes, ...incoming]
    return this.with({ notes: next })
  }

  /**
   * Short one-line message, suitable for logs and metrics tags.
   */
  toMessageString(): string {
    return `${this.op ? `${this.op} - ` : ''}${this.message}`
  }

  /**
   * Full multi-line human-readable diagnostic block.
   *
   * Includes message metadata, notes, context, stack and cause details.
   */
  toDetailedString(): string {
    const lines = ['\nERROR encountered !!']
    lines.push(tab(`Msg: ${this.toMessageString()}`) as string)

    if (this.opTrace.length > 0) {
      lines.push('Operations:')
      this.opTrace.forEach(op => lines.push(tab(op) as string))
    }

    if (this.clientMsg) lines.push(tab(`Client msg: ${this.clientMsg}`) as string)
    if (this.code) lines.push(tab(`Code: ${this.code}`) as string)

    if (this.notes.length > 0) {
      lines.push('Notes:')
      this.notes.forEach(note => lines.push(tab(note) as string))
    }

    if (!isNil(this.context)) {
      lines.push('Context:')
      toJson(this.context).split('\n').forEach(line => lines.push(tab(line) as string))
    }

    lines.push('Call Stack:')
    this.stackLines.forEach(line => lines.push(tab(line) as string))

    if (!isNil(this.cause)) {
      lines.push('Cause:')
      if (this.cause instanceof Error) {
        lines.push(tab(`Name: ${this.cause.name}`) as string)
        lines.push(tab(`Message: ${this.cause.message}`) as string)
        if (isString(this.cause.stack)) {
          lines.push('Cause callstack:')
          stackStrToArr(this.cause.stack).forEach((line: string) => lines.push(tab(line) as string))
        }
      } else {
        lines.push(tab(toJson(this.cause)) as string)
      }
    }

    return msgListToStr(lines)
  }

  /**
   * Instance wrapper for append-style merge.
   */
  mergeAppend(incoming: unknown): FErr {
    return FErr.mergeAppend(this, incoming)
  }

  /**
   * Instance wrapper for update-style merge.
   */
  mergeUpdate(incoming: unknown): FErr {
    return FErr.mergeUpdate(this, incoming)
  }

  /**
   * Throw merged error using append precedence.
   */
  rethrowAppend(incoming: unknown): never {
    throw this.mergeAppend(incoming)
  }

  /**
   * Throw merged error using update precedence.
   */
  rethrowUpdate(incoming: unknown): never {
    throw this.mergeUpdate(incoming)
  }
}

/** Convenience alias for {@link FErr.is}. */
export const isFerr = FErr.is
/** Negated convenience check for {@link FErr.is}. */
export const isNotFerr = (value: unknown): boolean => !FErr.is(value)
/**
 * Read normalized stack lines for unknown input via `FErr.from`.
 */
export const getStackLines = (value: unknown): string[] => FErr.from(value).stackLines
