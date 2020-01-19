import { flatten } from 'ramda'
import { isArray } from 'ramda-adjunct'

export const plainObject = classInstance => Object.assign({}, classInstance)
export const arrayify = input => isArray(input) ? input : [input]
export const flatArrayify = input => flatten(arrayify(input))
