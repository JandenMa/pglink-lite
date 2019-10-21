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
		constructor(data) {
			/**
			 * @member
			 * @description that properties of the object that you want to save/update in the database
			 */
			this.data = data

			/**
			 * @member
			 * @description the database operator
			 */
			this.dataAccess = new DataAccess(connection)
		}

		static setConfig({
			tableName,
			pkName = 'id',
			enumMapping,
			autoSetTimeFields = globalAutoSetTimeFields // v0.1.8 for whole model to use
		}) {
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
				const data = this.decodeToEnum(res.rows)

				await Promise.all(
					data.map(async d => {
						this.authorize('read', d)
					})
				)

				return data
			} catch (e) {
				throw e
			}
		}

		/**
		 *@method
		 *@description set the authorization strategy to use before each database transaction
		 *@param {Object} strategy authorization functions to run before each database transaction, may contain "insert", "update", "read", or "delete" keys
		 */
		static setAuthorizationStrategy(
			strategy = {
				insert: () => {
					return true
				},
				update: () => {
					return true
				},
				read: () => {
					return true
				},
				delete: () => {
					return true
				}
			}
		) {
			this.authorizationStrategy = strategy
		}

		/**
		 * @method
		 * @description checks that the user is authorized to perform the given database query
		 * @param {string} authType the the type of authorization to use, i.e. 'insert', 'update', 'read', 'delete
		 * @param {object} data (optional) used to perform authorization on non-instance data
		 */
		static authorize(authType, data) {
			if (!this.authorizationStrategy) return true

			const auth = this.authorizationStrategy[authType]

			if (!authType || !auth)
				throw new Error(
					`authorization type ${authType} does not exist in the provided strategy`
				)

			switch (this.authorizationStrategy(data || this.data)) {
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
				const data = this.decodeToEnum(res.rows[0])

				await this.authorize('read', data)

				return data
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
				const data = this.decodeToEnum(res.rows)

				await Promise.all(
					data.map(async d => {
						this.authorize('read', d)
					})
				)

				return data
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

		// ------------------------------------------------------------------------------------------- TODO: These all need to implement the callback logic. Good problem for a Monday!!!!! Might be a good idea to put the config inside a class variable instead so that the user doesn't have to input the same config for each instance

		/**
		 * @method
		 * @description save object to the database
		 * @param {string} authType can be used to force a type of authorization strategy/transaction. Typically 'insert' or 'update'
		 */
		async save(authType) {
			try {
				const auth = authType || this.data[this.pkName] ? 'update' : 'insert'

				await this.authorize(auth)

				switch (auth) {
					case 'insert':
						this.data = await this.insertOne(this.data)
						break
					case 'update':
						this.data = await this.updateByPk(this.data)
						break
					default:
						throw new Error(`Invalid auth type: ${auth}`)
						break
				}

				return this.data
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description used to save multiple objects to the database in a single transaction, will fail if any object is invalid
		 * @param {Array<object>} peersArray Array of objects to be saved
		 * @param {Array<string>} authTypes (Optional) Array of strings describing the type of authorization to use and type of transaction to perform, 'insert' or 'update'
		 */
		async saveWithPeers(peersArray, authTypes) {
			try {
				peersArray.push(this)

				const params = await Promise.all(
					peersArray.map(async (peer, index) => {
						const authType =
							(authTypes && authType[index]) || peer.data[peer.pkName]
								? 'update'
								: 'insert'

						await peer.authorize(authType)

						return {
							data: peer.encodeFromEnum(peer.data),
							tableName: peer.tableName,
							pkName: peer.pkName,
							autoSetTimeFields
						}
					})
				)

				const res = await this.dataAccess.multiInsertOrUpdateExecutor(params)

				const updatedPeers = peersArray.map((peer, index) => {
					const data = peer.decodeToEnum(res[index])

					peer.data = data
				})

				return updatedPeers
			} catch (e) {
				throw e
			}
		}

		/**
		 * @method
		 * @description delete object from the database
		 */
		async delete() {
			try {
				await this.authorize('delete')

				const whereStatement = `"${this.pkName}" = '${this.data[this.pkName]}'`

				this.data = await this.deleteByConditions(whereStatement)
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
	}

module.exports = { ModelImpl }
module.exports.ModelImpl = ModelImpl
module.exports.default = ModelImpl
