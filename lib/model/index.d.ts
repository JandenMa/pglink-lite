import { Pool } from 'pg'
import { DataAccess } from '../core/dataAccess'
import { Interface } from 'readline'

/**
 * @interface
 * @description A base class for other classes to operate CRUD
 * @author Janden Ma
 */
export class ModelBase {
  /**
   * @constructor
   * @description A base class for other classes to operate CRUD
   * @param {string} tableName the name of table
   * @param {string} [pkName] the name of primary key, default 'id'
   * @param {Object} [enumMapping] to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}}
   */
  constructor(props: {
    /** the name of table */
    tableName: string
    /** the name of primary key, default 'id' */
    pkName?: string
    /** to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} */
    enumMapping?: object
  })

  /** db operator */
  protected dataAccess: DataAccess

  /**
   * @method
   * @description query without conditions for one table
   */
  protected findAll(): object

  /**
   * @method
   * @description query by primary key for one table
   * @param pk primary key value
   * @param selectFields default "*"
   */
  protected findByPK(pk: string | number, selectFields?: string): object

  /**
   * @method
   * @description query with conditions for one table
   * @param whereClause e.g. "employeeId" = '123'
   * @param selectFields default "*"
   */
  protected findByConditions(
    whereClause: string,
    selectFields?: string
  ): Array<any>

  /**
   * @method
   * @description insert one row
   * @param {Object} params an object includes the fields and values
   */
  protected insertOne(params: object): object

  /**
   * @method
   * @description multiple insert
   * @param {Array<object>} items the array of data to be inserted into table
   */
  protected multiInsert(items: Array<object>): Array<any>

  /**
   * @method
   * @description update by primary key, but the primary key should be included in the params
   * @param {Object} params an object includes the fields and values
   */
  protected updateByPk(params: object): object

  /**
   * @method
   * @description update by where conditions
   * @param {Object} params an object includes the fields and values
   * @param {string} whereClause e.g. "employeeId" = '123'
   */
  protected updateByConditions(params: object, whereClause: string): object

  /**
   * @method
   * @description multiple update by where conditions
   * @param {Array<object>} items the array of data to be inserted into table
   * @param {string} whereClause e.g. "companyId = $1"
   * @param {Array<string>} replacementFields e.g ['companyId']
   */
  protected multiUpdateWithConditions(
    items: Array<object>,
    whereClause?: string,
    replacementFields?: Array<string>
  ): Array<any>

  /**
   * @method
   * @description delete by where conditions
   * @param {string} whereClause e.g. "employeeId" = '123'
   */
  protected deleteByConditions(whereClause: string): object

  /**
   * @method
   * @description to encode value from enum to integer
   * @param {Array|Object} args the input request
   */
  protected encodeFromEnum(args: Array<any> | object): Array<any> | object

  /**
   * @method
   * @description to decaode value from integer to enum
   * @param {Array|Object} args the output response
   */
  protected decodeToEnum(args: Array<any> | object): Array<any> | object
}

/**
 * @param {Pool} connection
 */
export function ModelImpl(connection: Pool): typeof ModelBase
