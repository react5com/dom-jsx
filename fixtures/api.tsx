import { jsx } from '../src/jsx-runtime'

type ModalApi = { open(): void; close(): void }

function Modal() {
  const element = <dialog /> as HTMLDialogElement
  const api: ModalApi = {
    open: () => element.showModal(),
    close: () => element.close()
  }

  return Object.assign(element, {api}) satisfies HTMLDialogElement & {api: ModalApi}
}

export const modal = <Modal />
export const opened = modal.api?.open()
export const direct = jsx(Modal, null).api.open()
