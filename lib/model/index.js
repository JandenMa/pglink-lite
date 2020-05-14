const ModelImpl = (dataAccess, globalAutoSetTimeFields) =>
  /**
   * @class
   * @description A base class for other classes to operate CRUD
   * @author Janden Ma
   */
  class ModelBase {
    /**
     * @constructor
     * @description A base class for other classes to operate CRUD
     * @param {{tableName: string, pkName?: string, enumMapping?: object, autoSetTimeFields?: Array<string>}} args
     */
    constructor(args) {
      const {
        tableName,
        pkName = 'id',
        enumMapping,
        autoSetTimeFields = globalAutoSetTimeFields // v0.1.8 for whole model to use
      } = args
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
      this.dataAccess = dataAccess
    }

    /**
     * @method
     * @param {object} object
     * @param {object} object.options may contain fields such as sortBy, offset, or limit
     * @param {Array<{ field: String; sequence?: 'ASC' | 'DESC' }>} options.sortBy an sql string to sort the results of the query
     * @param {string} options.limit as sql string to limit the results of the queiry
     * @param {offset} options.offset an sql string to offset the results of the query
     * @param {function} callback Function to be run before comitting the database operation
     * @description query without conditions for one table
     */
    async findAll({ options = {}, callback, client }) {
      try {
        const res = await this.dataAccess.SingleQueryExecutor({
          tableName: this.tableName,
          ...options,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description query by primary key for one table
     * @param {object} object
     * @param {string|number} object.pk primary key value
     * @param {string} object.selectFields which columns you want to query, default '*'
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async findByPk({ pk, selectFields = '*', callback, client }) {
      try {
        let whereClause = '1 = 1'
        const pks = this.pkName.split(',')
        if (pks.length > 1) {
          if (pk.constructor === Object && Object.keys(pk).length > 0) {
            pks.forEach((p) => {
              whereClause = whereClause.concat(` AND "${p}" = '${pk[p]}'`)
            })
          } else {
            throw new Error(
              `Invalid parameter "pk": It is multi primary keys in ${this.tableName} table`
            )
          }
        } else {
          whereClause = `"${this.pkName}" = '${pk}'`
        }
        const res = await this.dataAccess.SingleQueryExecutor({
          tableName: this.tableName,
          whereClause,
          selectFields,
          callback,
          returnSingleRecord: true,
          client
        })
        return res ? this.decodeToEnum(res) : {}
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description query with conditions for one table
     * @param {object} object
     * @param {string} object.whereClause e.g. "employeeId" = '123'
     * @param {string} object.selectFields which columns you want to query, default '*'
     * @param {object} object.options may contain fields such as sortBy, offset, or limit
     * @param {function} object.callback Function to be run before comitting the database operation
     * @param {Array<{ field: String; sequence?: 'ASC' | 'DESC' }>} options.sortBy an sql string to sort the results of the query
     * @param {string} options.limit as sql string to limit the results of the queiry
     * @param {offset} options.offset an sql string to offset the results of the query
     */
    async findByConditions({
      whereClause,
      selectFields = '*',
      options = {},
      callback,
      client
    }) {
      try {
        const res = await this.dataAccess.SingleQueryExecutor({
          tableName: this.tableName,
          whereClause,
          selectFields,
          ...options,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description insert one row
     * @param {Object} object
     * @param {Object} object.params an object includes the fields and values
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async insertOne({ params, callback, client }) {
      try {
        const res = await this.dataAccess.InsertExecutor({
          params: this.encodeFromEnum(params),
          tableName: this.tableName,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : {}
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description update by primary key, but the primary key should be included in the params
     * @param {Object} object
     * @param {Object} object.params an object includes the fields and values
     * @param {Array<string>} object.autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async updateByPk({
      params,
      autoSetTimeFields = this.autoSetTimeFields,
      callback,
      client
    }) {
      try {
        const res = await this.dataAccess.UpdateByPkExecutor({
          params: this.encodeFromEnum(params),
          tableName: this.tableName,
          pkName: this.pkName,
          autoSetTimeFields, // v0.1.7 support set autoSetTimeFields in update
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : {}
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description update by where conditions
     * @param {Object} object
     * @param {Object} object.params an object includes the fields and values
     * @param {string} object.whereClause e.g. "employeeId" = '123'
     * @param {Array<string>} object.autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async updateByConditions({
      params,
      whereClause,
      autoSetTimeFields = this.autoSetTimeFields,
      callback,
      client
    }) {
      try {
        const res = await this.dataAccess.UpdateExecutor({
          params: this.encodeFromEnum(params),
          tableName: this.tableName,
          whereClause,
          autoSetTimeFields, // v0.1.7 support set autoSetTimeFields in update
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description multiple insert
     * @param {Object} object
     * @param {Array<object>} object.items the array of data to be inserted into table
     * @param { bool } object.forceFlat force the results into a single array
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async multiInsert({ items, forceFlat, callback, client }) {
      try {
        const datas = []
        items.forEach((item) => {
          datas.push({
            params: this.encodeFromEnum(item),
            tableName: this.tableName
          })
        })
        const res = await this.dataAccess.MultiInsertExecutor({
          items: datas,
          forceFlat,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

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
     */
    async multiUpdateWithConditions({
      items,
      whereClause = null,
      replacementFields,
      autoSetTimeFields = this.autoSetTimeFields, // v0.1.7 support set autoSetTimeFields in multi update
      forceFlat,
      callback,
      client
    }) {
      try {
        const datas = []
        items.forEach((item) => {
          let where = whereClause
          if (
            whereClause &&
            replacementFields &&
            replacementFields.length > 0
          ) {
            replacementFields.forEach((r, i) => {
              where = where.replace(`$${i}`, `${item[r]}`) // v0.1.7 bug fixes
            })
          }
          datas.push({
            params: this.encodeFromEnum(item),
            tableName: this.tableName,
            whereClause: where,
            pkName: this.pkName,
            autoSetTimeFields
          })
        })
        const res = await this.dataAccess.MultiUpdateExecutor({
          items: datas,
          forceFlat,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description delete by where conditions
     * @param {object} object
     * @param {string} object.whereClause e.g. "employeeId" = '123'
     * @param {boolean} object.returnSingleRecord whether or not to only return one record
     * @param {function} object.callback Function to be run before comitting the database operation
     */
    async deleteByConditions({
      whereClause,
      returnSingleRecord,
      callback,
      client
    }) {
      try {
        const res = await this.dataAccess.DeleteExecutor({
          tableName: this.tableName,
          whereClause,
          returnSingleRecord,
          callback,
          client
        })
        return res ? this.decodeToEnum(res) : []
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description to encode value from enum to integer
     * @param {Array|Object} args the input request
     */
    encodeFromEnum(args) {
      if (!this.enumMapping) return args
      const format = (arg) => {
        const argTmp = arg
        Object.keys(argTmp).forEach((key) => {
          if (this.enumMapping[key]) {
            const enumItem = this.enumMapping[key]
            Object.keys(enumItem).every((k) => {
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
          return args.map((arg) => {
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
    decodeToEnum(args) {
      if (!this.enumMapping) return args
      const format = (arg) => {
        const argTmp = arg
        Object.keys(argTmp).forEach((key) => {
          if (this.enumMapping[key]) {
            const enumItem = this.enumMapping[key]
            Object.keys(enumItem).every((k) => {
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
          return args.map((arg) => {
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
