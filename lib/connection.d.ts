import { Pool } from 'pg'

export declare const Connection: (
  username: string,
  password: string,
  database: string,
  host: string,
  port: number,
  connectionMax: number
) => Pool
