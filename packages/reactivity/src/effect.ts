export class ReactiveEffect<T = any> {
  constructor(
    public fn: () => T,
  ) {}

  run() {
    return this.fn()
  }
}

export function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}
