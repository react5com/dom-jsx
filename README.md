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

Intrinsic JSX tags become DOM elements. Prefer `className` over `class`, while both supported. `class` sets `className`, `style` accepts a style object, DOM properties are assigned when available, boolean attributes use presence semantics, and `onClick`-style function props become event listeners. Text, nested nodes, arrays, fragments, and function components are supported; `null`, `undefined`, and boolean children are ignored.

Compound event props require camel casing, such as `onMouseEnter`, `onMouseLeave`,
`onFocusIn`, `onFocusOut`, `onKeyDown`, and `onAnimationEnd`.
Handlers receive the DOM event with `currentTarget` typed as the element.

The public entry points are:

```ts
import { createRef, createContext, useContext, onCleanup, onDispose, dispose, jsx, jsxs, Fragment } from '@react5/dom-jsx'
import { jsx, jsxs, jsxDEV, Fragment } from '@react5/dom-jsx/jsx-dev-runtime'
```

`@react5/dom-jsx/jsx-runtime` also re-exports the same names and is what the TypeScript/Vite JSX transform imports automatically; `@react5/dom-jsx` is the shorter path for importing helpers like `createRef` directly in your own code.

### SVG

Use `svge()` function to load raw svg. With vite use raw import:

```ts
import iconSvg from "./assets/icon.svg?raw"
const icon = svge(iconSvg)
<div>{icon}</div>
```

### Refs

Capture the created DOM node without a later `querySelector` call using `createRef` or a callback ref:

```tsx
import { createRef } from '@react5/dom-jsx'

const inputRef = createRef<HTMLInputElement>()
const form = (
  <form>
    <input className="action-form__input" ref={inputRef} />
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

### Cleanup

Release subscriptions, timers, and other resources when content is discarded.
Register cleanups with `onCleanup` in a component body, or with
`onDispose(node, fn)` anywhere else:

```tsx
import { dispose, onCleanup, onDispose } from '@react5/dom-jsx'

function Clock() {
  const el = <time /> as HTMLTimeElement
  const id = setInterval(() => { el.textContent = new Date().toLocaleTimeString() }, 1000)
  onCleanup(() => clearInterval(id))
  return el
}

const node = <Clock />
onDispose(node, () => console.log('disposed'))

// Later, where content is swapped:
old.replaceWith(next)
dispose(old)
```

The DOM gives no synchronous signal when a node is removed, so `dispose` must
be called explicitly. It runs the cleanups of the node and of every node inside
it, descendants first, each node's cleanups in reverse registration order.
Disposal follows the DOM tree, so components passed as children are covered
even though they render before their parent. Each cleanup runs at most once;
if some throw, the rest still run and the error (or an `AggregateError`) is
rethrown afterwards.

A component's cleanups are attached to the node it returns. When it returns a
fragment, they are attached to the fragment's top-level children and run once
all of them are disposed, so dispose every one of them, or a common ancestor.
An empty fragment gets an empty comment node to carry its cleanups.

If a component throws while rendering, the cleanups it already registered run
immediately. So do those of components it rendered and of JSX passed to it in
props, unless those nodes are already in the document.

`onCleanup` throws when called outside a component render, e.g. from an event
handler or after an `await`; use `onDispose(node, fn)` there. Moving a node
never disposes it. A node that is discarded without `dispose` keeps its
cleanups until it is garbage-collected, and they never run.

## Development

```sh
npm test       # Run Vitest in jsdom
npm run typecheck
npm run build  # Build JavaScript and declarations into dist/
```
