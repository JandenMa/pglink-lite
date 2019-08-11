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
  useName?: string
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
}

/**
 * To connect the postgresql
 */
export declare const Connection: (args: ConnectionArgsType) => Pool
