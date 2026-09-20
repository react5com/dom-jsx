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

  interface IntrinsicElements {
    div: ElementProps<HTMLDivElement>
    span: ElementProps<HTMLSpanElement>

    form: ElementProps<HTMLFormElement> & {
      onSubmit?: DOMEventHandler<HTMLFormElement, SubmitEvent>
    }

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

export declare function jsx(
  tag: string | ((props: any) => Node),
  props: import('./jsx-runtime').Props | null,
  key?: string | number
): Node

export declare const jsxs: typeof jsx
export declare function Fragment(props: import('./jsx-runtime').Props): DocumentFragment
