import { createServer, createConnection } from 'net'
import { TcpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'
import { ByteTransformer, SocketLogTransformer } from './lib/transformers'

export function createTcpProxy(config: Config, logger: Logger) {
    const listener = createServer()

    const configureSocketKeepAlive = (socket: any, keepAliveInterval: number, name: string) => {
        if (keepAliveInterval > 0) {
            try {
                socket.setKeepAlive(true, keepAliveInterval)
                // Note: Default timeout is 0 (no timeout).
                socket.setTimeout(5 * keepAliveInterval)
                logger.log('KEEPALIVE_CONFIGURED', name)
            } catch (err) {
                logger.log('KEEPALIVE_CONFIG_ERROR', name, err.message)
            }
        }
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
            // If the connection between the 'client' and 'server' ends, the connection to the 'client' doesn't need to end.
            // When the 'client' sends its next message, the proxy will create a new connection to the 'server' and proxy the message.
            // If the 'client' is awaiting a response from the 'server', it will eventually time out and reconnect, and then resend its last message.
        }).once('error', err => {
            logger.log('SOCKET_BIND_ERROR', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            client.socket.end()
        }).once('timeout', () => {
            logger.log('SERVER_SOCKET_TIMEOUT', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
            server.socket.end() // Only end the server socket
        }).once('connect', () => {
            logger.log('SOCKET_BOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)

            // Configure keep-alive on 'client' side connection
            configureSocketKeepAlive(client.socket, config.clientKeepAliveInterval, 'client')
            // Configure keep-alive on 'server' side connection
            configureSocketKeepAlive(server.socket, config.serverKeepAliveInterval, 'server')

            server.socket.pipe(client.socket)
            bindTargetToLogger(server, client, logger)

            client.socket.pipe(server.socket)
            bindTargetToLogger(client, server, logger)
        })

        client.socket.once('timeout', () => {
            logger.log('CLIENT_SOCKET_TIMEOUT', `${client.address}:${client.port}`, `${server.address}:${server.port}`)
            client.socket.end()
            server.socket.end() // End both on 'client' timeout
        })
    }

    listener
        .on('connection', (socket) => {
            const client: TcpTarget = { socket, address: socket.remoteAddress, port: socket.remotePort, family: socket.remoteFamily, alias: 'client' }
            logger.log('SOCKET_START', `${client.address}:${client.port}`)

            client.socket.on('end', () => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`)
            }).on('error', err => {
                logger.log('SOCKET_END', `${client.address}:${client.port}`, err.message)
            })

            let server: TcpTarget = {
                socket: createConnection({ host: config.serverAddress, port: config.serverPort }),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort,
            }

            bindClientToServer(client, server)
        })
        .on('listening', () => {
            logger.log()
            logger.log('PROXY_START', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`)
        })
        .on('error', err => {
            logger.log('PROXY_START_ERROR', `${config.bindAddress}:${config.bindPort}`, `${config.serverAddress}:${config.serverPort}`, err.message)
        })
        .listen(config.bindPort, config.bindAddress)
}
