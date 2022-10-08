import { effect } from '../src/effect'
import { isReactive, isShallow, reactive, shallowReactive, shallowReadonly } from '../src/reactive'
import { isRef, Ref, ref } from '../src/ref'

describe('shallowReactive', () => {
  it('should not make non-reactive properties reactive', () => {
    const props = shallowReactive({ n: { foo: 1 } })
    expect(isReactive(props.n)).toBeFalsy()
  })

  it('should keep reactive properties reactive', () => {
    const props = shallowReactive({ n: reactive({ foo: 1 }) })
    props.n = reactive({ foo: 2 })
    expect(isReactive(props.n)).toBeTruthy()
  })

  it('should allow shallow and normal reactive for same target', () => {
    const original = { foo: {} }
    const shallowProxy = shallowReactive(original)
    const reactiveProxy = reactive(original)
    expect(shallowProxy).not.toBe(reactiveProxy)
    expect(isReactive(shallowProxy.foo)).toBeFalsy()
    expect(isReactive(reactiveProxy.foo)).toBeTruthy()
  })

  it('isShallow', () => {
    expect(isShallow(shallowReactive({}))).toBeTruthy()
    expect(isShallow(shallowReadonly({}))).toBeTruthy()
  })

  it('should respect shallow reactive nested inside reactive on reset', () => {
    const r = reactive({ foo: shallowReactive({ bar: {} }) })
    expect(isShallow(r.foo)).toBeTruthy()
    expect(isReactive(r.foo.bar)).toBeFalsy()

    r.foo = shallowReactive({ bar: {} })
    expect(isShallow(r.foo)).toBeTruthy()
    expect(isReactive(r.foo.bar)).toBeFalsy()
  })

  it('should not unwrap refs', () => {
    const foo = shallowReactive({
      bar: ref(123)
    })
    expect(isRef(foo.bar)).toBeTruthy()
    expect(foo.bar.value).toBe(123)
  })

  it('should not mutate refs', () => {
    const original = ref(123)
    const foo = shallowReactive<{ bar: Ref<number> | number }>({
      bar: original
    })
    expect(foo.bar).toBe(original)
    foo.bar = 234
    expect(foo.bar).toBe(234)
    expect(original.value).toBe(123)
  })

  it('should respect shallow/deep versions of same target on access', () => {
    const original = {}
    const shallow = shallowReactive(original)
    const deep = reactive(original)
    const r = reactive({ shallow, deep })
    expect(r.shallow).toBe(shallow)
    expect(r.deep).toBe(deep)
  })

  describe('collections', () => {
    it('should be reactive', () => {
      const shallowSet = shallowReactive(new Set())
      const a = {}
      let size

      effect(() => {
        size = shallowSet.size
      })

      expect(size).toBe(0)

      shallowSet.add(a)
      expect(size).toBe(1)

      shallowSet.delete(a)
      expect(size).toBe(0)
    })

    it('should not observe when iterating', () => {
      const shallowSet = shallowReactive(new Set())
      const a = {}
      shallowSet.add(a)

      const spreadA = [...shallowSet][0]
      expect(isReactive(spreadA)).toBeFalsy()
    })

    it('should not get reactive entry', () => {
      const shallowMap = shallowReactive(new Map())
      const a = {}
      const key = 'a'

      shallowMap.set(key, a)

      expect(isReactive(shallowMap.get(key))).toBeFalsy()
    })

    it('should not get reactive on foreach', () => {
      const shallowSet = shallowReactive(new Set())
      const a = {}
      shallowSet.add(a)

      shallowSet.forEach(x => expect(isReactive(x)).toBe(false))
    })

    it('onTrack on called on objectSpread', () => {
      const onTrackFn = jest.fn()
      const shallowSet = shallowReactive(new Set())
      let a
      effect(
        () => {
          a = Array.from(shallowSet)
        },
        {
          onTrack: onTrackFn
        }
      )

      expect(a).toMatchObject([])
      expect(onTrackFn).toHaveBeenCalled()
    })
  })

  describe('array', () => {
    it('should be reactive', () => {
      const shallowArray = shallowReactive<unknown[]>([])
      const a = {}
      let size

      effect(() => {
        size = shallowArray.length
      })

      expect(size).toBe(0)

      shallowArray.push(a)
      expect(size).toBe(1)

      shallowArray.pop()
      expect(size).toBe(0)
    })

    it('should not observe when iterating', () => {
      const shallowArray = shallowReactive<object[]>([])
      const a = {}
      shallowArray.push(a)

      const spreadA = [...shallowArray][0]
      expect(isReactive(spreadA)).toBe(false)
    })

    it('onTrack on called on objectSpread', () => {
      const onTrackFn = jest.fn()
      const shallowArray = shallowReactive([])
      let a
      effect(
        () => {
          a = Array.from(shallowArray)
        },
        {
          onTrack: onTrackFn
        }
      )

      expect(a).toMatchObject([])
      expect(onTrackFn).toHaveBeenCalled()
    })
  })
})