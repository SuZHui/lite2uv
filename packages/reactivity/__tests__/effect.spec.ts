import { effect } from '../src/index'

describe('reactivity/effect', () => {
  it('should run the passed function once (wrapped by a effect)', () => {
    const fnSpy = jest.fn()
    effect()
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })
})
