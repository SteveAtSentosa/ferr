import { greeter } from '../ferr'

test('Greeter', () => {
  expect(greeter('you')).toBe('Yo you')
})