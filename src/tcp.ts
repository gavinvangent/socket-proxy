import { createServer, createConnection } from 'net'
import { TcpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'
import { ByteTransformer, ConnectionManagerTransformer, SocketLogTransformer } from './lib/transformers'
import { ConnectionManager } from './connection-manager'

export function createTcpProxy(config: Config, logger: Logger, connectionManager: ConnectionManager) {
    const listener = createServer()

    const bindSourceToDestination = (source: TcpTarget, destination: TcpTarget, connectionManager: ConnectionManager, clientId: string) => {
        source.socket
            .pipe(ConnectionManagerTransformer.createStream(clientId, connectionManager))
            .pipe(destination.socket)
    }

    const bindTargetToLogger = (inbound: TcpTarget, outbound: TcpTarget, logger: Logger) => {
        inbound.socket
            .pipe(ByteTransformer.createStream('hex'))
            .pipe(SocketLogTransformer.createStream(inbound, 'SOCKET_PACKET', outbound))
            .pipe(logger.getStream(), { end: false })
    }

    const bindClientToServer = (client: TcpTarget, server: TcpTarget) => {
        server.socket.once('end', err => {
            logger.log('SOCKET_UNBOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            client.socket.end(err);
        }).once('error', err => {
            logger.log('SOCKET_BIND_ERROR', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            client.socket.end()
        }).once('connect', () => {
            logger.log('SOCKET_BOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)

            bindSourceToDestination(server, client, connectionManager, client.id);
            bindTargetToLogger(server, client, logger)

            bindSourceToDestination(client, server, connectionManager, client.id);
            bindTargetToLogger(client, server, logger)
        })
    }

    listener
        .on('connection', (socket) => {
            const client: TcpTarget = { id: `client:${socket.remoteAddress}:${socket.remotePort}:tcp`, socket, address: socket.remoteAddress, port: socket.remotePort, family: socket.remoteFamily, alias: 'client' }
            logger.log('SOCKET_START', `${client.address}:${client.port}`)

            client.socket.once('end', () => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`)
                connectionManager.deregister(client.id)
            }).once('error', err => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`, err.message)
                connectionManager.deregister(client.id)
            }).once('idle_timeout', () => {
                logger.log('SOCKET_TIMEOUT', `${client.address}:${client.port}`)
                socket.end()
            })
            .once('shutdown', () => {
                logger.log('SOCKET_SHUTDOWN', `${client.address}:${client.port}`)
                socket.end()
            })

            let server: TcpTarget = {
                id: client.id.replace('client', 'server'),
                socket: createConnection({ host: config.serverAddress, port: config.serverPort }),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort,
            }

            bindClientToServer(client, server)

            connectionManager.register(client.id, client.socket)
        })
        .once('listening', () => {
            logger.log('PROXY_START', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .on('error', err => {
            logger.log('PROXY_ERROR', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`, err.message)
        })
        .once('close', () => {
            // only invoked once incoming conns are no longer accepted and all existing conns are closed
            logger.log('PROXY_CLOSE', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .listen(config.bindPort, config.bindAddress)
}
