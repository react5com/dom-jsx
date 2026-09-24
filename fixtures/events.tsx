import { expectTypeOf } from 'vitest'

/** Compound event names must work in JSX with contextual event/target types. */
export const events = <input
  onMouseEnter={event => {
    expectTypeOf(event).not.toBeAny()
    expectTypeOf(event.clientX).toEqualTypeOf<number>()
    expectTypeOf(event.currentTarget).toExtend<HTMLInputElement>()
    // @ts-expect-error mouse events do not have keyboard keys
    event.key
  }}
  onMouseLeave={event => event.relatedTarget}
  onKeyDown={event => {
    expectTypeOf(event.key).toEqualTypeOf<string>()
    // @ts-expect-error keyboard events do not have pointer IDs
    event.pointerId
  }}
  onPointerDown={event => event.pointerId}
  onTouchStart={event => event.touches}
  onDragOver={event => event.dataTransfer}
  onFocusIn={event => event.relatedTarget}
  onFocusOut={event => event.relatedTarget}
  onCompositionStart={event => event.data}
  onAnimationEnd={event => event.animationName}
  onTransitionEnd={event => event.propertyName}
  onDblClick={event => event.clientX}
  onInput={event => event.inputType}
/>

// @ts-expect-error unknown event names must still be rejected
export const typo = <div onMouseEntter={() => {}} />
// @ts-expect-error handlers must match the DOM event type
export const wrongEvent = <div onMouseEnter={(event: KeyboardEvent) => {}} />

// @ts-expect-error compound event props require camel casing
export const oldMouseEnter = <div onMouseenter={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldMouseLeave = <div onMouseleave={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldFocusIn = <div onFocusin={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldFocusOut = <div onFocusout={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldKeyDown = <div onKeydown={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldAnimationEnd = <div onAnimationend={() => {}} />
// @ts-expect-error compound event props require camel casing
export const oldDblClick = <div onDblclick={() => {}} />
