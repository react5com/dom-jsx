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

export type ElementProps<T extends HTMLElement> =
  Partial<Omit<T, 'children' | 'style' | 'className'>> &
  EventProps<T> & {
    class?: string
    style?: Partial<CSSStyleDeclaration>
    children?: unknown
  }

export namespace JSX {
  type Element = Node

  type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]>
  } & {
    form: ElementProps<HTMLFormElement> & {
      onSubmit?: DOMEventHandler<HTMLFormElement, SubmitEvent>
    }
  }
}

export declare function jsx(
  tag: string | ((props: any) => Node),
  props: import('./jsx-runtime').Props | null,
  key?: string | number
): Node

export declare const jsxs: typeof jsx
export declare function Fragment(props: import('./jsx-runtime').Props): DocumentFragment
