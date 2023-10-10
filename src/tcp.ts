import { createServer, createConnection } from 'net'
import { TcpTarget } from './types'
import { Config } from './config'
import { Logger } from './lib/logger'
import { ByteTransformer, SocketLogTransformer } from './lib/transformers'

export function createTcpProxy(config: Config, logger: Logger) {
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
        }).once('error', err => {
            logger.log('SOCKET_BIND_ERROR', `${client.address}:${client.port}`, `${server.address}:${server.port}`, err?.message)
            client.socket.end()
        }).once('connect', () => {
            logger.log('SOCKET_BOUND', `${client.address}:${client.port}`, `${server.address}:${server.port}`)

            server.socket.pipe(client.socket)
            bindTargetToLogger(server, client, logger);

            client.socket.pipe(server.socket)
            bindTargetToLogger(client, server, logger);
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
        .listen(config.bindPort, config.bindAddress,)
}
