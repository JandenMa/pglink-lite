const { Pool } = require("pg")

/**
 * @class A helper class for pg
 */
class DataAccess {
	/**
	 * @param {Pool} connection
	 */
	constructor(connection) {
		this.conn = connection
		this.op = [
			"=",
			">",
			"<",
			"<=",
			">=",
			"!=",
			"IN",
			"NOT IN",
			"BETWEEN",
			"LIKE"
		]
		this.joiner = { and: "AND", or: "OR" }
	}

	/**
	 * @description Commit many sqls in one transaction, and will rollback all if exist one sql execute failed.
	 * @param {{params: Array<{sql: string,replacements: Array<any>,tableName: string}>,returnTableName: boolean}} args includes sqls, their params and table name.
	 * @param {Function} transaction you can use nested transaction here, you will receive the response from outer transaction, and if inner transaction rollback, others would be rollback
	 * @author Janden Ma
	 */
	async Transaction(args, transaction) {
		if (!args)
			throw new Error('"args" for Transaction should not be undefined or null')
		const { params, returnTableName = false } = args
		// note: we don't try/catch this because if connecting throws an exception
		// we don't need to dispose of the client (it will be undefined)
		if (params.length === 0)
			throw new Error('Length of "params" must be greater than 0')
		const client = await this.conn.connect()
		let resArray = []
		try {
			await client.query("BEGIN")
			/* *************************************************************************  
        We can't use async/await in forEach/map loop, if we call await on 
        a non-promise, it will immediately resolve to the value (i.e. the array).  
        It causes we can't not catch the inner error stacks normally.
        Calling .map(...) returns an array, so we need to call Promise.all(...) 
        to await all of them.  -- By Janden Ma
      ************************************************************************** */
			await Promise.all(
				params.map(async p => {
					const { sql, replacements, tableName } = p
					if (returnTableName && !tableName) {
						throw new Error(
							"tableName should be string when returnTableName is true, but get undefined or null"
						)
					}
					const res =
						replacements && replacements.length > 0
							? await client.query(sql, replacements)
							: await client.query(sql)
					if (returnTableName) {
						resArray.push({ tableName, res })
					} else {
						resArray.push(res)
					}
				})
			)
			if (transaction) resArray = await transaction(resArray)
			await client.query("COMMIT")
			// Transaction succeeded so retain connection in pool
			client.release()
			// Return the work
			return resArray
		} catch (err) {
			try {
				console.log("TRANSACTION ROLLBACK: ", err)
				await client.query("ROLLBACK")
				client.release()
			} catch (e) {
				console.log("ROLLBACK ERROR: ", e)
				// Rollback failed so discard connection
				client.release(e)
				throw e
			}
			throw err
		}
	}

	/**
	 * @description A helper function to check whether the column exists in the dbtable
	 * @param {String} tableName the name of dbtable
	 * @param {String} columnName the column name you will check
	 * @returns {Boolean} exist or not
	 */
	async CheckTableColumnExist(tableName, columnName) {
		try {
			const sql = `select * from information_schema.columns WHERE table_name = '${tableName}' and column_name = '${columnName}'`
			const res = await this.Transaction([sql])
			if (res[0].rows.length > 0) return true
			return false
		} catch (e) {
			throw e
		}
	}

	/**
	 * @description check whether where clause includes illegal operator, e.g. ===
	 * @param {string} whereClause
	 */
	CheckWhereClauseOperator(whereClause) {
		let illegal = true
		this.op.every(p => {
			if (
				String(whereClause)
					.toUpperCase()
					.indexOf(p) !== -1 &&
				String(whereClause)
					.toUpperCase()
					.split(p).length === 2
			) {
				illegal = false
				return false
			}
			return true
		})
		if (illegal) throw new Error("condition operator is illegal")
	}

	/**
	 * @description check whether where clause is illegal
	 * @param {string} whereClause
	 */
	CheckWhereClause(whereClause) {
		let aArr = []
		let oArr = []
		aArr = whereClause.toUpperCase().split(this.joiner.and)
		if (aArr.length > 1) {
			aArr.forEach(a => {
				oArr = a.toUpperCase().split(this.joiner.or)
				if (oArr.length > 1) {
					oArr.forEach(o => this.CheckWhereClause(o))
				} else {
					this.CheckWhereClauseOperator(a)
				}
			})
		} else {
			oArr = whereClause.toUpperCase().split(this.joiner.or)
			if (oArr.length > 1) {
				oArr.forEach(o => {
					aArr = o.toUpperCase().split(this.joiner.and)
					if (aArr.length > 1) {
						aArr.forEach(a => this.CheckWhereClause(a))
					} else {
						this.CheckWhereClauseOperator(o)
					}
				})
			} else {
				this.CheckWhereClauseOperator(whereClause)
			}
		}
	}

