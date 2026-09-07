import { createServer, createConnection } from 'net'
import { TcpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'
import { ByteTransformer, SocketLogTransformer } from './lib/transformers'
import { ConnectionManager } from './connection-manager'

export function createTcpProxy(config: Config, logger: Logger, connectionManager: ConnectionManager) {
    const listener = createServer()

    const bindTargetToLogger = (inbound: TcpTarget, outbound: TcpTarget, logger: Logger) => {
        inbound.socket
            .pipe(ByteTransformer.createStream('hex'))
            .pipe(SocketLogTransformer.createStream(inbound, 'SOCKET_PACKET', outbound))
            .pipe(logger.getStream(), { end: false })
    }

    const bindClientToServer = (client: TcpTarget, server: TcpTarget) => {
        server.socket.once('end', err => {
            logger.log('SOCKET_UNBOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            // When the connection between the server and proxy ends, we don't forcefully close the client's connection.
            // Instead, the client can continue communicating. On its next message, the proxy will establish a new connection to the server and forward the message.
            // If the client was waiting for a server response, it will eventually time out, reconnect, and resend the pending message.
        }).once('error', err => {
            logger.log('SOCKET_BIND_ERROR', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            client.socket.end()
        }).once('connect', () => {
            logger.log('SOCKET_BOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)

            server.socket.pipe(client.socket)
            bindTargetToLogger(server, client, logger)

            client.socket.pipe(server.socket)
            bindTargetToLogger(client, server, logger)
        })
    }

    listener
        .on('connection', (socket) => {
            const client: TcpTarget = { id: `client:${socket.remoteAddress}:${socket.remotePort}:tcp`, socket, address: socket.remoteAddress, port: socket.remotePort, family: socket.remoteFamily, alias: 'client' }
            logger.log('SOCKET_START', `${client.address}:${client.port}`)

            client.socket.on('data', () => {
                connectionManager.touch(client.id)
            })
            .on('end', () => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`)
                connectionManager.unregister(client.id)
            }).on('error', err => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`, err.message)
                connectionManager.unregister(client.id)
            })

            let server: TcpTarget = {
                id: client.id.replace('client', 'server'),
                socket: createConnection({ host: config.serverAddress, port: config.serverPort }),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort,
            }

            bindClientToServer(client, server)

            connectionManager.register(client.id, (reason) => {
                logger.log('SOCKET_ENDING', `${client.address}:${client.port}`, `${server.address}:${server.port}`, reason)
                client.socket.end()
            })
        })
        .on('listening', () => {
            logger.log()
            logger.log('PROXY_START', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .on('error', err => {
            logger.log('PROXY_START_ERROR', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`, err.message)
        })
        .on('close', () => {
            connectionManager.closeAll()
        })
        .listen(config.bindPort, config.bindAddress)
}
