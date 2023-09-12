import { createSocket } from 'dgram'
import { UdpTarget } from './types'
import { Config } from './config'

export function createUdpProxy(config: Config) {
    const listener = createSocket('udp4')

    let _targets: { [key: string]: UdpTarget } = {}

    const getServerSocket = (client: UdpTarget): UdpTarget => {
        const clientId = `${client.address}:${client.port}:${client.family}:${client.size}:${client.alias}`
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
        destination.socket.send(message, destination.port, destination.address, error => {
            if (error) {
                console.error('Error forwarding packet to server', error)
                destination.socket.close()
                return
            }

            console.log(`[${source.address}:${source.port}] ${source.alias} -> ${destination.alias} [${destination.address}:${destination.port}] ${message.toString('hex')}`)
        })
    }

    listener
        .on('error', err => {
            console.log(`listener error:\n${err.stack}`)
            listener.close()
        })
        .on('message', (message, clientRemoteInfo) => {
            console.log('message', message);
            const client: UdpTarget = { socket: listener, ...clientRemoteInfo, alias: 'client' }
            const server: UdpTarget = getServerSocket(client)
            proxyMessage(message, client, server)
        })
        .on('listening', () => {
            const address = listener.address()
            console.log(`Listening on ${address.address}:${address.port}`)
        })
        .bind(config.bindPort, config.bindAddress)
}