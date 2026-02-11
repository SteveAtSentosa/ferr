* create an `fErr` from a string, errInfo object, existing `fErr`, or external exception/Error
* safe defaulting for `makeFerrWithDefaults` when inputs are `null`/`undefined`
* tagged error shape (`_tag: '@@ferr'`) with standard fields (`op`, `code`, `message`, `clientMsg`, `notes`, `stack`, `externalExp`)
* captures call stack as an array of strings on creation
* can apply message from external exceptions and preserve context in notes
* add notes at the end (`addNotes`) or front (`addNotesFront`)
* merge error info by appending (`appendErrInfo`) or replacing precedence (`updateErrInfo`)
* update operation with history preservation (`updateOp` moves prior op into notes)
* helpers to throw/rethrow with added context (`throwFerr`, `throwFerrIf`, `reThrowWithFerr`, `reThrowWithNotes`, `reThrowWithOp`)
* conditional throw/pass-through helpers for pipeline usage (`throwIf`, `throwIfOrPassthrough`, `throwErrIfOrRet`)
* format `fErr` into readable developer output (`fErrToMessageStr`, `fErrStr`, `logFerr`)
* exported type/accessor utilities for checking and immutably reading/updating `fErr` fields (`isFerr`, `has*`, `get*`, `set*`)
