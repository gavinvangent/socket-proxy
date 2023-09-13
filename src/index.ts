import path from 'path'
import { readFileSync } from 'fs'
import { Config } from './config'
import { createTcpProxy } from './tcp'
import { createUdpProxy } from './udp'
import { NotSupportedError } from './lib/errors'
import { ConsoleTransport, FileStoreTransport, Logger, Transport } from './lib/logger'

let logger: Logger;

/******** Global error handling ********/
const onError = (type: string, error: Error) => {
    console.error(type, error);
    if (logger) {
        logger.log(type, error.name, error.message, error.stack);
        // give us time to log the error, then exit
        setTimeout(() => process.exit(1), 2000);
    } else {
        process.exit(1);
    }
}

process.on('unhandledRejection', (error: Error) => onError('UNHANDLED', error))
process.on('uncaughtException', (error: Error) => onError('UNCAUGHT', error))

/******** Config extraction ********/
const pkgPath = path.resolve(`${__dirname}/../package.json`)
const pkg = JSON.parse(readFileSync(pkgPath, { encoding: 'utf8' }))
const config: Config = Config.fromArgs(process.argv, pkg)
config.validate()

/******** Logger ********/
const transports: Transport[] = [];
transports.push(new ConsoleTransport());
if (config.logPath) {
    transports.push(new FileStoreTransport(config.logPath))
}
logger = new Logger(transports)

/******** Listener Configuration ********/
switch (config.type) {
    case 'tcp':
        createTcpProxy(config, logger)
        break
    case 'udp4':
    case 'udp6':
        createUdpProxy(config, logger)
        break
    default:
        throw new NotSupportedError(`config.type '${config.type}' is not supported`)
}
