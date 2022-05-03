import { mutableHandlers } from './baseHandlers'

export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}

export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

// { reactive(obj) : obj }
export const reactiveMap = new WeakMap<Target, any>()

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
): any {
  const proxy = new Proxy(target, baseHandlers)
  return proxy
}

export function reactive<T extends object>(target: T) {
  if (isReadonly(target)) return target
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    reactiveMap
  )
}

export function isReactive (value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}
