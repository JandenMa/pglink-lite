import { Pool } from 'pg'
import { DataType } from './dataType/dataType'
import { DataAccess } from './core/dataAccess'

export declare class Pgraphql {
  constructor(
    username: string,
    password: string,
    database: string,
    host: string,
    port?: number,
    connectionMax?: number,
    isLambda?: boolean
  )
  private static dataType: DataType
  public dataAccess: DataAccess
}
