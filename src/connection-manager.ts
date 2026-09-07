export interface ManagedConnection {
    expiresAt: number
    close: (reason: string) => void
}

export class ConnectionManager {
    private connections: Map<string, ManagedConnection> = new Map()
    private sweepTimer: NodeJS.Timeout | null = null

    constructor(
        private readonly timeoutMs: number = 300e3, // 5min
        private readonly sweepIntervalMs: number = 30e3, // 30sec
    ) {}

    /**
     * Register a new connection to be managed
     */
    register(id: string, close: (reason: string) => void): void {
        this.connections.set(id, {
            expiresAt: Date.now() + this.timeoutMs,
            close
        })
    }

    /**
     * Update the expiry for an active connection
     */
    touch(id: string): void {
        const conn = this.connections.get(id)
        if (conn) {
            conn.expiresAt = Date.now() + this.timeoutMs
        }
    }

    /**
     * Remove a connection from management (called when connection closes naturally)
     */
    unregister(id: string): void {
        this.connections.delete(id)
    }

    /**
     * Start the sweep timer
     */
    start(): void {
        if (this.sweepTimer) return

        this.sweepTimer = setInterval(() => {
            const now = Date.now()

            for (const [id, conn] of this.connections) {
                if (now > conn.expiresAt) {
                    conn.close('idle_timeout')
                    this.connections.delete(id)
                }
            }
        }, this.sweepIntervalMs)

        // Don't let this timer keep the process alive
        this.sweepTimer.unref()
    }

    /**
     * Stop the sweep timer
     */
    stop(): void {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer)
            this.sweepTimer = null
        }
    }

    /**
     * Close all managed connections
     */
    closeAll(): void {
        for (const conn of this.connections.values()) {
            conn.close('shutdown')
        }
        this.connections.clear()
    }

    /**
     * Get the number of managed connections (useful for monitoring/debugging)
     */
    get size(): number {
        return this.connections.size
    }
}
