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

## Runtime behavior

Intrinsic JSX tags become DOM elements. `class` sets `className`, `style` accepts a style object, DOM properties are assigned when available, boolean attributes use presence semantics, and `onClick`-style function props become event listeners. Text, nested nodes, arrays, fragments, and function components are supported; `null`, `undefined`, and boolean children are ignored.

The public entry points are:

```ts
import { createRef, jsx, jsxs, Fragment } from '@react5/dom-jsx'
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

## Development

```sh
npm test       # Run Vitest in jsdom
npm run typecheck
npm run build  # Build JavaScript and declarations into dist/
```
