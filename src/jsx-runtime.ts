export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | Child[]

export type Props = Record<string, unknown> & {
  children?: Child | Child[]
}

export type Component<P = Props, R extends Node = Node> = (props: P) => R

export type DOMEventHandler<T extends EventTarget, E extends Event> = (
  event: E & { currentTarget: T }
) => void

// DOM event names contain no word boundaries, so spell out compound JSX names.
type CompoundEventName =
  | 'AnimationCancel' | 'AnimationEnd' | 'AnimationIteration' | 'AnimationStart'
  | 'AuxClick' | 'BeforeInput' | 'BeforeMatch' | 'BeforeToggle'
  | 'CanPlay' | 'CanPlayThrough'
  | 'CompositionEnd' | 'CompositionStart' | 'CompositionUpdate'
  | 'ContextLost' | 'ContextMenu' | 'ContextRestored' | 'CueChange' | 'DblClick'
  | 'DragEnd' | 'DragEnter' | 'DragLeave' | 'DragOver' | 'DragStart'
  | 'DurationChange' | 'FocusIn' | 'FocusOut' | 'FormData'
  | 'FullscreenChange' | 'FullscreenError'
  | 'GotPointerCapture' | 'LostPointerCapture'
  | 'KeyDown' | 'KeyPress' | 'KeyUp'
  | 'LoadedData' | 'LoadedMetadata' | 'LoadStart'
  | 'MouseDown' | 'MouseEnter' | 'MouseLeave' | 'MouseMove' | 'MouseOut' | 'MouseOver' | 'MouseUp'
  | 'PointerCancel' | 'PointerDown' | 'PointerEnter' | 'PointerLeave'
  | 'PointerMove' | 'PointerOut' | 'PointerOver' | 'PointerRawUpdate' | 'PointerUp'
  | 'RateChange' | 'ScrollEnd' | 'SecurityPolicyViolation'
  | 'SelectionChange' | 'SelectStart' | 'SlotChange' | 'TimeUpdate'
  | 'TouchCancel' | 'TouchEnd' | 'TouchMove' | 'TouchStart'
  | 'TransitionCancel' | 'TransitionEnd' | 'TransitionRun' | 'TransitionStart'
  | 'VolumeChange' | 'WaitingForKey' | 'WebkitAnimationEnd'
  | 'WebkitAnimationIteration' | 'WebkitAnimationStart' | 'WebkitTransitionEnd'

type CompoundEventNames = {
  [K in CompoundEventName as Lowercase<K>]: K
}

type EventPropName<K extends string> =
  K extends keyof CompoundEventNames
    ? `on${CompoundEventNames[K]}`
    : `on${Capitalize<K>}`

type MappedEventProps<T extends HTMLElement> = {
  [K in keyof HTMLElementEventMap as
    EventPropName<K & string>]?: DOMEventHandler<
      T,
      HTMLElementEventMap[K]
    >
}

export type EventProps<T extends HTMLElement> =
  Omit<MappedEventProps<T>, 'onInput'> & {
    // HTMLElementEventMap types input as Event, but InputEvent is more useful
    // for the input events handled by this runtime.
    onInput?: DOMEventHandler<T, InputEvent>
  }

export type Ref<T> = { current: T | null } | ((el: T) => void)

export type ElementProps<T extends HTMLElement> =
  Partial<Omit<T, 'children' | 'style' | 'className'>> &
  EventProps<T> & {
    class?: string
    className?: string
    style?: Partial<CSSStyleDeclaration>
    children?: unknown
    ref?: Ref<T>
  }

export function createRef<T>(): { current: T | null } {
  return { current: null }
}

export type ProviderProps<T> = {
  value: T
  children: () => Child
}

export type Context<T> = {
  Provider: (props: ProviderProps<T>) => Node
}

const contextStacks = new WeakMap<Context<any>, { defaultValue: unknown, stack: unknown[] }>()

