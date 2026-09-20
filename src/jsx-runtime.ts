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

export type Component<P = Props> = (props: P) => Node

export type DOMEventHandler<T extends EventTarget, E extends Event> = (
  event: E & { currentTarget: T }
) => void

export type EventProps<T extends HTMLElement> = {
  onClick?: DOMEventHandler<T, MouseEvent>
  onInput?: DOMEventHandler<T, InputEvent>
  onChange?: DOMEventHandler<T, Event>
  onFocus?: DOMEventHandler<T, FocusEvent>
  onBlur?: DOMEventHandler<T, FocusEvent>
  onKeyDown?: DOMEventHandler<T, KeyboardEvent>
  onKeyUp?: DOMEventHandler<T, KeyboardEvent>
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
  export type Element = Node

  export interface IntrinsicElements {
    div: ElementProps<HTMLDivElement>
    span: ElementProps<HTMLSpanElement>
    form: ElementProps<HTMLFormElement> & { onSubmit?: DOMEventHandler<HTMLFormElement, SubmitEvent> }
    label: ElementProps<HTMLLabelElement>
    input: ElementProps<HTMLInputElement>
    textarea: ElementProps<HTMLTextAreaElement>
    select: ElementProps<HTMLSelectElement>
    option: ElementProps<HTMLOptionElement>
    button: ElementProps<HTMLButtonElement>
    a: ElementProps<HTMLAnchorElement>
    h1: ElementProps<HTMLHeadingElement>
    h2: ElementProps<HTMLHeadingElement>
    h3: ElementProps<HTMLHeadingElement>
    p: ElementProps<HTMLParagraphElement>
    ul: ElementProps<HTMLUListElement>
    ol: ElementProps<HTMLOListElement>
    li: ElementProps<HTMLLIElement>
    section: ElementProps<HTMLElement>
    article: ElementProps<HTMLElement>
    header: ElementProps<HTMLElement>
    footer: ElementProps<HTMLElement>
    main: ElementProps<HTMLElement>
  }
}

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
