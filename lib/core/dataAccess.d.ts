import { Pool } from 'pg'

type GererateSQLReturnType = {
	sql: string
	replacement: Array<any>
	tableName: string
}

export class DataAccess {
	constructor(connection: Pool)

	/**
	 * @description check whether where clause includes illegal operator, e.g. ===
	 * @param {string} whereClause
	 * @param {boolean} operatorRequired true if the clause must include an operator, false if it must not include an operator
	 */
	private CheckWhereClauseOperator(
		whereClause: string,
		operatorRequired?: boolean
	): boolean

	/**
	 * @description used to standardize the format of whereClauses before they are parsed and tested
	 * @param {string} whereClause the SQL string to be cleaned
	 */
	private cleanWhereClause(whereClause: string)

	/**
	 * @description check whether where clause is illegal
	 * @param {string} whereClause
	 */
	private CheckWhereClause(whereClause: string): boolean

	/**
	 * @description run a single query
	 * @param {string} sql
	 */
	public Execute(sql: string): any

	/**
	 * Transaction
	 * @description Commit many sqls in one transaction, and will rollback all if exist one sql execute failed.
	 * @param {{params: Array<{sql: string,replacements?: Array<any>,alias?: string}>,returnWithAlias?: boolean, returnSingleRecord?: boolean, forceFlat?: boolean}} args includes sqls, their params and alias name.
	 * @param {Function} transaction you can use nested transaction here, you will receive the response from outer transaction, and if inner transaction rollback, others would be rollback
	 * @author Janden Ma
	 */
	public Transaction(
		args: {
			params: Array<{
				sql: string
				replacements?: Array<any>
				alias?: string
			}>
			returnWithAlias?: boolean
			returnSingleRecord?: boolean
			forceFlat?: boolean
		},
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
	): GererateSQLReturnType

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
	): GererateSQLReturnType

	/**
	 * @description generate update sql
	 * @param {GenerateUpdateSQLArgsType} args
	 * @returns {object} an object includes sql and params
	 */
	public GenerateUpdateSQL(args: {
		/** an object includes the fields and values you want to update, must includes primary key and its value */
		params: object
		/** the name of table */
		tableName: string
		/** e.g. "employeeId" = '123' */
		whereClause?: string
		/** the name of primary key, default 'id' */
		pkName?: string
		/** those fields need to set time automatically */
		autoSetTimeFields?: Array<string>
	}): GererateSQLReturnType

	// /**
	//  * @description generate multiple update sql (DONT USE IT UNLESS ALL FIELDS ARE STRING)
	//  * @param {Array<string>} updateFields the fields which you want to update
	//  * @param {Array<object>} params an array includes the fields and values you want to update
	//  * @param {string} tableName the name of table
	//  * @param {string} pkName the name of primary key, default 'id'
	//  * @returns {object} an object includes sql and params
	//  */
	// public GenerateMultiUpdateSQL(
	//   updateFields: Array<string>,
	//   params: Array<object>,
	//   tableName: string,
	//   pkName?: string
	// ): GererateSQLReturnType

	/**
	 * @description An execute inserting helper function
	 * @param {object} params an object includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {object} the response from postgres
	 */
	public InsertExecutor(
		params: object,
		tableName: string,
		callback?: Function
	): object

	/**
	 * @description An execute inserting helper function
	 * @param {Array<string>} insertFields the fields which you want to insert
	 * @param {Array<object>} params an array includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {Array} the responses from postgres
	 */
	public MultiInsertToOneTableExecutor(
		insertFields: Array<string>,
		params: Array<object>,
		tableName: string,
		callback?: Function
	): object

	/**
	 * @description An execute inserting helper function
	 * @param {Array<{params: object, tableName: string}>} items
	 * @param {boolean} forceFlat if true, force all results into a single array
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {Array} the responses from postgres
	 */
	public MultiInsertExecutor(
		items: Array<{ params: object; tableName: string }>,
		forceFlat?: boolean,
		callback?: Function
	): Array<object>

	/**
	 * @description An execute updating helper function, update by primary key
	 * @param {object} params an object includes the fields and values you want to update, must includes primary key and its value
	 * @param {string} tableName the name of table
	 * @param {string} pkName the name of primary key, default 'id'
	 * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {object} the response from postgres
	 */
	public UpdateByPkExecutor(
		params: object,
		tableName: string,
		pkName?: string,
		autoSetTimeFields?: Array<string>,
		callback?: Function
	): object

	/**
	 * @description An execute updating helper function, custom conditions
	 * @param {object} params an object includes the fields and values you want to update, must includes primary key and its value
	 * @param {string} tableName the name of table
	 * @param {string} whereClause e.g. "employeeId" = '123'
	 * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {object} the response from postgres
	 */
	public UpdateExecutor(
		params: object,
		tableName: string,
		whereClause: string,
		autoSetTimeFields?: Array<string>,
		callback?: Function
	): object

	/**
	 * @description An execute updating helper function, custom conditions
	 * @param {Array<{params: object, tableName: string, whereClause: string, pkName: string, autoSetTimeFields: Array<string>}>} items
	 * @forceFlat {boolean} if true, force all results into a single array
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {Array<object>} the response from postgres
	 */
	public MultiUpdateExecutor(
		items: Array<{
			params: object
			tableName: string
			whereClause: string
			pkName: string
			autoSetTimeFields?: Array<string>
		}>,
		forceFlat?: boolean,
		callback?: Function
	): Array<object>

	// /**
	//  * @description An execute updating helper function (DONT USE IT UNLESS ALL FIELDS ARE STRING)
	//  * @param {Array<string>} updateFields the fields which you want to update
	//  * @param {Array<Object>} params an array includes the fields and values you want to update
	//  * @param {string} tableName the name of table
	//  * @param {string} pkName the name of primary key, default 'id'
	//  * @returns {Array} the responses from postgres
	//  */
	// public MultiUpdateInOneTableExecutor(
	//   updateFields: Array<string>,
	//   params: Array<object>,
	//   tableName: string,
	//   pkName?: string
	// ): object

	/**
	 * @description An execute deleting helper function
	 * @param {string} tableName the name of table
	 * @param {string} whereClause e.g. "employeeId" = '123'
	 * @param {boolean} returnSingleRecord if true, only return one record
	 * @param {function} callback function to be run before committing the database transaction
	 * @returns {object} the response from postgres
	 */
	public DeleteExecutor(
		tableName: string,
		whereClause: string,
		returnSingleRecord?: boolean,
		callback?: Function
	): object

	/**
	 * @description An execute querying helper function for one table
	 * @param {SingleQueryExecutorArgsType} args
	 * @returns {object} the response from postgres
	 */
	public SingleQueryExecutor(args: {
		/** the name of table */
		tableName: string
		/** e.g. "employeeId" = '123' */
		whereClause: string
		/** the fields what you want to select, default * */
		selectFields?: string
		/** the field name for sorting, e.g.: 'id DESC' */
		sortBy?: string
		/** to limit the count of rows you want to query */
		limit?: number
		/** how many rows you want to skip */
		offset?: number
		/**  function to run before committing */
		callback?: any
		/** whether or not to return a single record*/
		returnSingleRecord?: boolean
	}): object
}
