# @react5/dom-jsx

A small, dependency-free JSX runtime for vanilla TypeScript and JavaScript DOM projects.

## Installation

```sh
npm install @react5/dom-jsx
```

For TypeScript automatic JSX, set these compiler options:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@react5/dom-jsx"
  }
}
```

The runtime also works with Vite. Vite discovers the package's ESM `jsx-runtime` and `jsx-dev-runtime` exports automatically when compiling TSX.

Function components may return DOM nodes with an attached API:

```tsx
type ModalApi = { open(): void; close(): void }

function Modal() {
  const element = <dialog /> as HTMLDialogElement
  const api: ModalApi = {
    open: () => element.showModal(),
    close: () => element.close()
  }

  return Object.assign(element, { api }) satisfies
    HTMLDialogElement & { api: ModalApi }
}

const modal = <Modal />
modal.api?.open()
```

TypeScript represents all JSX expressions with one `JSX.Element` type, so it
cannot preserve the exact intersection type of an individual component in
TSX. The library's JSX element type therefore allows an optional `api`
property, typed loosely as `Record<string, any>`, on every JSX result.
Accessing any other property directly on the node (e.g. a typo'd DOM
property) is still checked normally. `api` is optional because plain
intrinsic elements don't have one, so calling through it via `<Tag />` JSX
syntax needs `?.`. To get the component's exact, non-optional `api`
type instead, call the component directly or call `jsx(Modal, null)` /
`jsxDEV(Modal, null)`.

## Runtime behavior

Intrinsic JSX tags become DOM elements. `class` sets `className`, `style` accepts a style object, DOM properties are assigned when available, boolean attributes use presence semantics, and `onClick`-style function props become event listeners. Text, nested nodes, arrays, fragments, and function components are supported; `null`, `undefined`, and boolean children are ignored.

The public entry points are:

```ts
import { createRef, createContext, useContext, jsx, jsxs, Fragment } from '@react5/dom-jsx'
import { jsx, jsxs, jsxDEV, Fragment } from '@react5/dom-jsx/jsx-dev-runtime'
```

`@react5/dom-jsx/jsx-runtime` also re-exports the same names and is what the TypeScript/Vite JSX transform imports automatically; `@react5/dom-jsx` is the shorter path for importing helpers like `createRef` directly in your own code.

### Refs

Capture the created DOM node without a later `querySelector` call using `createRef` or a callback ref:

```tsx
import { createRef } from '@react5/dom-jsx'

const inputRef = createRef<HTMLInputElement>()
const form = (
  <form>
    <input class="action-form__input" ref={inputRef} />
  </form>
) as HTMLFormElement

inputRef.current // HTMLInputElement
```

A callback ref (`ref={(el) => ...}`) is also supported and is invoked with the element once it's created.

### Context

Pass values down to nested components without threading props through every level:

```tsx
import { createContext, useContext } from '@react5/dom-jsx'

const ThemeContext = createContext({ color: 'black' })

function Title(props: { text: string }) {
  const theme = useContext(ThemeContext)
  return <h1 style={{ color: theme.color }}>{props.text}</h1>
}

const page = (
  <ThemeContext.Provider value={{ color: 'red' }}>
    {() => <Title text="Hello" />}
  </ThemeContext.Provider>
)
```

JSX in this runtime is evaluated eagerly from the inside out: children are
created before their parent component runs. A Provider's child must
therefore be a render function (`{() => ...}`); the Provider calls it while
its value is active, so every component rendered inside sees that value.
Providers can be nested, and the innermost value wins.

`useContext` returns the nearest Provider's value only while rendering is in
progress. Call it synchronously in a component body and keep the result.
Called later, for example from an event handler or a `setTimeout`, it
returns the context's default value.

## Development

```sh
npm test       # Run Vitest in jsdom
npm run typecheck
npm run build  # Build JavaScript and declarations into dist/
```