	/**
	 * @description generate insert sql
	 * @param {Object} params an object includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
	 */
	GenerateInsertSQL(params = {}, tableName) {
		let cstr = ""
		let pstr = ""
		const paramsArray = Object.keys(params).filter(p => params[p] !== undefined)
		if (!paramsArray || paramsArray.length === 0) return null
		paramsArray.forEach((key, index) => {
			cstr = cstr.concat(`"${key}"`)
			pstr = pstr.concat(`$${index + 1}`)
			if (index !== paramsArray.length - 1) {
				cstr = cstr.concat(", ") // If not the last one, concat comma
				pstr = pstr.concat(", ") // If not the last one, concat comma
			}
		})
		const sql = `INSERT INTO ${tableName} (${cstr}) VALUES (${pstr}) RETURNING *`
		return { sql, replacements: paramsArray.map(p => params[p]), tableName }
	}

	/**
	 * @description generate multiple insert sql (to one table)
	 * @param {Array<string>} insertFields the fields which you want to insert
	 * @param {Array<Object>} params an array includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
	 */
	GenerateMultiInsertSQL(insertFields = [], params = [], tableName) {
		if (!insertFields || insertFields.length === 0)
			throw new Error("insertFields is incorrect")
		if (!params || params.length === 0)
			throw new Error("Can not generate a insert sql without data")
		let fstr = ""
		let pstr = ""
		const paramsArray = []
		let frequency = 1
		insertFields.forEach((field, index) => {
			fstr = fstr.concat(`"${field}"`)
			if (index !== insertFields.length - 1) {
				fstr = fstr.concat(", ") // If not the last one, concat comma
			}
		})
		params.forEach((p, index) => {
			let tmp = ""
			insertFields.forEach((field, i) => {
				tmp = tmp.concat(`$${frequency}`)
				frequency += 1
				if (i !== insertFields.length - 1) {
					tmp = tmp.concat(", ") // If not the last one, concat comma
				}
				paramsArray.push(p[field])
			})
			pstr = pstr.concat(`(${tmp})`)
			if (index !== params.length - 1) {
				pstr = pstr.concat(", ") // If not the last one, concat comma
			}
		})

		const sql = `INSERT INTO ${tableName} (${fstr}) VALUES ${pstr} RETURNING *`
		return { sql, replacements: paramsArray, tableName }
	}

	/**
	 * @description generate update sql
	 * @param {{params:object,tableName:string,whereClause:string,pkName:string,autoSetTimeFields:Array<string>}} args
	 * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
	 */
	GenerateUpdateSQL(args) {
		const {
			params = {},
			tableName,
			whereClause,
			pkName = "id",
			autoSetTimeFields
		} = args
		const pkArr = String(pkName).split(",")
		const paramsArray = Object.keys(params).filter(
			p => pkArr.includes(p) || params[p] !== undefined
		)
		if (!paramsArray || paramsArray.length === 0) return null
		let where = "WHERE 1 = 1"
		if (whereClause) {
			this.CheckWhereClause(whereClause)
			where = where.concat(` AND ${whereClause}`)
		} else {
			pkArr.forEach(p => {
				where = where.concat(` AND "${p}" = '${params[p] || null}'`)
			})
		}
		let setSql = ""
		paramsArray.forEach((key, index) => {
			setSql = setSql.concat(`"${key}" = $${index + 1}`)
			if (index !== paramsArray.length - 1) {
				setSql = setSql.concat(", ") // If not the last one, concat comma
			}
		})
		if (autoSetTimeFields) {
			autoSetTimeFields.forEach(f => {
				setSql = setSql.concat(`, "${f}" = CURRENT_TIMESTAMP`)
			})
		}
		const sql = `UPDATE ${tableName} SET ${setSql} ${where} RETURNING *`
		return { sql, replacements: paramsArray.map(p => params[p]), tableName }
	}

