import { PassThrough, Readable, Writable } from 'stream'

import { Transport } from './types'
export { Transport } from './types'
export { ConsoleTransport, FileStoreTransport } from './transports'

export class Logger {
    constructor(private readonly transports: Transport[]) {
    }

    private _stream: Writable;

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

        readable.pipe(this.getStream(), { end: false })
    }

    getStream(): Writable {
        if (this._stream && !this._stream.destroyed) {
            return this._stream
        }

        this._stream = new PassThrough()

        for (let transport of this.transports) {
            this._stream.pipe(transport.getStream(), { end: false })
        }

        return this._stream
    }
}
