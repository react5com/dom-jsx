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

export type ElementProps<T extends HTMLElement> =
  Partial<Omit<T, 'children' | 'style' | 'className'>> &
  EventProps<T> & {
    class?: string
    style?: Partial<CSSStyleDeclaration>
    children?: unknown
  }

export namespace JSX {
  // TypeScript cannot preserve a function component's concrete return type
  // for a JSX expression. Keep DOM-node members and permit component APIs.
  type Element = Node & Record<string, any>

  type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]>
  }
}

export declare function jsx<R extends Node>(
  tag: (props: any) => R,
  props: import('./jsx-runtime').Props | null,
  key?: string | number
): R
export declare function jsx(
  tag: string,
  props: import('./jsx-runtime').Props | null,
  key?: string | number
): Node

export declare const jsxs: typeof jsx
export declare function Fragment(props: import('./jsx-runtime').Props): DocumentFragment
