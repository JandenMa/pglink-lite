import { Pool } from 'pg'

export declare class Pgraphql {
  constructor(
    username: string,
    password: string,
    database: string,
    host: string,
    port?: number,
    connectionMax?: number
  )
  private _inst: Pool
}
