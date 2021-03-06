import { effect, reactive } from '../src/index'

describe('reactivity/effect', () => {
  // `effect`会执行一次传入的函数
  it('should run the passed function once (wrapped by a effect)', () => {
    const fnSpy = jest.fn()
    effect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  // 可监听对象基础属性的变化
  it.skip('should observe basic properties', () => {
    // let dummy
    // const counter = reactive({ num: 0 })
    // effect(() => (dummy = counter.num))

    // expect(dummy).toBe(0)
    // counter.num = 7
    // expect(dummy).toBe(7)
  })
})
