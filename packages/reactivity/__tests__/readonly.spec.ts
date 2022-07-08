import { isReactive, readonly, isProxy, isReadonly, effect } from "../src"

/**
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
 */
type Writable<T> = { -readonly [P in keyof T]: T[P] }

describe('reactivity/readonly', () => {
  describe('Object', () => {
    it('should make nested values readonly', () => {
      const original = { foo: 1, bar: { baz: 2 } }
      const wrapped = readonly(original)
      expect(wrapped).not.toBe(original)
      expect(isProxy(wrapped)).toBe(true)
      expect(isReactive(wrapped)).toBe(false)
      expect(isReadonly(wrapped)).toBe(true)
      expect(isReactive(original)).toBe(false)
      expect(isReadonly(original)).toBe(false)
      expect(isReactive(wrapped.bar)).toBe(false)
      expect(isReadonly(wrapped.bar)).toBe(true)
      expect(isReactive(original.bar)).toBe(false)
      expect(isReadonly(original.bar)).toBe(false)
      // get
      expect(wrapped.foo).toBe(1)
      // has
      expect('foo' in wrapped).toBe(true)
      // ownKeys
      expect(Object.keys(wrapped)).toEqual(['foo', 'bar'])
    })

    it('should not allow mutation', () => {
      const qux = Symbol('qux')
      const original = {
        foo: 1,
        bar: {
          baz: 2
        },
        [qux]: 3
      }
      const wrapped: Writable<typeof original> = readonly(original)

      wrapped.foo = 2
      expect(wrapped.foo).toBe(1)
      expect(
        `Set operation on key "foo" failed: target is readonly.`
      ).toHaveBeenWarnedLast()

      wrapped.bar.baz = 3
      expect(wrapped.bar.baz).toBe(2)
      expect(
        `Set operation on key "baz" failed: target is readonly.`
      ).toHaveBeenWarnedLast()

      wrapped[qux] = 4
      expect(wrapped[qux]).toBe(3)
      expect(
        `Set operation on key "Symbol(qux)" failed: target is readonly.`
      ).toHaveBeenWarnedLast()

      // @ts-expect-error
      delete wrapped.foo
      expect(wrapped.foo).toBe(1)
      expect(
        `Delete operation on key "foo" failed: target is readonly.`
      ).toHaveBeenWarnedLast()

      // @ts-expect-error
      delete wrapped.bar.baz
      expect(wrapped.bar.baz).toBe(2)
      expect(
        `Delete operation on key "baz" failed: target is readonly.`
      ).toHaveBeenWarnedLast()

      // @ts-expect-error
      delete wrapped[qux]
      expect(wrapped[qux]).toBe(3)
      expect(
        `Delete operation on key "Symbol(qux)" failed: target is readonly.`
      ).toHaveBeenWarnedLast()
    })

    it('should not trigger effects', () => {
      const wrapped: any = readonly({ a: 1 })
      let dummy
      effect(() => {
        dummy = wrapped.a
      })
      expect(dummy).toBe(1)
      wrapped.a = 2
      expect(wrapped.a).toBe(1)
      expect(dummy).toBe(1)
      expect(`target is readonly`).toHaveBeenWarned()
    })
  })
})