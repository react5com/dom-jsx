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

### Element typing

`JSX.Element` is the DOM `Element` type plus the optional `api`, so element
methods such as `hasAttribute` and `toggleAttribute` are available on any JSX
result. Fragments and text nodes are typed the same way even though they are
not elements, so narrow before calling element methods on a value that may be
one. Calling `jsx('input', props)` directly returns the specific element type
(`HTMLInputElement`) with no cast.

Components used as `<Comp />` must return `JSX.Element`, so a component typed
as returning `Node` or `DocumentFragment` does not type-check.

### Narrowing helpers

`isElement(node)` is a type guard for "is this a real `Element`, not a
fragment or text node":

```tsx
import { isElement } from '@react5/dom-jsx'

const node = <>{maybeContent}</>
if (isElement(node)) node.toggleAttribute('hidden', true)
```

`expectElement(node, Constructor)` narrows to a specific element class and
throws a `TypeError` (`Expected HTMLInputElement, got DIV`) on mismatch. Use it
instead of an unchecked `as` cast when JSX gives you a generic `JSX.Element`:

```tsx
import { expectElement } from '@react5/dom-jsx'

const input = expectElement(<input value="Ada" />, HTMLInputElement)
input.select() // typed as HTMLInputElement

const canvas = expectElement(document.querySelector('#chart')!, HTMLCanvasElement)
```

Use cases:

- Getting a specifically-typed element from a JSX expression without `as`.
- Validating nodes from outside the runtime (`querySelector`, event targets,
  third-party components) before using element-specific APIs.
- Failing fast with a readable message if a component unexpectedly returns a
  fragment or text node.

`instanceof` checks are per-realm, so nodes from another window or iframe fail
`expectElement`.

## Runtime behavior

Intrinsic JSX tags become DOM elements. Prefer `className` over `class`, while both supported. `class` sets `className`, `style` accepts a style object, DOM properties are assigned when available, boolean attributes use presence semantics, and `onClick`-style function props become event listeners. Text, nested nodes, arrays, fragments, and function components are supported; `null`, `undefined`, and boolean children are ignored.

Compound event props require camel casing, such as `onMouseEnter`, `onMouseLeave`,
`onFocusIn`, `onFocusOut`, `onKeyDown`, and `onAnimationEnd`.
Handlers receive the DOM event with `currentTarget` typed as the element.

The public entry points are:

```ts
import { createRef, createContext, useContext, onCleanup, onDispose, dispose, expectElement, isElement, svge, jsx, jsxs, Fragment } from '@react5/dom-jsx'
```

`@react5/dom-jsx/jsx-runtime` also re-exports the same names and is what the TypeScript/Vite JSX transform imports automatically; `@react5/dom-jsx` is the shorter path for importing helpers like `createRef` directly in your own code.

### SVG

SVG can be written inline in JSX. SVG tags (`svg`, `path`, `g`, `circle`, and so on) are created in the SVG namespace, and their props are set as attributes, so use SVG attribute names such as `viewBox` and `stroke-width`. `className`, `style`, `ref`, and event props work as usual.

```tsx
<svg viewBox="0 0 10 10" className="icon">
  <path d="M0 0L10 10" stroke="currentColor" stroke-width={2} />
</svg>
```

`a`, `script`, `style`, and `title` exist in both HTML and SVG. They are created as HTML and rebuilt in the SVG namespace when appended to an SVG parent through JSX, keeping attributes, listeners, ref, cleanups, and children. Limitations:

- Inserting such an element into an SVG tree by hand (`svg.append(el)`) does not convert it.
- A callback `ref` on one of these tags is called twice: first with the HTML element, then with the SVG one.
- Values set as DOM properties rather than attributes (such as `innerHTML`) are not carried over.

To load a raw SVG file, use `svge()`. With Vite use a raw import:

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
)

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
  const el = <time />
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

## AI agent skill

The package ships an agent skill with usage guidance for this runtime (nodes, refs, element typing, context, cleanup) at `node_modules/@react5/dom-jsx/skills/jsx-dom/SKILL.md`. To use it, reference it from your project's `AGENTS.md` or `CLAUDE.md`:

```md
When writing or editing TSX that uses @react5/dom-jsx, follow
node_modules/@react5/dom-jsx/skills/jsx-dom/SKILL.md.
```

For Claude Code, you can instead copy or symlink the `jsx-dom` folder into `.claude/skills/`.

## Development

```sh
npm test       # Run Vitest in jsdom
npm run typecheck
npm run build  # Build JavaScript and declarations into dist/
```
