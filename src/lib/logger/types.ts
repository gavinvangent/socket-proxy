import { Writable } from 'stream'

export interface Transport {
    getStream(): Writable
}
