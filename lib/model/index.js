/*
  Refactor Goals

  - instance of model can take the data for the object
    - This is probably best achieved by separating config settings and data
  - Use data stored in the instance itself for updates, deletes, etc.
  - Add authorizeStrategy property: func that is run after READ and before WRITE, return self if true, throw error if false
  - Convert transaction methods to static, add instance methods that run them (after authorizing).
  -- Mapping parameter types could be a bit of an issue. For now will probably just have to put the onus on the user to provide the right types
  - Figure out the best way to do error handling. If a transaction fails, how do I best tell that to the user?
  - instance methods (like save) should probably all return this.data, otherwise things could get dicey trying to return the whole instance
  - Transaction is the least secure thing ever. Need to figure out how to give it instance method calls so that authorization can happen at each step, but the transactions aren't committed if one fails.
  - Consider adding the "transaction" logic to all transaction methods such that if a callback is provided, it will be run before committing the transaction
    - This might be achievable by passing the dataAccess.client.query parameters to the callback so that the final callback must execute all queries before committing
    - Can also consider doing an options hash with success callback
    - At the end of the day, there has to be a mechanism that allows multiple single operations to be called in succession, rolling back if any one of them fails. How this is achieved doesn't really matter.
  - Should also take this opportunity to ensure that all returns are standardized to an object or array of objects
  */

const { DataAccess } = require('../core/dataAccess')