// JSX is evaluated eagerly from the inside out, so children are created before
// the Provider function runs. Providers therefore take a render function as
// their child and invoke it while their value is on the stack.
export function createContext<T>(defaultValue: T): Context<T> {
  const stack: T[] = []

  const context: Context<T> = {
    Provider({ value, children }) {
      if (typeof children !== 'function') {
        throw new TypeError(
          'Context Provider expects a single function child: {() => ...}'
        )
      }

      stack.push(value)
      try {
        const result = children()
        if (result instanceof Node) {
          return result
        }
        const fragment = document.createDocumentFragment()
        appendChildren(fragment, result)
        return fragment
      } finally {
        stack.pop()
      }
    }
  }

  contextStacks.set(context, { defaultValue, stack })
  return context
}

// Reads the nearest Provider value. Call it synchronously while rendering
// (e.g. in a component body); after rendering it returns the default value.
export function useContext<T>(context: Context<T>): T {
  const entry = contextStacks.get(context)
  if (!entry) {
    throw new TypeError('useContext expects a context created by createContext')
  }
  const { defaultValue, stack } = entry
  return (stack.length > 0 ? stack[stack.length - 1] : defaultValue) as T
}

// Internal cleanups receive the dispose error list so a group of cleanups can
// report each failure separately.
type Cleanup = (errors: unknown[]) => void

const cleanups = new WeakMap<Node, Cleanup[]>()

type Frame = {
  // Cleanups registered by onCleanup in this component body.
  cleanups: (() => void)[]
  // Top-level nodes of components rendered while this one was rendering.
  rendered: Node[]
}

// One frame per component currently rendering. onCleanup adds to the top
// frame; when the component returns, the frame is attached to its node.
const cleanupFrames: Frame[] = []

function addCleanup(node: Node, cleanup: Cleanup): void {
  const list = cleanups.get(node)
  if (list) {
    list.push(cleanup)
  } else {
    cleanups.set(node, [cleanup])
  }
}

// Registers fn to run when dispose() is called on node or an ancestor.
export function onDispose(node: Node, fn: () => void): void {
  addCleanup(node, () => fn())
}

// Registers fn to run when the node returned by the component currently
// rendering is disposed. Call it synchronously in a component body.
export function onCleanup(fn: () => void): void {
  const frame = cleanupFrames[cleanupFrames.length - 1]
  if (!frame) {
    throw new Error(
      'onCleanup must be called while a component is rendering; use onDispose(node, fn) instead'
    )
  }
  frame.cleanups.push(fn)
}

// The DOM gives no synchronous signal when a node is removed, so call this
// explicitly when discarding content, e.g. old.replaceWith(next); dispose(old).
// Runs cleanups of every descendant before the node's own, each node's in
// reverse registration order. A node that is only moved is never disposed.
export function dispose(node: Node): void {
  const errors: unknown[] = []
  disposeTree(node, errors)
  if (errors.length === 1) {
    throw errors[0]
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple cleanups failed during dispose')
  }
}

function disposeTree(node: Node, errors: unknown[]): void {
  // Snapshot the children: a cleanup may detach nodes.
  for (const child of Array.from(node.childNodes)) {
    disposeTree(child, errors)
  }

  const list = cleanups.get(node)
  if (!list) {
    return
  }
  cleanups.delete(node)
  for (let i = list.length - 1; i >= 0; i--) {
    try {
      list[i](errors)
    } catch (error) {
      errors.push(error)
    }
  }
}

function runCleanups(fns: (() => void)[], errors: unknown[]): void {
  for (let i = fns.length - 1; i >= 0; i--) {
    try {
      fns[i]()
    } catch (error) {
      errors.push(error)
    }
  }
}

function collectNodes(value: unknown, nodes: Node[]): void {
  if (value instanceof Node) {
    nodes.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectNodes(item, nodes)
    }
  }
}

// Disposes what a failed render leaves behind: its own cleanups, components it
// rendered, and JSX passed in props, which is created before the component
// runs. Connected nodes were placed in the document on purpose, so keep them.
function discardFailedRender(frame: Frame, props: Props): void {
  const errors: unknown[] = []
  const nodes: Node[] = [...frame.rendered]
  for (const value of Object.values(props)) {
    collectNodes(value, nodes)
  }
  for (const node of nodes) {
    if (!node.isConnected) {
      disposeTree(node, errors)
    }
  }
  runCleanups(frame.cleanups, errors)
  // The render error is the one worth reporting, so errors are dropped.
}

