import { hasChanged } from '@lite2uv/shared'
import { toReactive, toRaw } from './reactive'
import { activeEffect, shouldTrack, trackEffects, triggerEffects } from './effect'
import { createDep, Dep } from './dep'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { CollectionTypes } from './collectionHandlers'

declare const RefSymbol: unique symbol

export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
}

type RefBase<T> = {
  dep?: Dep
  value: T
}

export function trackRefValue(ref: RefBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    if (__DEV__) {
      trackEffects(ref.dep || (ref.dep = createDep()), {
        target: ref,
        type: TrackOpTypes.GET,
        key: 'value'
      })
    } else {
      trackEffects(ref.dep || (ref.dep = createDep()))
    }
  }
}

// 包装ref的依赖触发
export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ref = toRaw(ref);
  if (ref.dep) {
    if (__DEV__) {
      triggerEffects(ref.dep, {
        target: ref,
        type: TriggerOpTypes.SET,
        key: 'value',
        newValue: newVal
      })
    } else {
      triggerEffects(ref.dep)
    }
  }
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

// export function ref<T extends object>(
//   value: T
// ): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
// export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(value: T): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value, false)
}

declare const ShallowRefMarker: unique symbol

export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true }

export function shallowRef<T extends object>(
  value: T
): T extends Ref ? T : ShallowRef<T>
export function shallowRef<T>(value: T): ShallowRef<T>
export function shallowRef<T = any>(): ShallowRef<T | undefined>
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}

function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    // TODO: 收集ref依赖
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    newVal = this.__v_isShallow ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = this.__v_isShallow ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}

// export type UnwrapRef<T> = T extends ShallowRef<infer V>
//   ? V
//   : T extends Ref<infer V>
//   ? UnwrapRefSimple<V>
//   : UnwrapRefSimple<T>

// export type UnwrapRefSimple<T> = T extends
//   | Function
//   | CollectionTypes
//   | BaseTypes
//   | Ref
//   | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
//   | { [RawSymbol]?: true }
//   ? T
//   : T extends Array<any>
//   ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
//   : T extends object & { [ShallowReactiveMarker]?: never }
//   ? {
//       [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
//     }
//   : T