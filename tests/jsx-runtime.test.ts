import { describe, expect, it, vi } from 'vitest'
import { createContext, createRef, Fragment, jsx, jsxs, useContext } from '../src/jsx-runtime'
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
})
