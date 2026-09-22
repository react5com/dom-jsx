import { jsx } from '../src/jsx-runtime'

type ModalContext = { open(): void; close(): void }

function Modal() {
  const element = <dialog /> as HTMLDialogElement

  return Object.assign(element, {
    open: () => element.showModal(),
    close: () => element.close()
  }) satisfies HTMLDialogElement & ModalContext
}

export const modal = <Modal />
export const opened = modal.open()
export const direct = jsx(Modal, null).open()