	// /**
	//  * @description generate multiple update sql (DONT USE IT UNLESS ALL FIELDS ARE STRING)
	//  * @param {Array<string>} updateFields the fields which you want to update
	//  * @param {Array<Object>} params an array includes the fields and values you want to update
	//  * @param {string} tableName the name of table
	//  * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
	//  */
	// GenerateMultiUpdateSQL(
	//   updateFields = [],
	//   params = [],
	//   tableName,
	//   pkName = 'id'
	// ) {
	//   if (!updateFields || updateFields.length === 0)
	//     throw new Error('updateFields is incorrect')
	//   if (!params || params.length === 0)
	//     throw new Error('Can not generate a update sql without data')
	//   let fstr = ''
	//   let cstr = ''
	//   let pstr = ''
	//   const paramsArray = []
	//   let frequency = 1
	//   const pkArr = String(pkName).split(',')
	//   updateFields.forEach((field, index) => {
	//     cstr = cstr.concat(`"${field}"`)
	//     if (typeof params[0][field] === 'number')
	//       fstr = fstr.concat(`"${field}" = CAST(tmp."${field}" AS INTEGER)`)
	//     else fstr = fstr.concat(`"${field}" = tmp."${field}"`)
	//     if (index !== updateFields.length - 1) {
	//       cstr = cstr.concat(', ') // If not the last one, concat comma
	//       fstr = fstr.concat(', ') // If not the last one, concat comma
	//     }
	//   })
	//   pkArr.forEach(p => {
	//     cstr = cstr.concat(`, "${p}"`)
	//   })
	//   if (this.CheckTableColumnExist(tableName, 'updatedAt')) {
	//     // if dbtable includes 'updatedAt', update it
	//     fstr = fstr.concat(', "updatedAt" = CURRENT_TIMESTAMP')
	//   }
	//   params.forEach((p, index) => {
	//     let tmp = ''
	//     pkArr = pkArr.map(pk => {
	//       pk = `"${pk}"`
	//     })
	//     const updateFieldsTmp = [...updateFields, pkArr.join(',')]
	//     updateFieldsTmp.forEach((field, i) => {
	//       tmp = tmp.concat(`$${frequency}`)
	//       frequency += 1
	//       if (i !== updateFieldsTmp.length - 1) {
	//         tmp = tmp.concat(', ') // If not the last one, concat comma
	//       }
	//       paramsArray.push(p[field])
	//     })
	//     pstr = pstr.concat(`(${tmp})`)
	//     if (index !== params.length - 1) {
	//       pstr = pstr.concat(', ') // If not the last one, concat comma
	//     }
	//   })
	//   let whereClause = ''
	//   pkArr.forEach((p, i) => {
	//     whereClause = whereClause.concat(`tmp."${p}" = "${tableName}"."${p}"`)
	//     if (i !== pkArr.length - 1) {
	//       whereClause = whereClause.concat(' AND ') // If not the last one, concat comma
	//     }
	//   })
	//   const sql = `UPDATE ${tableName} SET ${fstr} FROM (VALUES ${pstr})
	//   AS tmp(${cstr}) WHERE ${whereClause} RETURNING *;`
	//   return { sql, paramsArray }
	// }

	/**
	 * @description An execute inserting helper function
	 * @param {Object} params an object includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @returns {Object} the response from postgres
	 */
	async InsertExecutor(params, tableName) {
		const sql = this.GenerateInsertSQL(params, tableName)
		const res = await this.Transaction({
			params: [sql]
		})
		return res[0]
	}

	/**
	 * @description An execute inserting helper function
	 * @param {Array<string>} insertFields the fields which you want to insert
	 * @param {Array<Object>} params an array includes the fields and values you want to insert
	 * @param {string} tableName the name of table
	 * @returns {object} the responses from postgres
	 */
	async MultiInsertToOneTableExecutor(insertFields, params, tableName) {
		const sql = this.GenerateMultiInsertSQL(insertFields, params, tableName)
		const res = await this.Transaction({
			params: [sql]
		})
		return res[0]
	}

	/**
	 * @description An execute inserting helper function
	 * @param {Array<{params: Object, tableName: string}>} items
	 * @returns {Array} the responses from postgres
	 */
	async MultiInsertExecutor(items) {
		const sqls = []
		items.forEach(item => {
			const { params, tableName } = item
			const sql = this.GenerateInsertSQL(params, tableName)
			sqls.push(sql)
		})
		const res = await this.Transaction({
			params: sqls
		})
		return res
	}

