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

type MappedEventProps<T extends HTMLElement> = {
  [K in keyof HTMLElementEventMap as
    `on${Capitalize<K & string>}`]?: DOMEventHandler<
      T,
      HTMLElementEventMap[K]
    >
}

export type EventProps<T extends HTMLElement> =
  Omit<MappedEventProps<T>, 'onInput' | 'onDblclick'> & {
    // HTMLElementEventMap types input as Event, but InputEvent is more useful
    // for the input events handled by this runtime.
    onInput?: DOMEventHandler<T, InputEvent>

    // Capitalize<> only changes the first character, while JSX conventions
    // use onDblClick for the dblclick event.
    onDblClick?: DOMEventHandler<T, MouseEvent>
  }

export type Ref<T> = { current: T | null } | ((el: T) => void)

export type ElementProps<T extends HTMLElement> =
  Partial<Omit<T, 'children' | 'style' | 'className'>> &
  EventProps<T> & {
    class?: string
    style?: Partial<CSSStyleDeclaration>
    children?: unknown
    ref?: Ref<T>
  }

export function createRef<T>(): { current: T | null } {
  return { current: null }
}

export namespace JSX {
  // TypeScript uses this type for every JSX expression. It cannot preserve
  // the concrete return type of a function component here, so keep the DOM
  // node type while allowing components to attach a `context` property for
  // their own API, without opening up arbitrary properties on the node itself.
  export type Element = Node & { context?: Record<string, any> }

  export type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]>
  }
}

export function jsx<R extends Node>(
  tag: (props: any) => R,
  props: Props | null,
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
    return tag(actualProps)
  }

  const element = document.createElement(tag)

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

    if (key === 'class') {
      element.className = String(value ?? '')
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
