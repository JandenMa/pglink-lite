import { Pool } from 'pg'

type ConnectionArgsType = {
  /**
   * @description Postgresql host, default localhost
   * @type {string}
   */
  host?: string
  /**
   * @description Postgresql port, default 5432
   * @type {number}
   */
  port?: number
  /**
   * @description Postgresql user name, default postgres
   * @type {string}
   */
  userName?: string
  /**
   * @description Postgresql password, default empty
   * @type {string}
   */
  password?: string
  /**
   * @description Postgresql database, default postgres
   * @type {string}
   */
  database?: string
  /**
   * @description Postgresql max connection, default 10
   * @type {number}
   */
  connectionMax?: number
  /**
   * @description Number of milliseconds to wait before timing
   * out when connecting a new client, by default this is 0 which means no timeout
   * @type {number}
   */
  connectionTimeoutMillis?: number
  /**
   * @description Number of milliseconds a client must sit idle in the pool
   * and not be checked out, before it is disconnected from the backend and discarded,
   * default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients
   * @type {number}
   */
  idleTimeoutMillis?: number
  /**
   * @description Connect using ssl connection
   * @type {boolean}
   */
  ssl?: boolean
}

/**
 * To connect the postgresql
 */
export const Connection: (args: ConnectionArgsType) => Pool