	/**
	 * @description An execute updating helper function, update by primary key
	 * @param {Object} params an object includes the fields and values you want to update, must includes primary key and its value
	 * @param {string} tableName the name of table
	 * @param {string} pkName the name of primary key, default 'id'
	 * @returns {Object} the response from postgres
	 */
	async UpdateByPkExecutor(params, tableName, pkName = "id") {
		const sql = this.GenerateUpdateSQL({
			params,
			tableName,
			pkName
		})
		const res = await this.Transaction({ params: [sql] })
		return res[0]
	}

	/**
	 * @description An execute updating helper function, custom conditions
	 * @param {Object} params an object includes the fields and values you want to update, must includes primary key and its value
	 * @param {string} tableName the name of table
	 * @param {string} whereClause e.g. "employeeId" = '123'
	 * @returns {Object} the response from postgres
	 */
	async UpdateExecutor(params, tableName, whereClause) {
		const sql = this.GenerateUpdateSQL({
			params,
			tableName,
			whereClause
		})
		const res = await this.Transaction({ params: [sql] })
		return res[0]
	}

	/**
	 * @description An execute updating helper function, custom conditions
	 * @param {Array<{params: Object, tableName: string, whereClause: string, pkName: string}>} items
	 * @returns {Array<object>} the response from postgres
	 */
	async MultiUpdateExecutor(items) {
		const sqls = []
		items.forEach(item => {
			const { params, tableName, whereClause, pkName, autoSetTimeFields } = item
			const sql = this.GenerateUpdateSQL({
				params,
				tableName,
				whereClause,
				pkName,
				autoSetTimeFields
			})
			sqls.push(sql)
		})
		const res = await this.Transaction({ params: sqls })
		return res
	}

	// /**
	//  * @description An execute updating helper function (DONT USE IT UNLESS ALL FIELDS ARE STRING)
	//  * @param {Array<string>} updateFields the fields which you want to update
	//  * @param {Array<Object>} params an array includes the fields and values you want to update
	//  * @param {string} tableName the name of table
	//  * @param {string} pkName the name of primary key, default 'id'
	//  * @returns {object} the responses from postgres
	//  */
	// async MultiUpdateInOneTableExecutor(updateFields, params, tableName, pkName) {
	//   console.log(updateFields, params)
	//   const { sql, paramsArray } = this.GenerateMultiUpdateSQL(
	//     updateFields,
	//     params,
	//     tableName,
	//     pkName
	//   )
	//   console.log(sql, paramsArray)
	//   const res = await this.Transaction([sql], [paramsArray])
	//   return res[0]
	// }

	/**
	 * @description An execute deleting helper function
	 * @param {string} tableName the name of table
	 * @param {string} whereClause e.g. "employeeId" = '123'
	 * @returns {Object} the response from postgres
	 */
	async DeleteExecutor(tableName, whereClause) {
		let sql = `DELETE FROM ${tableName}`
		if (whereClause) {
			this.CheckWhereClause(whereClause)
			sql = sql.concat(` WHERE ${whereClause}`)
		}
		sql = sql.concat(` RETURNING *`)
		const res = await this.Transaction({ params: [{ sql, tableName }] })
		return res[0]
	}

	/**
	 * @description An execute querying helper function for one table
	 * @param {tableName:string,whereClause:string,selectFields:string,sortBy:string,limit:number,offset:number} args
	 * @returns {Object} the response from postgres
	 */
	async SingleQueryExecutor(args) {
		const {
			tableName,
			whereClause,
			selectFields = "*",
			sortBy,
			limit,
			offset
		} = args
		let sql = `SELECT ${selectFields} FROM ${tableName}`
		if (whereClause) {
			this.CheckWhereClause(whereClause)
			sql = sql.concat(` WHERE ${whereClause}`)
		}
		if (sortBy) {
			sql = sql.concat(` ORDER BY "${sortBy}"`)
		}
		if (limit) {
			sql = sql.concat(` LIMIT ${limit}`)
		}
		if (offset) {
			sql = sql.concat(` OFFSET ${offset}`)
		}
		const res = await this.Transaction({ params: [{ sql, tableName }] })
		return res[0]
	}
}

module.exports = { DataAccess }
module.exports.DataAccess = DataAccess
module.exports.default = DataAccess
