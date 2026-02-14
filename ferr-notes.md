* class-first error model via `FErr extends Error` with safe defaults and immutable `with*` transforms
* normalize unknown input with `FErr.from(...)` from `FErr`, `Error`, string, ferr-like object, or arbitrary values
* canonical fields: `op`, `opTrace`, `code`, `message`, `clientMsg`, `notes`, `context`, `cause`, `stackLines`
* operation history tracking in `opTrace`, including merge and formatting output (`Operations:` section)
* append/update merge semantics via `mergeAppend` and `mergeUpdate` (instance + static)
* explicit message/cause precedence rules in coercion and merge flows
* throw helpers: `throwFerr`, `throwFerrIf`, `throwErr`, `throwErrIf`, `throwIfUndefined`
* wrapper-style helpers for higher-level APIs: `throwFerr({ with: ... })` and `rethrowFerr(caught, { with, mode })`
* rethrow helpers with merge modes: `rethrowAppend`, `rethrowUpdate`
* custom error-factory helpers: `createThrowErr`, `createThrowErrIf`, `createThrowIfUndefined`
* developer output helpers on `FErr`: `toMessageString()`, `toDetailedString()`, `toJSON()`, `toOptions()`
* utility layer in `ferrUtils` for context serialization, stack formatting, and small functional helpers
