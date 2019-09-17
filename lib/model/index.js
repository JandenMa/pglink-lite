const { DataAccess } = require('../core/dataAccess')

const ModelImpl = connection =>
  /**
   * @class
   * @description A base class for other classes to operate CRUD
   * @author Janden Ma
   */
  class ModelBase {
    /**
     * @constructor
     * @description A base class for other classes to operate CRUD
     * @param {string} tableName the name of table
     * @param {string} [pkName] the name of primary key, default 'id'
     * @param {Object} [enumMapping] to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}}
     */
    constructor(args) {
      const { tableName, pkName = 'id', enumMapping } = args
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
       * @description the database operator
       */
      this.dataAccess = new DataAccess(connection)
    }

    /**
     * @method
     * @description query without conditions for one table
     */
    async findAll() {
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
     * @method
     * @description query by primary key for one table
     * @param {string|number} pk primary key value
     * @param {string} selectFields which columns you want to query, default '*'
     */
    async findByPk(pk, selectFields = '*') {
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
    async findByConditions(whereClause, selectFields = '*') {
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
    async insertOne(params) {
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
    async updateByPk(params, autoSetTimeFields = []) {
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

    /**
     * @method
     * @description update by where conditions
     * @param {Object} params an object includes the fields and values
     * @param {string} whereClause e.g. "employeeId" = '123'
     * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
     */
    async updateByConditions(params, whereClause, autoSetTimeFields = []) {
      try {
        const res = await this.dataAccess.UpdateExecutor(
          this.encodeFromEnum(params),
          this.tableName,
          whereClause,
          autoSetTimeFields // v0.1.7 support set autoSetTimeFields in update
        )
        return this.decodeToEnum(res)
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description multiple insert
     * @param {Array<object>} items the array of data to be inserted into table
     */
    async multiInsert(items) {
      try {
        const datas = []
        items.forEach(item => {
          datas.push({
            params: this.encodeFromEnum(item),
            tableName: this.tableName
          })
        })
        const res = await this.dataAccess.MultiInsertExecutor(datas)
        return this.decodeToEnum(res)
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description multiple update by where conditions
     * @param {Array<object>} items the array of data to be updated into table
     * @param {string} whereClause e.g. "'companyId' = $1"
     * @param {Array<string>} replacementFields e.g ['companyId']
     * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in items, e.g ['updatedAt']
     */
    async multiUpdateWithConditions(
      items,
      whereClause = null,
      replacementFields,
      autoSetTimeFields = [] // v0.1.7 support set autoSetTimeFields in multi update
    ) {
      try {
        const datas = []
        items.forEach(item => {
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
        const res = await this.dataAccess.MultiUpdateExecutor(datas)
        return this.decodeToEnum(res)
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description delete by where conditions
     * @param {string} whereClause e.g. "employeeId" = '123'
     */
    async deleteByConditions(whereClause) {
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
    encodeFromEnum(args) {
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
    decodeToEnum(args) {
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
