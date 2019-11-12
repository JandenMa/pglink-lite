import { Pool } from 'pg';
import { DataAccess } from '../core/dataAccess';
import { Interface } from 'readline';

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
   * @param {string} pkName the name of primary key, default 'id'
   * @param {Object} enumMapping to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}}
   * @param {Array<string>} autoSetTimeFields used to define fields that should be automatically updated with a current timestamp default from globalAutoSetTimeFields
   */
  constructor(props: {
    /** the name of table */
    tableName: string;
    /** the name of primary key, default 'id' */
    pkName?: string;
    /** to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} */
    enumMapping?: object;
    /** used to define fields that should be automatically updated with a current timestamp default from globalAutoSetTimeFields */
    autoSetTimeFields?: Array<string>;
  });

  /** db operator */
  protected dataAccess: DataAccess;

  /**
   * @method
   * @param {function} callback Function to be run before comitting the database operation
   * @description query without conditions for one table
   */
  protected findAll(callback?: Function): object;

  /**
   * @method
   * @description query by primary key for one table
   * @param pk primary key value
   * @param selectFields default "*"
   */
  protected findByPK(
    pk: string | number,
    selectFields?: string,
    callback?: Function
  ): object;

  /**
   * @method
   * @description query with conditions for one table
   * @param whereClause e.g. "employeeId" = '123'
   * @param selectFields default "*"
   * @param {function} callback Function to be run before comitting the database operation
   */
  protected findByConditions(
    whereClause: string,
    selectFields?: string,
    callback?: Function
  ): Array<any>;

  /**
   * @method
   * @description insert one row
   * @param {Object} params an object includes the fields and values
   */
  protected insertOne(params: object, callback?: Function): object;

  /**
   * @method
   * @description multiple insert
   * @param {Array<object>} items the array of data to be inserted into
   * @param {boolean} forceFlat if true, force all results into one array
   */
  protected multiInsert(
    items: Array<object>,
    forceFlat?: boolean,
    callback?: Function
  ): Array<any>;

  /**
   * @method
   * @description update by primary key, but the primary key should be included in the params
   * @param {Object} params an object includes the fields and values
   * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in items, e.g ['updatedAt']
   */
  protected updateByPk(
    params: object,
    autoSetTimeFields?: Array<string>,
    callback?: Function
  ): object;

  /**
   * @method
   * @description update by where conditions
   * @param {Object} params an object includes the fields and values
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
   */
  protected updateByConditions(
    params: object,
    whereClause: string,
    autoSetTimeFields?: Array<string>,
    callback?: Function
  ): object;

  /**
   * @method
   * @description multiple update by where conditions
   * @param {Array<object>} items the array of data to be updated into table
   * @param {string} whereClause e.g. "companyId = $1"
   * @param {Array<string>} replacementFields e.g ['companyId']
   * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in items, e.g ['updatedAt']
   * @param {boolean} forceFlat if true, force all results into one array
   * @param {function} callback function to be run before comitting the transaction
   */
  protected multiUpdateWithConditions(
    items: Array<object>,
    whereClause?: string,
    replacementFields?: Array<string>,
    autoSetTimeFields?: Array<string>,
    forceFlat?: boolean,
    callback?: Function
  ): Array<any>;

  /**
   * @method
   * @description delete by where conditions
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {boolean} returnSingleRecord if true, only return one record
   */
  protected deleteByConditions(
    whereClause: string,
    returnSingleRecord?: boolean,
    callback?: Function
  ): object;

  /**
   * @method
   * @description to encode value from enum to integer
   * @param {Array|Object} args the input request
   */
  protected encodeFromEnum(args: Array<any> | object): Array<any> | object;

  /**
   * @method
   * @description to decaode value from integer to enum
   * @param {Array|Object} args the output response
   */
  protected decodeToEnum(args: Array<any> | object): Array<any> | object;
}

/**
 * @param {Pool} connection
 * @param {Array<string>} globalAutoSetTimeFields used to define fields that should be automatically updated with a current timestamp default []
 */
export function ModelImpl(
  connection: Pool,
  globalAutoSetTimeFields: Array<string>
): typeof ModelBase;
