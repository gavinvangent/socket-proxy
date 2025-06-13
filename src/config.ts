import minimist from 'minimist'

export class Config {
    /** The address for the proxy to listen on */
    bindAddress: string
    /** The port for the proxy to listen on */
    bindPort: number
    /** The address for the proxy to send received traffic to */
    serverAddress: string
    /** The port for the proxy to send received traffic to */
    serverPort: number
    /** The type of listener to create, udp6 or udp4, defaults to udp4 */
    type: 'tcp' | 'udp4' | 'udp6'
    /** The path on disk where to write logs to */
    logPath?: string
    /** the TCP Keep-Alive Interval (milliseconds) for the 'client' Connection, defaults to none */
     clientKeepAliveInterval: number
    /** the TCP Keep-Alive Interval (milliseconds) for the 'server' Connection, defaults to none */
    serverKeepAliveInterval: number

    static fromArgs(argv: string[], pkg: any): Config {
        const args: string[] = minimist(argv.slice(2))
        const config = new Config()

        config.bindAddress = this.param(args, 'bindAddress', '0.0.0.0')
        config.bindPort = +this.param(args, 'bindPort', '0')

        config.serverAddress = this.param(args, 'serverAddress')
        config.serverPort = +this.param(args, 'serverPort', '0')

        config.type = this.param(args, 'type', 'tcp') as 'tcp' | 'udp4' | 'udp6'

        if (config.type === ('udp' as any)) {
            config.type = 'udp4'
        }

        config.logPath = this.param(args, 'logPath')

        config.clientKeepAliveInterval = +this.param(args, 'clientKeepAliveInterval', '0')
        config.serverKeepAliveInterval = +this.param(args, 'serverKeepAliveInterval', '0')

        return config
    }

    /**
     * Extracts an argument value by name
     * @param args the list of args to find the param in
     * @param name the name of the param to extract
     * @param def a default value if no value is found
     */
    private static param(args: string[], name: string, def: any = null): string {
        return args[name] || process.env[name.toUpperCase()] || def
    }

    /**
     * Tests a value of unknown type to the equivalent of true
     * @param value 
     * @returns 
     */
    static isTrue(value: any): boolean {
        return /^(true|1)$/i.test(value) || value === 1 || value === true
    }

    /**
     * Returns void if valid, throws an error when invalid
     */
    validate(): void {
        if (!this.bindAddress) {
            throw new Error(`No 'bindAddress' was specified`)
        }

        if (!this.bindPort) {
            throw new Error(`No 'bindPort' was specified`)
        }

        if (this.bindPort < 1) {
            throw new Error(`The 'bindPort' is invalid (extracted '${this.bindPort}')`)
        }

        if (!this.serverAddress) {
            throw new Error(`No 'serverAddress' was specified`)
        }

        if (!this.serverPort) {
            throw new Error(`No 'serverPort' was specified`)
        }

        if (this.serverPort < 1) {
            throw new Error(`The 'serverPort' is invalid (extracted '${this.serverPort}')`)
        }

        if (!['tcp', 'udp4', 'udp6'].includes(this.type)) {
            throw new Error(`Invalid udp type supplied [fifth argument]. Options are 'tcp', 'udp', 'udp4' or 'udp6'`)
        }
    }
}
