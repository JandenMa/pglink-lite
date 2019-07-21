import { Pool } from 'pg'

/**
 * To connect the postgresql
 */
export declare const Connection: (
  username: string,
  password: string,
  database: string,
  host: string,
  port: number,
  connectionMax: number
) => Pool
