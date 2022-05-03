import { Target, ReactiveFlags, reactiveMap, reactive, isReadonly, isShallow, toRaw } from './reactive'
import { TrackOpTypes } from './operations'
import { isRef } from './ref'
import { isObject } from '@lite2uv/shared'

const get = createGetter()

function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      // reactive对象是只读的则不是纯reactive对象
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      // 是否浅拷贝
      return shallow
    } else if (
      // 如果可以是内置raw属性，且receiver存在于reactive map中，则返回raw属性
      key === ReactiveFlags.RAW &&
      receiver ===
      (isReadonly
        ? shallow
          ? new WeakMap()
          : new WeakMap()
        : shallow
          ? new WeakMap()
          : reactiveMap
      ).get(target)
    ) {
      return target
    }
    // TODO: collection获取

    if (!isReadonly) {
      // TODO: track 
    }

    // 其它key的获取
    const res = Reflect.get(target, key, receiver)
    
    // TODO: ref获取

    if (isObject(res)) {
      return reactive(res)// isReadonly ? 
    }
    
    return res
  }
}

const set = createSetter()
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      // 往reactive对象中设置值，如果原属性是ref且是只读 同时新值不是ref 新值无法赋值成功
      return false
    }
    if (!shallow && !isReadonly(value)) {
      if (!isShallow(value)) {
        value = toRaw(value)
        oldValue = toRaw(oldValue)
      }
      // TODO: if not array
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const result = Reflect.set(target, key, value, receiver)
    // TODO: trigger

    return result
  }
}



export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  // deleteProperty,
  // has,
  // ownKeys
}