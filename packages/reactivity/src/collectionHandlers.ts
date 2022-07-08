import { hasOwn } from "@lite2uv/shared";
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track } from "./effect";
import { TrackOpTypes } from "./operations";
import { ReactiveFlags, toRaw, toReactive } from "./reactive";

export type CollectionTypes = IterableCollections | WeakCollections;

type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type MapTypes = Map<any, any> | WeakMap<any, any>
type SetTypes = Set<any> | WeakSet<any>

const toShallow = <T extends unknown>(value: T): T => value

const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)

function get(
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false
) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = (target as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
  }
  const { has } = getProto(rawTarget)
  // TODO: toReadonly
  const wrap = isShallow ? toShallow : isReadonly ? toReactive : toReactive
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  } else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key)
  }
}

function createIterableMethod(
  method: string | symbol,
  isReadonly: boolean,
  isShallow: boolean
) {
  return function (
    this: IterableCollections,
    ...args: unknown[]
  ): Iterable & Iterator {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair =
      method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly &&
      track(
        rawTarget,
        TrackOpTypes.ITERATE,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      )
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

function createInstrumentations() {
  const mutableInstrumentations: Record<string, Function> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key)
    },
    get size() {
      return size(this as unknown as IterableCollections)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false)
  }

  // const shallowInstrumentations: Record<string, Function> = {
  //   get(this: MapTypes, key: unknown) {
  //     return get(this, key, false, true)
  //   },
  //   get size() {
  //     return size(this as unknown as IterableCollections)
  //   },
  //   has,
  //   add,
  //   set,
  //   delete: deleteEntry,
  //   clear,
  //   forEach: createForEach(false, true)
  // }

  // const readonlyInstrumentations: Record<string, Function> = {
  //   get(this: MapTypes, key: unknown) {
  //     return get(this, key, true)
  //   },
  //   get size() {
  //     return size(this as unknown as IterableCollections, true)
  //   },
  //   has(this: MapTypes, key: unknown) {
  //     return has.call(this, key, true)
  //   },
  //   add: createReadonlyMethod(TriggerOpTypes.ADD),
  //   set: createReadonlyMethod(TriggerOpTypes.SET),
  //   delete: createReadonlyMethod(TriggerOpTypes.DELETE),
  //   clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
  //   forEach: createForEach(true, false)
  // }

  // const shallowReadonlyInstrumentations: Record<string, Function> = {
  //   get(this: MapTypes, key: unknown) {
  //     return get(this, key, true, true)
  //   },
  //   get size() {
  //     return size(this as unknown as IterableCollections, true)
  //   },
  //   has(this: MapTypes, key: unknown) {
  //     return has.call(this, key, true)
  //   },
  //   add: createReadonlyMethod(TriggerOpTypes.ADD),
  //   set: createReadonlyMethod(TriggerOpTypes.SET),
  //   delete: createReadonlyMethod(TriggerOpTypes.DELETE),
  //   clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
  //   forEach: createForEach(true, true)
  // }

  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
  iteratorMethods.forEach(method => {
    mutableInstrumentations[method as string] = createIterableMethod(
      method,
      false,
      false
    )
    readonlyInstrumentations[method as string] = createIterableMethod(
      method,
      true,
      false
    )
    shallowInstrumentations[method as string] = createIterableMethod(
      method,
      false,
      true
    )
    shallowReadonlyInstrumentations[method as string] = createIterableMethod(
      method,
      true,
      true
    )
  })

  return [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations
  ]
}

const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations
] = /* #__PURE__*/ createInstrumentations()

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  return (
    target: CollectionTypes,
    key: string | symbol,
    receiver: CollectionTypes
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false)
}