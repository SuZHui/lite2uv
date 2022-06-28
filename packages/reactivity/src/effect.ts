import { extend, isArray } from "@lite2uv/shared"
import { ComputedRefImpl } from "./computed"
import { createDep, Dep, newTracked, wasTracked } from "./dep"
import { TrackOpTypes, TriggerOpTypes } from "./operations"

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// The number of effects currently being tracked recursively.
// 当前effects递归的深度
let effectTrackDepth = 0

// ReactiveEffect.run时会更新该操作位
export let trackOpBit = 1

/**
 * @link https://www.zhihu.com/question/62732293 what is SMI
 *
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 */
const maxMarkerBits = 30

export type EffectScheduler = (...args: any[]) => any

export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  /**
   * Can be attached after creation
   * @internal
   */
  computed?: ComputedRefImpl<T>
  /**
   * @internal
   */
  allowRecurse?: boolean
  /**
   * @internal
   */
  private deferStop?: boolean

  onStop?: () => void
  // dev only
  onTrack?: (event: DebuggerEvent) => void
  // dev only
  onTrigger?: (event: DebuggerEvent) => void

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
  ) {}

  run() {
    return this.fn()
  }
}

export function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

export let shouldTrack = true

export function trackEffects(dep: Dep, debuggerEventExtraInfo?: DebuggerEventExtraInfo) {
  let shouldTrack = false
  // 如果当前依赖收集的深度未达到最大深度
  if (effectTrackDepth <= maxMarkerBits) {
    // 如果没有依赖没有新的跟踪
    if (!newTracked(dep)) {
      // 为其设置新的依赖跟踪，相当于重置为0
      dep.n |= trackOpBit
      // 如果没有被跟踪项 为true
      shouldTrack = !wasTracked(dep)
    }
  } else {
    // Full cleanup mode.
    // 依赖中不包含当前的effect才进行跟踪操作
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    dep.add(activeEffect!)
    activeEffect!.deps.push(dep)
    if (__DEV__ && activeEffect!.onTrack) {
      activeEffect!.onTrack({
        effect: activeEffect!,
        ...debuggerEventExtraInfo!
      })
    }
  }
}

// 依赖收集
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
    const depsMap = targetMap.get(target)
    // 未被依赖收集
    if (!depsMap) {
      return
    }

    let deps: (Dep | undefined)[] = []
    if (type === TriggerOpTypes.CLEAR) {
      // TODO: Map Set的clear操作
      // TODO: 设置 collection length 属性(修改数组长度)
    } else {
      // run SET | ADD | DELETE
      if (key !== void 0 /** undefined */ ) {
        deps.push(depsMap.get(key))
      }

      switch (type) {
        case TriggerOpTypes.ADD:
          if (!isArray(target)) {
            deps.push(depsMap.get(ITERATE_KEY))
          }
          // TODO: array add
          break
      }

      const eventInfo = __DEV__
      ? { target, type, key, newValue, oldValue, oldTarget }
      : undefined

    if (deps.length === 1) {
      if (deps[0]) {
        if (__DEV__) {
          triggerEffects(deps[0], eventInfo)
        } else {
          triggerEffects(deps[0])
        }
      }
    } else {
      const effects: ReactiveEffect[] = []
      for (const dep of deps) {
        if (dep) {
          effects.push(...dep)
        }
      }
      if (__DEV__) {
        triggerEffects(createDep(effects), eventInfo)
      } else {
        triggerEffects(createDep(effects))
      }
    }
  }
}

export function triggerEffects(
  dep: Dep | ReactiveEffect[],
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
}

function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (__DEV__ && effect.onTrigger) {
      effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
    }
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
