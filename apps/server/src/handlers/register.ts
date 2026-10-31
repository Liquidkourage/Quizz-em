import type { Server, Socket } from 'socket.io'
import type { ClientHello } from '@qhe/net'
import { handleDisconnect } from './disconnect'
import { dispatchAction } from './dispatch-action'
import { guarded } from './guarded-handler'
import { handleHello } from './hello'

const GENERIC_FAILURE_TOAST = 'Something went wrong. Please try again.'

export function registerGameSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)
    const tellClient = () => socket.emit('toast', GENERIC_FAILURE_TOAST)

    socket.on(
      'hello',
      guarded('hello', (data: ClientHello) => handleHello(socket, data), tellClient)
    )

    socket.on(
      'action',
      guarded(
        'action',
        (data: { type?: string; payload?: any }) => dispatchAction(socket, data),
        tellClient
      )
    )

    socket.on(
      'disconnect',
      guarded('disconnect', () => handleDisconnect(socket))
    )
  })
}
