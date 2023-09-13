import { createSocket } from 'dgram'
import { UdpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'

export function createUdpProxy(config: Config, logger: Logger) {
    const listener = createSocket('udp4')

    let _targets: { [key: string]: UdpTarget } = {}

    const getServerSocket = (client: UdpTarget): UdpTarget => {
        const clientId = `${client.address}:${client.port}:${client.family}:${client.alias}`
        if (!_targets[clientId]) {
            const server: UdpTarget = _targets[clientId] = {
                socket: createSocket(config.type as 'udp4' | 'udp6'),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort
            }

            server.socket
                .on('message', message => {
                    proxyMessage(message, server, client)
                })
                .once('close', () => { _targets[clientId] = undefined })
        }
        return _targets[clientId]
    }

    const proxyMessage = (message: Buffer, source: UdpTarget, destination: UdpTarget) => {
        destination.socket.send(message, destination.port, destination.address, err => {
            if (err) {
                logger.log('SOCKET_PACKET_ERROR', 'Error forwarding packet to server', err.name, err.message, err.stack)
                destination.socket.close()
                return
            }

            logger.log('SOCKET_PACKET', `${source.address}:${source.port}`, `${destination.address}:${destination.port}`, message.toString('hex'))
        })
    }

    listener
        .on('error', err => {
            logger.log('PROXY_START_ERROR', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`, err.message)
            listener.close()
        })
        .on('message', (message, clientRemoteInfo) => {
            const client: UdpTarget = { socket: listener, ...clientRemoteInfo, alias: 'client' }
            const server: UdpTarget = getServerSocket(client)
            proxyMessage(message, client, server)
        })
        .on('listening', () => {
            logger.log('PROXY_START', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .bind(config.bindPort, config.bindAddress)
}
