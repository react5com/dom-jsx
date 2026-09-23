import { describe, expect, it, vi } from 'vitest'
import {
  createContext,
  createRef,
  type Child,
  dispose,
  Fragment,
  jsx,
  jsxs,
  onCleanup,
  onDispose,
  useContext
} from '../src/jsx-runtime'
import { jsxDEV } from '../src/jsx-dev-runtime'

describe('DOM JSX runtime', () => {
  it('creates intrinsic elements with attributes, properties, booleans, and styles', () => {
    const element = jsx('input', {
      id: 'name',
      class: 'field',
      disabled: true,
      value: 'Ada',
      style: { color: 'red', marginTop: '2px' }
    }) as HTMLInputElement

    expect(element.outerHTML).toContain('id="name"')
    expect(element.className).toBe('field')
    expect(element.disabled).toBe(true)
    expect(element.value).toBe('Ada')
    expect(element.style.color).toBe('red')
    expect(element.style.marginTop).toBe('2px')
  })

  it('binds event handlers', () => {
    let currentTarget: EventTarget | null = null
    const onClick = vi.fn((event: MouseEvent) => { currentTarget = event.currentTarget })
    const element = jsx('button', { onClick, children: 'Save' }) as HTMLButtonElement
    element.click()
    expect(onClick).toHaveBeenCalledOnce()
    expect(currentTarget).toBe(element)
  })

  it('handles text, nested, arrays, fragments, and ignored boolean children', () => {
    const element = jsxs('div', {
      children: ['Hello ', jsx('strong', { children: 'world' }), false, null, 3]
    }) as HTMLDivElement
    expect(element.innerHTML).toBe('Hello <strong>world</strong>3')

    const fragment = Fragment({ children: [jsx('span', { children: 'a' }), 'b', true] })
    expect(fragment.textContent).toBe('ab')
  })

  it('supports function components and null props', () => {
    const Greeting = ({ name = 'friend' }: { name?: string }) =>
      jsx('p', { children: `Hello ${name}` })
    expect(jsx(Greeting, null).textContent).toBe('Hello friend')
  })

  it('exports the development runtime entry point', () => {
    expect(jsxDEV('span', { children: 'dev' }).textContent).toBe('dev')
  })

  it('populates a ref object with the created element', () => {
    const inputRef = createRef<HTMLInputElement>()
    const element = jsx('input', { class: 'field', ref: inputRef }) as HTMLInputElement

    expect(inputRef.current).toBe(element)
  })

  it('invokes a callback ref with the created element', () => {
    const onRef = vi.fn()
    const element = jsx('input', { ref: onRef }) as HTMLInputElement

    expect(onRef).toHaveBeenCalledOnce()
    expect(onRef).toHaveBeenCalledWith(element)
  })

  it('stringifies false for non-DOM props instead of dropping the attribute', () => {
    const element = jsx('div', { spellcheck: false }) as HTMLDivElement

    expect(element.getAttribute('spellcheck')).toBe('false')
  })

  it('stringifies hyphenated attributes instead of using boolean presence semantics', () => {
    const element = jsx('div', {
      'aria-hidden': true,
      'aria-expanded': false,
      'data-count': 3
    }) as HTMLDivElement

    expect(element.getAttribute('aria-hidden')).toBe('true')
    expect(element.getAttribute('aria-expanded')).toBe('false')
    expect(element.getAttribute('data-count')).toBe('3')
  })

  it('propagates context values to nested components rendered inside a Provider', () => {
    const Theme = createContext('light')
    const Label = () => jsx('span', { children: useContext(Theme) })

    expect(jsx(Label, null).textContent).toBe('light')

    const element = jsx(Theme.Provider, {
      value: 'dark',
      children: () => jsxs('div', {
        children: [
          jsx(Label, null),
          jsx(Theme.Provider, { value: 'blue', children: () => jsx(Label, null) }),
          jsx(Label, null)
        ]
      })
    })

    expect(element.textContent).toBe('darkbluedark')
    expect(jsx(Label, null).textContent).toBe('light')
  })

  it('wraps non-node Provider results in a fragment and restores context after errors', () => {
    const Count = createContext(0)

    const fragment = jsx(Count.Provider, {
      value: 2,
      children: () => ['n=', useContext(Count)]
    })
    expect(fragment).toBeInstanceOf(DocumentFragment)
    expect(fragment.textContent).toBe('n=2')

    expect(() => jsx(Count.Provider, {
      value: 5,
      children: () => { throw new Error('boom') }
    })).toThrow('boom')
    expect(useContext(Count)).toBe(0)
  })

  it('rejects Provider children that are not a render function', () => {
    const Ctx = createContext(0)
    expect(() => jsx(Ctx.Provider as any, { value: 1, children: jsx('span', null) }))
      .toThrow(TypeError)
  })

  it('runs component cleanups when the returned node is disposed', () => {
    const cleanup = vi.fn()
    const Widget = () => {
      onCleanup(cleanup)
      return jsx('div', null)
    }
    const node = jsx(Widget, null)

    expect(cleanup).not.toHaveBeenCalled()
    dispose(node)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('disposes nodes that were never added to the document', () => {
    const cleanup = vi.fn()
    const node = jsx('span', null)
    onDispose(node, cleanup)

    expect(node.isConnected).toBe(false)
    dispose(node)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('does not run cleanups when a node is moved', () => {
    const cleanup = vi.fn()
    const node = jsx('span', null)
    onDispose(node, cleanup)
    const a = jsx('div', null) as HTMLDivElement
    const b = jsx('div', null) as HTMLDivElement
    document.body.append(a, b)

    a.append(node)
    b.append(node)
    a.remove()
    dispose(a)
    expect(cleanup).not.toHaveBeenCalled()

    dispose(b)
    expect(cleanup).toHaveBeenCalledOnce()
    b.remove()
  })

  it('disposes components passed as children, descendants first', () => {
    const calls: string[] = []
    const Widget = () => {
      onCleanup(() => calls.push('widget'))
      return jsx('span', null)
    }
    const Layout = (props: { children?: Child }) => {
      onCleanup(() => calls.push('layout'))
      return jsx('section', { children: props.children })
    }
    // Widget runs before Layout, so disposal must follow the DOM.
    const node = jsx(Layout, { children: jsx(Widget, null) })

    dispose(node)
    expect(calls).toEqual(['widget', 'layout'])
  })

  it('attaches cleanups of fragment-returning components to the top-level children', () => {
    const cleanup = vi.fn()
    const Pair = () => {
      onCleanup(cleanup)
      return jsxs(Fragment, { children: [jsx('i', null), jsx('b', null)] })
    }
    const container = jsx('div', { children: jsx(Pair, null) })
    const [first, second] = Array.from(container.childNodes)

    dispose(first)
    expect(cleanup).not.toHaveBeenCalled()
    dispose(second)
    expect(cleanup).toHaveBeenCalledOnce()
    dispose(container)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('runs fragment component cleanups once when the whole parent is disposed', () => {
    const calls: string[] = []
    const Pair = () => {
      onCleanup(() => calls.push('a'))
      onCleanup(() => calls.push('b'))
      return jsxs(Fragment, { children: [jsx('i', null), jsx('b', null)] })
    }

    dispose(jsx('div', { children: jsx(Pair, null) }))
    expect(calls).toEqual(['b', 'a'])
  })

  it('keeps cleanups of an empty fragment when it is inserted', () => {
    const cleanup = vi.fn()
    const Empty = () => {
      onCleanup(cleanup)
      return jsx(Fragment, {})
    }
    const container = jsx('div', { children: jsx(Empty, null) })

    dispose(container)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('keeps cleanups of a Provider whose render function returns nothing', () => {
    const cleanup = vi.fn()
    const Ctx = createContext(0)
    const Poller = () => {
      onCleanup(cleanup)
      return jsx(Fragment, {})
    }
    const container = jsx('div', {
      children: jsx(Ctx.Provider, { value: 1, children: () => [jsx(Poller, null), null] })
    })

    dispose(container)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('does not add an anchor to empty fragments without cleanups', () => {
    const Empty = () => jsx(Fragment, {})
    expect(jsx(Empty, null).childNodes).toHaveLength(0)
  })

  it('keeps the cleanups of every component that returns the same node', () => {
    const calls: string[] = []
    const Inner = () => {
      onCleanup(() => calls.push('inner'))
      return jsx('div', null)
    }
    const Outer = () => {
      onCleanup(() => calls.push('outer'))
      return jsx(Inner, null)
    }

    dispose(jsx(Outer, null))
    expect(calls).toEqual(['outer', 'inner'])
  })

  it('runs cleanups of one node in reverse registration order', () => {
    const calls: number[] = []
    const Widget = () => {
      onCleanup(() => calls.push(1))
      onCleanup(() => calls.push(2))
      return jsx('div', null)
    }

    dispose(jsx(Widget, null))
    expect(calls).toEqual([2, 1])
  })

  it('runs cleanups only once when disposed twice', () => {
    const cleanup = vi.fn()
    const node = jsx('div', null)
    onDispose(node, cleanup)

    dispose(node)
    dispose(node)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('keeps running cleanups when one throws and rethrows afterwards', () => {
    const later = vi.fn()
    const child = jsx('span', null)
    const node = jsx('div', { children: child })
    onDispose(child, () => { throw new Error('boom') })
    onDispose(node, later)

    expect(() => dispose(node)).toThrow('boom')
    expect(later).toHaveBeenCalledOnce()
  })

  it('reports every error when several cleanups throw', () => {
    const node = jsx('div', null)
    onDispose(node, () => { throw new Error('a') })
    onDispose(node, () => { throw new Error('b') })

    expect(() => dispose(node)).toThrow(AggregateError)
  })

  it('runs cleanups of a component that throws while rendering', () => {
    const cleanup = vi.fn()
    const Broken = () => {
      onCleanup(cleanup)
      throw new Error('render failed')
    }

    expect(() => jsx(Broken, null)).toThrow('render failed')
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('disposes children passed as props when a component throws while rendering', () => {
    const cleanup = vi.fn()
    const Ticker = () => {
      onCleanup(cleanup)
      return jsx('span', null)
    }
    const Parent = (_props: { children?: Child }): Node => {
      throw new Error('render failed')
    }

    expect(() => jsx(Parent, { children: jsx(Ticker, null) })).toThrow('render failed')
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('disposes components rendered in the body when a component throws', () => {
    const calls: string[] = []
    const Ticker = () => {
      onCleanup(() => calls.push('ticker'))
      return jsx('span', null)
    }
    const Parent = () => {
      onCleanup(() => calls.push('parent'))
      jsx('div', { children: jsx(Ticker, null) })
      throw new Error('render failed')
    }

    expect(() => jsx(Parent, null)).toThrow('render failed')
    expect(calls).toEqual(['ticker', 'parent'])
  })

  it('keeps connected nodes when a component throws while rendering', () => {
    const cleanup = vi.fn()
    const live = jsx('span', null) as HTMLSpanElement
    onDispose(live, cleanup)
    document.body.append(live)
    const Parent = (_props: { content: Node }): Node => {
      throw new Error('render failed')
    }

    expect(() => jsx(Parent, { content: live })).toThrow('render failed')
    expect(cleanup).not.toHaveBeenCalled()
    live.remove()
  })

  it('rejects onCleanup outside of a component render', () => {
    expect(() => onCleanup(() => {})).toThrow(Error)
  })
})
