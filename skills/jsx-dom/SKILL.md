---
name: jsx-dom
description: Build or edit TSX interfaces that use @react5/dom-jsx to create live DOM nodes. Use for components, refs, events, context, element typing, and lifecycle cleanup in projects that depend on @react5/dom-jsx.
---

# JSX DOM with @react5/dom-jsx

JSX expressions create DOM nodes immediately; they do not create React elements or use a virtual DOM. Prefer reusable function components and create nodes with JSX.

Read [the package README](../../README.md) when you need API details, especially for refs, context, cleanup, element typing, or component APIs. This file ships inside the installed `@react5/dom-jsx` package, so the README is always the version in use. The README's installation and development commands describe the runtime package itself; use your project's own scripts for verification.

## Working with nodes

- Use JSX for node creation. Use `createRef` or a callback `ref` to retain nested nodes a component owns, instead of finding them later with `querySelector`. A component's top-level node needs no ref, since the component returns it.
- Intrinsic tags produce DOM elements. Prefer `className`, a style object for `style`, and camel-cased event props such as `onMouseEnter` and `onKeyDown`. Boolean attributes use presence semantics.
- Inline SVG works in JSX (`<svg viewBox="0 0 10 10"><path d="..." /></svg>`). Use SVG attribute names (`viewBox`, `stroke-width`); props are set as attributes. `a`, `script`, `style`, and `title` inside `<svg>` are converted automatically when appended through JSX, but not when inserted by hand with DOM methods.
- Use the `svge()` function to load raw SVG. With Vite use a `?raw` import.
- Components can return a DOM node with an attached `api` object to expose methods or properties to the parent. In TSX, `<Component />` exposes `api` as optional and loosely typed; call the component directly or use `jsx(Component, null)` when the exact API type matters.

## Element typing

- Every JSX expression is typed `JSX.Element`: the DOM `Element` type plus an optional `api`. Element methods such as `hasAttribute` and `toggleAttribute` are available without a cast; `textContent` and other `Node` members too.
- Fragments and text nodes are typed the same way even though they are not elements. Do not call element methods on a value that may be one.
- Element-specific APIs (`showModal()`, `.value`, `.select()`) need a narrower type. Prefer `expectElement(node, HTMLDialogElement)`: it narrows and throws a `TypeError` on mismatch. Use it for uncertain nodes (`querySelector`, event targets, component results). For a literal intrinsic tag, `<dialog /> as HTMLDialogElement` or `jsx('dialog', null)` is enough.
- `isElement(node)` is a boolean type guard for "real `Element`, not fragment or text".
- Calling `jsx('input', props)` directly returns the specific element type (`HTMLInputElement`) with no cast.
- A component used as `<Comp />` must return `JSX.Element`. Do not annotate a component's return type as `Node` or `DocumentFragment`; leave it inferred.
- `instanceof` checks are per-realm: nodes from another window or iframe fail `expectElement`.

## Context and cleanup

- JSX evaluates children before their parent component. Give a context Provider a render-function child (`{() => <Child />}`) so nested components render while its value is active. Call `useContext` synchronously in the component body and retain the value for later callbacks.
- Register component resources with `onCleanup` during render. Use `onDispose(node, fn)` outside render.
- When discarding a subtree, call `dispose` on the removed node or its former common ancestor. Moving a node does not dispose it. For a fragment return, ensure all top-level children are disposed so its cleanup runs.
