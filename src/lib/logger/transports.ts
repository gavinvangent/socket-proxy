import { Writable } from 'stream'
import { createWriteStream } from 'fs'
import { Transport } from './types'

export class ConsoleTransport implements Transport {
    constructor() {
    }

    getStream(): Writable {
        return process.stdout
    }
}

export class FileStoreTransport implements Transport {
    constructor(public readonly logPath: string) {
    }

    getStream(): Writable {
        return createWriteStream(this.logPath, { flags: 'a' })
    }
}
