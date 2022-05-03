import { Target, ReactiveFlags, reactiveMap, reactive } from './reactive'
import { isObject } from '@lite2uv/shared'

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

    // 其它key的获取
    const res = Reflect.get(target, key, receiver)
    
    // TODO: ref获取

    if (isObject(res)) {
      return reactive(res)// isReadonly ? 
    }
    
    return res
  }
}

const get = createGetter()

export const mutableHandlers: ProxyHandler<object> = {
  get,
  // set,
  // deleteProperty,
  // has,
  // ownKeys
}