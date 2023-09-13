import { PassThrough, Readable, Writable } from 'stream'

import { Transport } from './types'
export { Transport } from './types'
export { ConsoleTransport, FileStoreTransport } from './transports'

export class Logger {
    constructor(private readonly transports: Transport[]) {
    }

    log(...parts: string[]) {
        let readable = new Readable()

        const message = parts.length ? [
            new Date().toISOString(),
            ...parts
        ].filter(x => {
            return ![undefined, null].includes(x)
        }).join('|') : ''

        readable.push(message)
        readable.push('\n')
        readable.push(null)

        readable.pipe(this.getStream())
    }

    getStream(): Writable {
        const passThrough = new PassThrough()

        for (let transport of this.transports) {
            passThrough.pipe(transport.getStream())
        }

        return passThrough
    }
}
