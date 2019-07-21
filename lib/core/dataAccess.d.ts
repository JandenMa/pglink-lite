// import { Connection } from './connection'

export declare class DataAccess {
  constructor(
    username: string,
    password: string,
    database: string,
    host: string,
    port: number,
    connectionMax: number
  )

  /**
   * @description check whether where clause includes illegal operator, e.g. ===
   * @param {string} whereClause
   */
  private CheckWhereClauseOperator(whereClause: string): boolean

  /**
   * @description check whether where clause is illegal
   * @param {string} whereClause
   */
  private CheckWhereClause(whereClause: string): boolean

  /**
   * Transaction
   * @description Commit many sqls in one transaction, and will rollback all if exist one sql execute failed.
   * @param {Array<String>} sqls Any sql you want to commit. Add them in an array.
   * @param {Array<Array>} params If you use placeholder (such as $1,$2), you should pass this props to set values.And the length of this array should be eauql to the sqls array. So you push an empty array into it though you don't use placeholder.
   * @param {Array<String>} tableNames for responses
   * @param {Function} transaction you can use nested transaction here, you will receive the response from outer transaction, and if inner transaction rollback, others would be rollback
   * @author Janden Ma
   */
  public Transaction(
    sqls: Array<string>,
    params: Array<Array<object>>,
    tableNames: Array<string>,
    transaction: Function
  ): any

  /**
   * @description generate insert sql
   * @param {object} params an object includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @returns {object} an object includes sql and params
   */
  public GenerateInsertSQL(
    params: object,
    tableName: string
  ): { sql: string; paramArray: Array<any> }

  /**
   * @description generate multiple insert sql
   * @param {Array<string>} insertFields the fields which you want to insert
   * @param {Array<object>} params an array includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @returns {object}  an object includes sql and params
   */
  public GenerateMultiInsertSQL(
    insertFields: Array<string>,
    params: Array<object>,
    tableName: string
  ): { sql: string; paramArray: Array<any> }

  /**
   * @description generate update sql
   * @param {object} params an object includes the fields and values you want to update, must includes primary key and its value
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {string} pkName the name of primary key, default 'id'
   * @returns {object} an object includes sql and params
   */
  public GenerateUpdateSQL(
    params: object,
    tableName: string,
    whereClause: string,
    pkName?: string
  ): { sql: string; paramArray: Array<any> }

  /**
   * @description generate multiple update sql (DONT USE IT UNLESS ALL FIELDS ARE STRING)
   * @param {Array<string>} updateFields the fields which you want to update
   * @param {Array<object>} params an array includes the fields and values you want to update
   * @param {string} tableName the name of table
   * @param {string} pkName the name of primary key, default 'id'
   * @returns {object} an object includes sql and params
   */
  public GenerateMultiUpdateSQL(
    updateFields: Array<string>,
    params: Array<object>,
    tableName: string,
    pkName?: string
  ): { sql: string; paramArray: Array<any> }

  /**
   * @description An execute inserting helper function
   * @param {object} params an object includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @returns {object} the response from postgres
   */
  public InsertExecutor(params: object, tableName: string): object

  /**
   * @description An execute inserting helper function
   * @param {Array<string>} insertFields the fields which you want to insert
   * @param {Array<object>} params an array includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @returns {Array} the responses from postgres
   */
  public MultiInsertToOneTableExecutor(
    insertFields: Array<string>,
    params: Array<object>,
    tableName: string
  ): object

  /**
   * @description An execute inserting helper function
   * @param {Array<{params: object, tableName: string}>} items
   * @returns {Array} the responses from postgres
   */
  public MultiInsertExecutor(
    items: Array<{ params: object; tableName: string }>
  ): Array<object>

  /**
   * @description An execute updating helper function, update by primary key
   * @param {object} params an object includes the fields and values you want to update, must includes primary key and its value
   * @param {string} tableName the name of table
   * @param {string} pkName the name of primary key, default 'id'
   * @returns {object} the response from postgres
   */
  public UpdateByPkExecutor(
    params: object,
    tableName: string,
    pkName?: string
  ): object

  /**
   * @description An execute updating helper function, custom conditions
   * @param {object} params an object includes the fields and values you want to update, must includes primary key and its value
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @returns {object} the response from postgres
   */
  public UpdateExecutor(
    params: object,
    tableName: string,
    whereClause: string
  ): object

  /**
   * @description An execute updating helper function, custom conditions
   * @param {Array<{params: object, tableName: string, whereClause: string, pkName: string}>} items
   * @returns {Array<object>} the response from postgres
   */
  public MultiUpdateExecutor(
    items: Array<{
      params: object
      tableName: string
      whereClause: string
      pkName: string
    }>
  ): Array<object>

  /**
   * @description An execute updating helper function (DONT USE IT UNLESS ALL FIELDS ARE STRING)
   * @param {Array<string>} updateFields the fields which you want to update
   * @param {Array<Object>} params an array includes the fields and values you want to update
   * @param {string} tableName the name of table
   * @param {string} pkName the name of primary key, default 'id'
   * @returns {Array} the responses from postgres
   */
  public MultiUpdateInOneTableExecutor(
    updateFields: Array<string>,
    params: Array<object>,
    tableName: string,
    pkName?: string
  ): object

  /**
   * @description An execute deleting helper function by primary key
   * @param {string} tableName the name of table
   * @param {number|string} pkValue primary key value
   * @param {string} pkName primary key name, default 'id'
   * @returns {object} the response from postgres
   */
  public DeleteByPkExecutor(
    tableName: string,
    pkValue: number | string,
    pkName?: string
  ): object

  /**
   * @description An execute deleting helper function
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @returns {object} the response from postgres
   */
  public DeleteExecutor(tableName: string, whereClause: string): object

  /**
   * @description An execute querying helper function for one table
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {string} selectFields the fields what you want to select, default *
   * @returns {object} the response from postgres
   */
  public SingleQueryExecutor(
    tableName: string,
    whereClause: string,
    selectFields?: string
  ): object
}
