import { Pool } from 'pg'

/**
 * @interface
 * @description A base class for other classes to operate CRUD
 * @author Janden Ma
 */
export interface ModelBase {
  /**
   * @constructor
   * @description A base class for other classes to operate CRUD
   * @param {Object} params an object includes the fields and values
   * @param {string} tableName the name of table
   * @param {string} [pkName] the name of primary key, default 'id'
   */
  new (args: {
    /** an object includes the fields and values */
    params: object
    /** the name of table */
    tableName: string
    /** the name of primary key, default 'id' */
    pkName?: string
    /** to defined the enum key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} */
    enumMapping?: object
  }): ModelBase

  /**
   * @method
   * @description query without conditions for one table
   */
  findAll(): object
  /**
   * @method
   * @description query by primary key for one table
   * @param pk primary key value
   * @param selectFields default "*"
   */
  findByPK(pk: string | number, selectFields?: string): object
  /**\
   * @method
   * @description query with conditions for one table
   * @param whereClause e.g. "employeeId" = '123'
   * @param selectFields default "*"
   */
  findByConditions(whereClause: string, selectFields?: string): Array<any>
  /**
   * @method
   * @description insert one row
   */
  insertOne(): object
  /**
   * @method
   * @description update by primary key, but the primary key should be included in the params
   */
  updateByPk(): object
  /**
   * @method
   * @description update by where conditions
   * @param {string} whereClause e.g. "employeeId" = '123'
   */
  updateByConditions(whereClause: string): object

  /**
   * @method
   * @description delete by where conditions
   * @param {string} whereClause e.g. "employeeId" = '123'
   */
  deleteByConditions(whereClause: string): object
}

/**
 * @param {Pool} connection
 */
export const ModelImpl: (connection: Pool) => ModelBase
