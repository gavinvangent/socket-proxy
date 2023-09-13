import { Socket as UdpSocket } from 'dgram'
import { Socket as TcpSocket } from 'net'

export interface Target {
    address: string
    port: number
    family?: string
}

export interface UdpTarget extends Target {
    socket: UdpSocket
    alias: string
    size?: number
}

export interface TcpTarget extends Target {
    socket: TcpSocket
    alias: string
    size?: number
}
