import { createSocket } from 'dgram'
import { UdpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'
import { ConnectionManager } from './connection-manager'

export function createUdpProxy(config: Config, logger: Logger, connectionManager: ConnectionManager) {
    const listener = createSocket(config.type as 'udp4' | 'udp6')

    let _targets: { [key: string]: UdpTarget } = {}

    const getServerSocket = (client: UdpTarget): { server: UdpTarget, isNew: boolean } => {
        if (!_targets[client.id]) {
            const server: UdpTarget = _targets[client.id] = {
                id: client.id.replace('client', 'server'),
                socket: createSocket(config.type as 'udp4' | 'udp6'),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort
            }

            server.socket
                .on('message', message => {
                    proxyMessage(message, server, client)
                    connectionManager.touch(client.id)
                })
                .once('idle_timeout', () => {
                    logger.log('SOCKET_TIMEOUT', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
                    server.socket.close()
                })
                .once('shutdown', () => {
                    logger.log('SOCKET_SHUTDOWN', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
                    server.socket.close()
                })
                .once('error', err => {
                    logger.log('SOCKET_ERROR', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
                    server.socket.close()
                })
                .once('close', () => {
                    logger.log('SOCKET_UNBOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
                    delete _targets[client.id]
                    connectionManager.deregister(client.id)
                })

            return { server, isNew: true }
        }
        return { server: _targets[client.id], isNew: false }
    }

    const proxyMessage = (message: Buffer, source: UdpTarget, destination: UdpTarget) => {
        destination.socket.send(message, destination.port, destination.address, err => {
            if (err) {
                logger.log('SOCKET_PACKET_ERROR', 'Error forwarding packet', err.name, err.message, err.stack)
                if (destination.alias === 'server') {
                    destination.socket.close()
                }
                return
            }

            logger.log('SOCKET_PACKET', `${source.address}:${source.port}`, `${destination.address}:${destination.port}`, message.toString('hex'))
        })
    }

    listener
        .once('listening', () => {
            logger.log('PROXY_START', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .on('message', (message, clientRemoteInfo) => {
            const client: UdpTarget = {
                id: `client:${clientRemoteInfo.address}:${clientRemoteInfo.port}:${clientRemoteInfo.family}`,
                socket: listener,
                ...clientRemoteInfo,
                alias: 'client'
            }
            const { server, isNew } = getServerSocket(client)

            if (isNew) {
                connectionManager.register(server.id, server.socket)
                logger.log('SOCKET_BOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
            } else {
                connectionManager.touch(client.id)
            }

            proxyMessage(message, client, server)
        })
        .once('error', err => {
            logger.log('PROXY_ERROR', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`, err.message)
        })
        .once('close', () => {
            logger.log('PROXY_CLOSE', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
            connectionManager.closeAll()
        })
        .bind(config.bindPort, config.bindAddress)
}
