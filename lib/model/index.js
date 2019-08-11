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
     * @param {Object} params an object includes the fields and values
     * @param {string} tableName the name of table
     * @param {string} [pkName] the name of primary key, default 'id'
     */
    constructor(args) {
      const { params, tableName, pkName = 'id', enumMapping } = args
      /**
       * @member
       * @description the request via graphql
       */
      this.params = params
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
       * @description the instance of PgDataAccess
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
        return res.rows
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
        return res.rows[0]
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
        return res.rows
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description insert one row
     */
    async insertOne() {
      try {
        const res = await this.dataAccess.InsertExecutor(
          this.params,
          this.tableName
        )
        return res.rows[0]
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description update by primary key, but the primary key should be included in the params
     */
    async updateByPk() {
      try {
        const res = await this.dataAccess.UpdateByPkExecutor(
          this.params,
          this.tableName
        )
        return res.rows[0]
      } catch (e) {
        throw e
      }
    }

    /**
     * @method
     * @description update by where conditions
     * @param {string} whereClause e.g. "employeeId" = '123'
     */
    async updateByConditions(whereClause) {
      try {
        const res = await this.dataAccess.UpdateExecutor(
          this.params,
          this.tableName,
          whereClause
        )
        return res
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
        return res.rows[0]
      } catch (e) {
        throw e
      }
    }
  }

module.exports = { ModelImpl }
module.exports.ModelImpl = ModelImpl
module.exports.default = ModelImpl
