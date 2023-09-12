import { Socket as UdpSocket } from 'dgram'
import { Socket as TcpSocket } from 'net'

export interface UdpTarget {
    socket: UdpSocket
    alias: string
    address: string
    port: number
    family?: string
    size?: number
}

export interface TcpTarget {
    socket: TcpSocket
    alias: string
    address: string
    port: number
    family?: string
    size?: number
}
