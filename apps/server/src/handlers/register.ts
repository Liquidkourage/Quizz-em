import type { Server, Socket } from 'socket.io'
import type { ClientHello } from '@qhe/net'
import { handleDisconnect } from './disconnect'
import { dispatchAction } from './dispatch-action'
import { handleHello } from './hello'

export function registerGameSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    socket.on('hello', (data: ClientHello) => {
      void handleHello(socket, data)
    })

    socket.on('action', (data: { type?: string; payload?: any }) => {
      void dispatchAction(socket, data)
    })

    socket.on('disconnect', () => {
      handleDisconnect(socket)
    })
  })
}
