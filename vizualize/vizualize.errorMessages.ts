import { makeFerr, fErrStr } from '../src/ferr'


// return an Error object given with the additional props in errInfo added, and message set to msg
// errInfo {
//   op: 'operation'
//   code: 'error code string'
//   msg: 'error message'
//   clientMsg: 'message for clients to display'
//   notes: ['notes', 'about', 'the', 'error']
// }
// if isString(errInfo), then errInfo is assumed to be 'msg' (i.e. an error message)
// {} | '' => FErr

let fErr = null
const errInfo = {
  message: 'Hey developer, some bad stuff happened',
  op: 'Operation',
  code: 'ERROR_CODE',
  clientMsg: 'Hey client, that did not work',
  notes: ['you probably should grab a beer', 'I would reccomend a nice IPA'],
  externalExp: new Error('exception, this could be bad'),
}


console.log('\n... fErr with just an error message\n')
fErr = makeFerr('An string only fErr error message')
console.log(fErrStr(fErr))

console.log('\n... fErr without exception\n')
const errInfoWithoutExternalExp = { ...errInfo }
delete errInfoWithoutExternalExp.externalExp
fErr = makeFerr(errInfoWithoutExternalExp)
console.log(fErrStr(fErr))

console.log('\n... fErr with exception\n')
fErr = makeFerr(errInfo)
console.log(fErrStr(fErr))