function renderComponent(tag: Component, props: Props): Node {
  const frame: Frame = { cleanups: [], rendered: [] }
  cleanupFrames.push(frame)
  let node: Node
  try {
    node = tag(props)
  } catch (error) {
    cleanupFrames.pop()
    discardFailedRender(frame, props)
    throw error
  }
  cleanupFrames.pop()

  // A fragment empties once inserted, so use its top-level children. An empty
  // fragment gets a comment anchor so its cleanups reach the DOM with it.
  let targets: Node[] = [node]
  if (node instanceof DocumentFragment) {
    if (!node.firstChild && frame.cleanups.length > 0) {
      node.appendChild(document.createComment(''))
    }
    targets = Array.from(node.childNodes)
  }

  if (frame.cleanups.length > 0) {
    if (targets.length === 1) {
      for (const fn of frame.cleanups) {
        onDispose(targets[0], fn)
      }
    } else {
      // The component is gone only once all of its top-level nodes are
      // disposed, so run its cleanups when the last one is.
      let remaining = targets.length
      for (const target of targets) {
        addCleanup(target, errors => {
          if (--remaining === 0) {
            runCleanups(frame.cleanups, errors)
          }
        })
      }
    }
  }

  cleanupFrames[cleanupFrames.length - 1]?.rendered.push(...targets)

  return node
}

export namespace JSX {
  // TypeScript uses this type for every JSX expression. It cannot preserve
  // the concrete return type of a function component here, so keep the DOM
  // node type while allowing components to attach an `api` property for
  // their own API, without opening up arbitrary properties on the node itself.
  export type Element = Node & { api?: Record<string, any> }

  export type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]>
  }
}

export function jsx<P, R extends Node>(
  tag: (props: P) => R,
  props: {} extends P ? P | null : P,
  _key?: string | number
): R
export function jsx(
  tag: string,
  props: Props | null,
  _key?: string | number
): Node
export function jsx(
  tag: string | ((props: any) => Node),
  props: Props | null,
  _key?: string | number
): Node {
  return createElement(tag, props)
}

export const jsxs = jsx

export function Fragment(props: Props): DocumentFragment {
  const fragment = document.createDocumentFragment()
  appendChildren(fragment, props.children)
  return fragment
}

function createElement(
  tag: string | Component,
  props: Props | null
): Node {
  const actualProps = props ?? {}

  if (typeof tag === 'function') {
    return renderComponent(tag, actualProps)
  }

  const element = document.createElement(tag)

  // className takes precedence over class when both are given, matching
  // React convention. Resolved up front so iteration order of actualProps
  // (an implementation detail) can't affect the outcome.
  if (actualProps.class !== undefined || actualProps.className !== undefined) {
    element.className = String(
      actualProps.className ?? actualProps.class ?? ''
    )
  }

  for (const [key, value] of Object.entries(actualProps)) {
    if (key === 'children') {
      continue
    }

    if (key === 'ref') {
      continue
    }

    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(
        key.slice(2).toLowerCase(),
        value as EventListener
      )
      continue
    }

    if (key === 'class' || key === 'className') {
      continue
    }

    if (key === 'style' && value && typeof value === 'object') {
      Object.assign(element.style, value)
      continue
    }

    if (value == null) {
      continue
    }

    if (key.includes('-')) {
      element.setAttribute(key, String(value))
      continue
    }

    if (key in element) {
      if (value === false) {
        continue
      }

      try {
        ;(element as unknown as Record<string, unknown>)[key] = value
        continue
      } catch {
        // fall back to attribute below
      }
    }

    element.setAttribute(
      key,
      value === true ? '' : String(value)
    )
  }

  appendChildren(element, actualProps.children)

  const ref = actualProps.ref as Ref<Element> | undefined
  if (typeof ref === 'function') {
    ref(element)
  } else if (ref) {
    ref.current = element
  }

  return element
}

function appendChildren(
  parent: Node,
  children: Child | Child[]
): void {
  if (Array.isArray(children)) {
    for (const child of children) {
      appendChildren(parent, child)
    }
    return
  }

  if (children instanceof Node) {
    parent.appendChild(children)
    return
  }

  if (
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== true
  ) {
    parent.appendChild(
      document.createTextNode(String(children))
    )
  }
}
