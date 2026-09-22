import { jsx } from '../src/jsx-runtime'

type ModalContext = { open(): void; close(): void }

function Modal() {
  const element = <dialog /> as HTMLDialogElement
  const context: ModalContext = {
    open: () => element.showModal(),
    close: () => element.close()
  }

  return Object.assign(element, {context}) satisfies HTMLDialogElement & {context: ModalContext}
}

export const modal = <Modal />
export const opened = modal.context?.open()
export const direct = jsx(Modal, null).context.open()