const ModelImpl = (connection, globalAutoSetTimeFields) =>
	/**
	 * @class
	 * @description A base class for other classes to operate CRUD
	 * @author Janden Ma
	 */
	class ModelBase {
		/**
		 * @constructor
		 * @description A base class for other classes to operate CRUD
		 * @param {{{data?: object,config: {tableName: string, pkName?: string, enumMapping?: object, autoSetTimeFields?: Array<string>}}} args
		 */
		constructor({ data, config }) {
			const {
				tableName,
				pkName = 'id',
				enumMapping,
				autoSetTimeFields = globalAutoSetTimeFields // v0.1.8 for whole model to use
			} = config

			/**
			 * @member
			 * @description that properties of the object that you want to save/update in the database
			 */
			this.data = data
			/**
			 * @member
			 * @description the name of table which you want to operate
			 */
			this.tableName = tableName
			/**
			 * @member
			 * @description the name of primary key
			 */
			this.pkName = pkName
			/**
			 * @member
			 * @description the mapping for enum
			 */
			this.enumMapping = enumMapping
			/**
			 * @member
			 * @description array of column names that should be automatically updated with a current timestamp
			 */
			this.autoSetTimeFields = autoSetTimeFields
			/**
			 * @member
			 * @description the database operator
			 */
			this.dataAccess = new DataAccess(connection)
		}

		/**
		 * @method
		 * @description query without conditions for one table
		 */
		static async findAll() {
			try {
				const res = await this.dataAccess.SingleQueryExecutor({
					tableName: this.tableName
				})
				return this.decodeToEnum(res.rows)
			} catch (e) {
				throw e
			}
		}

		/**
		 *@method
		 *@description set the authorization strategy to use before each database transaction
		 *@param {function} strategy authorization function to run before each database transaction
		 */
		static setAuthorizationStrategy(strategy) {
			this.authorizationStrategy = strategy
		}

		/**
		 * @method
		 * @description checks that the user is authorized to perform the given database query
		 */
		static authorize() {
			if (!this.authorizationStrategy) return true

			switch (this.authorizationStrategy(this.data)) {
				case true:
					return true
					break
				case false:
					throw new Error('authorization failed')
					break
				default:
					throw new Error('authorization strategy must return true or false')
			}
		}

		/**
		 * @method
		 * @description query by primary key for one table
		 * @param {string|number} pk primary key value
		 * @param {string} selectFields which columns you want to query, default '*'
		 */
		static async findByPk(pk, selectFields = '*') {
			try {
				const res = await this.dataAccess.SingleQueryExecutor({
					tableName: this.tableName,
					whereClause: `"${this.pkName}" = '${pk}'`,
					selectFields
				})
				return this.decodeToEnum(res.rows[0])
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description query with conditions for one table
		 * @param {string} whereClause e.g. "employeeId" = '123'
		 * @param {string} selectFields which columns you want to query, default '*'
		 */
		static async findByConditions(whereClause, selectFields = '*') {
			try {
				const res = await this.dataAccess.SingleQueryExecutor({
					tableName: this.tableName,
					whereClause,
					selectFields
				})
				return this.decodeToEnum(res.rows)
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description insert one row
		 * @param {Object} params an object includes the fields and values
		 */
		static async insertOne(params) {
			try {
				const res = await this.dataAccess.InsertExecutor(
					this.encodeFromEnum(params),
					this.tableName
				)
				return this.decodeToEnum(res.rows[0])
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description update by primary key, but the primary key should be included in the params
		 * @param {Object} params an object includes the fields and values
		 * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
		 */
		static async updateByPk(
			params,
			autoSetTimeFields = this.autoSetTimeFields
		) {
			try {
				const res = await this.dataAccess.UpdateByPkExecutor(
					this.encodeFromEnum(params),
					this.tableName,
					this.pkName,
					autoSetTimeFields // v0.1.7 support set autoSetTimeFields in update
				)
				return this.decodeToEnum(res.rows[0])
			} catch (e) {
				throw e
			}
		}

		// TODO: Determine if this and other byConditions methods can actually be deleted. Should be able to since we can just use this.data[this.pk] to update the correct one
		// /**
		//  * @method
		//  * @description update by where conditions
		//  * @param {Object} params an object includes the fields and values
		//  * @param {string} whereClause e.g. "employeeId" = '123'
		//  * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
		//  */
		// async updateByConditions(
		//   params,
		//   whereClause,
		//   autoSetTimeFields = this.autoSetTimeFields
		// ) {
		//   try {
		//     const res = await this.dataAccess.UpdateExecutor(
		//       this.encodeFromEnum(params),
		//       this.tableName,
		//       whereClause,
		//       autoSetTimeFields // v0.1.7 support set autoSetTimeFields in update
		//     )
		//     return this.decodeToEnum(res)
		//   } catch (e) {
		//     throw e
		//   }
		// }

		// TODO: Not sure if this is going to be necessary or not. My instinct says no, but don't want to delete just yet
		// /**
		//  * @method
		//  * @description multiple insert
		//  * @param {Array<object>} items the array of data to be inserted into table
		//  */
		// async multiInsert(items) {
		//   try {
		//     const datas = []
		//     items.forEach(item => {
		//       datas.push({
		//         params: this.encodeFromEnum(item),
		//         tableName: this.tableName
		//       })
		//     })
		//     const res = await this.dataAccess.MultiInsertExecutor(datas)
		//     return this.decodeToEnum(res)
		//   } catch (e) {
		//     throw e
		//   }
		// }

		// /**
		//  * @method
		//  * @description multiple update by where conditions
		//  * @param {Array<object>} items the array of data to be updated into table
		//  * @param {string} whereClause e.g. "'companyId' = $1"
		//  * @param {Array<string>} replacementFields e.g ['companyId']
		//  * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in items, e.g ['updatedAt']
		//  */
		// async multiUpdateWithConditions(
		//   items,
		//   whereClause = null,
		//   replacementFields,
		//   autoSetTimeFields = this.autoSetTimeFields // v0.1.7 support set autoSetTimeFields in multi update
		// ) {
		//   try {
		//     const datas = []
		//     items.forEach(item => {
		//       let where = whereClause
		//       if (
		//         whereClause &&
		//         replacementFields &&
		//         replacementFields.length > 0
		//       ) {
		//         replacementFields.forEach((r, i) => {
		//           where = where.replace(`$${i}`, `${item[r]}`) // v0.1.7 bug fixes
		//         })
		//       }
		//       datas.push({
		//         params: this.encodeFromEnum(item),
		//         tableName: this.tableName,
		//         whereClause: where,
		//         pkName: this.pkName,
		//         autoSetTimeFields
		//       })
		//     })
		//     const res = await this.dataAccess.MultiUpdateExecutor(datas)
		//     return this.decodeToEnum(res)
		//   } catch (e) {
		//     throw e
		//   }
		// }

		/**
		 * @method
		 * @description delete by where conditions
		 * @param {string} whereClause e.g. "employeeId" = '123'
		 */
		static async deleteByConditions(whereClause) {
			try {
				const res = await this.dataAccess.DeleteExecutor(
					this.tableName,
					whereClause
				)
				return this.decodeToEnum(res.rows[0])
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description to encode value from enum to integer
		 * @param {Array|Object} args the input request
		 */
		static encodeFromEnum(args) {
			if (!this.enumMapping) return args
			const format = arg => {
				const argTmp = arg
				Object.keys(argTmp).forEach(key => {
					if (this.enumMapping[key]) {
						const enumItem = this.enumMapping[key]
						Object.keys(enumItem).every(k => {
							if (k === argTmp[key]) {
								argTmp[key] = enumItem[k]
								return false
							}
							return true
						})
					}
					argTmp[key] = this.encodeFromEnum(argTmp[key])
				})
				return argTmp
			}
			if (args && typeof args === 'object') {
				// for array
				if (Object.prototype.hasOwnProperty.call(args, 'length')) {
					return args.map(arg => {
						if (arg && typeof arg === 'object') return format(arg)
						return arg
					})
				}
				// for object
				return format(args)
			}
			return args
		}

		/**
		 * @method
		 * @description to decaode value from integer to enum
		 * @param {Array|Object} args the output response
		 */
		static decodeToEnum(args) {
			if (!this.enumMapping) return args
			const format = arg => {
				const argTmp = arg
				Object.keys(argTmp).forEach(key => {
					if (this.enumMapping[key]) {
						const enumItem = this.enumMapping[key]
						Object.keys(enumItem).every(k => {
							if (enumItem[k] === argTmp[key]) {
								argTmp[key] = k
								return false
							}
							return true
						})
					}
					argTmp[key] = this.decodeToEnum(argTmp[key])
				})
				return argTmp
			}
			if (args && typeof args === 'object') {
				// for array
				if (Object.prototype.hasOwnProperty.call(args, 'length')) {
					return args.map(arg => {
						if (arg && typeof arg === 'object') return format(arg)
						return arg
					})
				}
				// for object
				return format(args)
			}
			return args
		}

		// ------------------------------------------------------------------------------------------- TODO: These all need to implement the callback logic. Good problem for a Monday!!!!!

		async update() {
			try {
				this.authorize()

				this.data = this.updateByPk(this.data)

				return this.data
			} catch (e) {
				throw e
			}
		}

		insert() {
			try {
				this.authorize()

				this.data = this.insertOne(this.data)

				return this.data
			} catch (e) {
				throw e
			}
		}

		delete() {
			try {
				this.authorize()

				const whereStatement = `"${this.pkName}" = '${this.data[this.pkName]}'`
				this.data = this.deleteByConditions(whereStatement)

				this.data = this.deleteByConditions()
			} catch (e) {
				throw e
			}
		}
	}

module.exports = { ModelImpl }
module.exports.ModelImpl = ModelImpl
module.exports.default = ModelImpl
