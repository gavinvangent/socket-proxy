import { Transform } from 'stream'
import { Target } from '../types'

export class ByteTransformer {
    static createStream(outputEncoding: BufferEncoding): Transform {
        return new Transform({
            highWaterMark: 50 * 1024 * 1024, // 50MB
            transform: (chunk: Buffer, encoding: string, cb: (error?: Error | null, data?: any) => void) => {
                if (encoding !== 'buffer') {
                    return cb(new Error(`ByteTransformer does not support encoding type '${encoding}'`))
                }

                const message = chunk.toString(outputEncoding)
                const buffer = Buffer.allocUnsafe(message.length)
                buffer.write(message, 0)

                cb(null, buffer)
            },
        })
    }
}

export class SocketLogTransformer {
    static createStream(source: Target, action: string, destination?: Target): Transform {
        return new Transform({
            highWaterMark: 50 * 1024 * 1024, // 50MB
            transform: (chunk: Buffer, encoding: string, cb: (error?: Error | null, data?: any) => void) => {
                if (encoding !== 'buffer') {
                    return cb(new Error(`SocketLogTransformer does not support encoding type '${encoding}'`))
                }

                const date = new Date().toISOString()
                const sourceInfo = `${source.address}:${source.port}`
                const destinationInfo = `${destination.address}:${destination.port}`
                const result = [date, action, sourceInfo, destinationInfo, ''].join('|')

                const headerBuffer = Buffer.allocUnsafe(result.length)
                headerBuffer.write(result, 0)

                const conc = Buffer.concat([headerBuffer, chunk, Buffer.from('\n')])
                cb(null, conc)
            },
        })
    }
}
