// TODO:
// Figure out which ones are being
// test these please
// put in own rep futils

import {
  flatten, drop, concat, not, any, complement, has, propEq, prop,
  reverse, assoc, curry, head
} from 'ramda'
import {
  isArray, isString, isNotObject, isNilOrEmpty, isNotNil
} from 'ramda-adjunct'

export const arrayify = input => isArray(input) ? input : [input]
export const flatArrayify = input => flatten(arrayify(input))

// if toCheck is an array, return first element, otherwise return toCheck
export const headOrReflect = toCheck =>
  isArray(toCheck) ? head(toCheck) : toCheck

export const doesNotHave = complement(has)

export const isNonEmptyString = toCheck => isString(toCheck) && toCheck.length > 0
export const isNotNonEmptyString = complement(isNonEmptyString)
export const propIsNonEmptyString = curry((propName, obj) => isNonEmptyString(prop(propName, obj)))

export const isNonEmptyArray = toCheck => isArray(toCheck) && toCheck.length > 0
export const propIsNonEmptyArray = curry((propName, obj) => isNonEmptyArray(prop(propName, obj)))

export const propIsNotNil = curry((propName, obj) => isNotNil(prop(propName, obj)))
// export const isNotNonEmptyString = complement(isNonEmptyString)

export const isNotObjectOrNonEmptyString = toCheck =>
  isNotObject(toCheck) && isNotNonEmptyString(toCheck)

// export const propIsNonEmptyArray = (propName, obj) =>


export const stackStrToStackArr = stackStr =>
  // drop error message and this call from stack list
  drop(2, stackStr.split('\n').map(s => s.trim()))

export const retThrownErr = (fxnThatThrows, ...argsForFxnThatThrows) => {
  try { fxnThatThrows(...argsForFxnThatThrows); return null } catch (e) { return e }
}

export const reflect = a => a

export const applyAsync = (acc, val) => acc.then(val)


// handles pipeline of any combination of sync and asyn functions
// Always returns a promise, even if all fxns are async
// This allows .catch to be used in all pipelines
export const fPipe = (...funcs) => x => funcs.reduce(applyAsync, Promise.resolve(x))

// ----- the line --------------------------------------------------

export const copyProp = (propName, sourceObj={}, targetObj={}) =>
  has(propName, sourceObj) ? assoc(propName, sourceObj[propName], targetObj) : targetObj

export const plainObject = classInstance => Object.assign({}, classInstance)


// Given the predicate fxn `checkPred`, check that all elements of `array` pass
// ((a->bool), a) -> boolean
export const isArrayOf = (typeCheckPred, array) =>
  isArray(array) && not(any(complement(typeCheckPred), array))

export const isStringArray = array => isArrayOf(isString, array)
export const isNotStringArray = complement(isStringArray)

// export const doesNotHave = complement(has)

export const propIsNilOrEmpty = (propName, obj) => isNilOrEmpty(prop(propName, obj))
export const propIsNotNilOrEmpty = complement(propIsNilOrEmpty)

// TODO: obsolete (add non mutating version that handles class to common lib)
// TODO: would be great to make this a non mutating fxn, just need
// to figure out how to retain all of the class info on newly created objects
// if obj.propName does not exist add [propName]: propval to it
// return true if prop added, false if not
// mutating obj, because it is likely an Error object, and we don't want to loose all the class junk
// export const addPropIfMissing = (propName, propVal, obj) => {
//   if (doesNotHave(propName, obj)) {
//     obj[propName] = propVal
//     return true
//   }
//   return false
// }

// export const addPropIfNillOrEmpty = (propName, propVal, obj) => {
//   if (propIsNilOrEmpty(propName, obj)) {
//     obj[propName] = propVal
//     return true
//   }
//   return false
// }



// TODO: would be great to make this a non mutating fxn, just need
// to figure out how to retain all of the class info on newly created objects
// if obj.propName does not exist or obj.propName == valToCheckAtainst,
// add [propName]: propval to it return true if prop added, false if not
// mutating obj, because it is likely an Error object, and we don't want to loose all the class junk
export const addPropIfMissingOrEq = (propName, valToCheckAtainst, newPropVal, obj) => {
  if (doesNotHave(propName, obj) || propEq(propName, valToCheckAtainst, obj)) {
    obj[propName] = newPropVal
    return true
  }
  return false
}

// given a string or array of strings, prepended with the specified tab
// (['']|'', '') -> [''] | ''
export const tab = (tabMe='', tab='  ') => {
  if (isStringArray(tabMe)) return tabMe.map(str => `${tab}${str}`)
  else if (isString(tabMe)) return `${tab}${tabMe}`
  else return tabMe
}

export const msgListToStr = (msgList, appendTo='', pre='') => {
  const strings = arrayify(msgList)
  if (isNotStringArray(strings)) return appendTo
  return msgList.reduce((acc, cur, i) =>
    concat(acc, `${pre}${cur}${i<strings.length-1?'\n':''}`), appendTo/* appendTo?`${appendTo}\n`:''*/)
}

export const stackStrToArr = stackStr =>
  // drop error message from stack list
  drop(1, stackStr.split('\n').map(s => s.trim()))

export const stackArrToStr = (msg, stackArr) =>
  msgListToStr(stackArr, `Error: ${msg}\n`, '    ')



