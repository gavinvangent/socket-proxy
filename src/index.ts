import path from 'path'
import { readFileSync } from 'fs'
import { Config } from './config'
import { createTcpProxy } from './tcp';
import { createUdpProxy } from './udp';
import { NotSupportedError } from './lib/errors';

/******** Global error handling ********/
const onError = (type: string, error: Error) => {
    console.error(type, error);
    process.exit(1);
};

process.on('unhandledRejection', (error: Error) => onError('UNHANDLED', error));
process.on('uncaughtException', (error: Error) => onError('UNCAUGHT', error));

/******** Config extraction ********/
const pkgPath = path.resolve(`${__dirname}/../package.json`);
const pkg = JSON.parse(readFileSync(pkgPath, { encoding: 'utf8' }));
const config: Config = Config.fromArgs(process.argv, pkg);
config.validate()

/******** Listener Configuration ********/
switch (config.type) {
    case 'tcp':
        createTcpProxy(config);
        break;
    case 'udp4':
    case 'udp6':
        createUdpProxy(config);
        break;
    default:
        throw new NotSupportedError(`config.type '${config.type}' is not supported`);
}