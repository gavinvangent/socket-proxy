import { createServer, createConnection, AddressInfo } from 'net'
import { TcpTarget } from './types'
import { Config } from './config'

export function createTcpProxy(config: Config) {
    const listener = createServer()

    const bindClientToServer = (client: TcpTarget, server: TcpTarget) => {
        server.socket.once('error', err => {
            console.log(err)
            client.socket.end();
        }).once('connect', () => {
            client.socket.pipe(process.stdout)
            client.socket.pipe(server.socket)

            server.socket.pipe(process.stdout)
            server.socket.pipe(client.socket)
        })
    }

    listener
        .on('connection', (socket) => {
            const client: TcpTarget = { socket, ...socket.address() as AddressInfo, alias: 'client' }
            let server: TcpTarget = {
                socket: createConnection({ host: config.serverAddress, port: config.serverPort }),
                alias: 'server',
                address: config.serverAddress,
                port: config.serverPort
            }

            bindClientToServer(client, server);
        })
        .on('listening', () => {
            console.log(`Listening on ${config.bindAddress}:${config.bindPort}`)
        })
        .listen(config.bindPort, config.bindAddress,)
}