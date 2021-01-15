import { Pool } from 'pg'
import { DataAccess } from '../core/dataAccess'

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
    tableName: string
    /** the name of primary key, default 'id' */
    pkName?: string
    /** to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} */
    enumMapping?: object
    /** used to define fields that should be automatically updated with a current timestamp default from globalAutoSetTimeFields */
    autoSetTimeFields?: Array<string>
  })

  /** db operator */
  protected dataAccess: DataAccess

  /**
   * @method
   * @param {object} object
   * @param {object} object.options may contain fields such as sortBy, offset, or limit
   * @param {Array<{ field: String; sequence?: 'ASC' | 'DESC' }>} options.sortBy an sql string to sort the results of the query
   * @param {string} options.limit as sql string to limit the results of the queiry
   * @param {offset} options.offset an sql string to offset the results of the query
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   * @param {function} callback Function to be run before comitting the database operation
   * @description query without conditions for one table
   */
  protected findAll(object?: {
    options?: {
      sortBy?: Array<{ field: String; sequence?: 'ASC' | 'DESC' }>
      limit?: String
      offset?: String
      preserveClient?: Boolean
    }
    callback?: Function
  }): object

  /**
   * @method
   * @description query by primary key for one table
   * @param {object} object
   * @param {string|number} object.pk primary key value
   * @param {string} object.selectFields which columns you want to query, default '*'
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected findByPk(object: {
    pk: string | number | Object
    selectFields?: string
    callback?: Function
    preserveClient?: Boolean
  }): object

  /**
   * @method
   * @description query with conditions for one table
   * @param {object} object
   * @param {string} object.whereClause e.g. "employeeId" = '123'
   * @param {string} object.selectFields which columns you want to query, default '*'
   * @param {object} object.options may contain fields such as sortBy, offset, or limit
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {bool} objerct.preserveClient whether or not to skip committing the client after the transaction
   * @param {Array<{ field: String; sequence?: 'ASC' | 'DESC' }>} options.sortBy an sql string to sort the results of the query
   * @param {string} options.limit as sql string to limit the results of the queiry
   * @param {offset} options.offset an sql string to offset the results of the query
   */
  protected findByConditions(object: {
    whereClause: string
    selectFields?: string
    options?: {
      sortBy?: Array<{ field: String; sequence?: 'ASC' | 'DESC' }>
      limit?: String
      offset?: String
    }
    preserveClient?: Boolean
    callback?: Function
  }): Array<Object>

  /**
   * @method
   * @description insert one row
   * @param {Object} object
   * @param {Object} object.params an object includes the fields and values
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected insertOne(object: {
    params: Object
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): object

  /**
   * @method
   * @description multiple insert
   * @param {Object} object
   * @param {Array<object>} object.items the array of data to be inserted into table
   * @param { bool } object.forceFlat force the results into a single array
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected multiInsert(object: {
    items: Array<object>
    forceFlat?: boolean
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): Array<any>

  /**
   * @method
   * @description update by primary key, but the primary key should be included in the params
   * @param {Object} object
   * @param {Object} object.params an object includes the fields and values
   * @param {Array<string>} object.autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected updateByPk(object: {
    params: object
    autoSetTimeFields?: Array<string>
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): object

  /**
   * @method
   * @description update by where conditions
   * @param {Object} object
   * @param {Object} object.params an object includes the fields and values
   * @param {string} object.whereClause e.g. "employeeId" = '123'
   * @param {Array<string>} object.autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected updateByConditions(object: {
    params: object
    whereClause: string
    autoSetTimeFields?: Array<string>
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): object

  /**
   * @method
   * @description multiple update by where conditions
   * @param {Object} object
   * @param {Array<object>} object.items the array of data to be updated into table
   * @param {string} object.whereClause e.g. "'companyId' = $1"
   * @param {Array<string>} object.replacementFields e.g ['companyId']
   * @param {Array<string>} object.autoSetTimeFields Those fields need to set time automatically, should be included in items, e.g ['updatedAt']
   * @param { bool } object.forceFlat force the results into a single array
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected multiUpdateWithConditions(object: {
    items: Array<object>
    whereClause?: string
    replacementFields?: Array<string>
    autoSetTimeFields?: Array<string>
    forceFlat?: boolean
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): Array<any>

  /**
   * @method
   * @description delete by where conditions
   * @param {object} object
   * @param {string} object.whereClause e.g. "employeeId" = '123'
   * @param {boolean} object.returnSingleRecord whether or not to only return one record
   * @param {function} object.callback Function to be run before comitting the database operation
   * @param {object} object.client the pg client used for each query in the transaction
   * @param {bool} object.preserveClient whether or not to skip committing the client after the transaction
   */
  protected deleteByConditions(object: {
    whereClause: string
    returnSingleRecord?: boolean
    callback?: Function
    client?: Object
    preserveClient?: Boolean
  }): object

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
 * @param {DataAccess} dataAccess
 * @param {Array<string>} globalAutoSetTimeFields used to define fields that should be automatically updated with a current timestamp default []
 */
export function ModelImpl(
  dataAccess: DataAccess,
  globalAutoSetTimeFields: Array<string>
): typeof ModelBase
