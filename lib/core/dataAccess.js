const { Pool } = require('pg')

/**
 * @class A helper class for pg
 * @description Standardize every output to be object or array of objects
 * Transaction returns array of outputs or object with outputs mapped to aliases
 * No null or undefined returns, must always be array or object even if empty
 */
class DataAccess {
  /**
   * @param {Pool} connection
   */
  constructor(connection) {
    console.info('Instantiate DataAccess!💪')
    this.conn = connection
    this.op = [
      '=',
      '>',
      '<',
      '<=',
      '>=',
      '!=',
      new RegExp('\\bIN\\b', 'mg'),
      new RegExp('\\bNOT IN\\b', 'mg'),
      new RegExp('\\bLIKE\\b', 'mg')
    ]
    this.joiner = { and: 'AND', or: 'OR' }
    this.between = new RegExp('\\bBETWEEN\\b')
    this.client = { instance: connection.connect(), count: 1 }
  }

  async initialClient() {
    const client = await this.client.instance
    if (!client) {
      const instance = this.conn.connect()
      this.client = { instance, count: 1 }
    } else {
      this.client.count += 1
    }
    return await this.client.instance
  }

  async releaseClient(e) {
    const client = await this.client.instance
    if (client) {
      if (e) {
        client.release(e)
        this.client = { instance: null, count: 0 }
      } else if (this.client.count <= 1) {
        this.client.instance.release()
        this.client = { instance: null, count: 0 }
      } else {
        this.client.count -= 1
      }
    }
  }

  /**
   * @description run a single query
   * @param {string} sql
   * @author Janden Ma
   */
  async Execute(sql) {
    if (!sql)
      throw new Error(
        '"sql" as an argument of Execute function is required but got undefined or null'
      )
    try {
      const res = await this.conn.query(sql)
      return res
    } catch (e) {
      throw e
    }
  }

  /**
   * @description drain the pool of all active clients, disconnect them,
   * and shut down any internal timers in the pool.
   * It is common to call this at the end of a script using the pool
   * or when your process is attempting to shut down cleanly.
   * @author Janden Ma
   */
  async Disconnect() {
    try {
      await this.conn.end()
      console.info('Pg pool has disconnected!')
    } catch (e) {
      console.error('Error during pg disconnection: ', e.stack)
    }
  }

  /**
   * @description Commit many sqls in one transaction, and will rollback all if exist one sql execute failed.
   * @param {{params: Array<{sql: string,replacements: Array<any>,alias: string, returnSingleRecord: bool, forceFlat:bool}>,returnWithAlias: boolean}} args includes sqls, their params and alias name.
   * @param {Function} transaction you can use nested transaction here, you will receive the response from outer transaction, and if inner transaction rollback, others would be rollback
   * @author Janden Ma
   */
  async Transaction(args, transaction) {
    if (!args)
      throw new Error('"args" for Transaction should not be undefined or null')
    const {
      params,
      returnWithAlias = false,
      returnSingleRecord = false,
      forceFlat = false
    } = args // v0.1.9
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    if (!params)
      // v0.1.8 add judgement to check if param is incorrect. by Janden
      throw new Error(
        '"params" is invalid: Expected "Array" but got "null" or "undefined"'
      )

    // v0.1.9 for some real world situations we shouldn't throw error here -- Janden
    if (params.length === 0) {
      console.warn('[Warning]: "params" is an empty array, skipped')
      return transaction ? transaction([]) : []
    }

    const client = await this.initialClient()
    const result = returnWithAlias ? {} : []

    try {
      await client.query('BEGIN')
      /* *************************************************************************  
        We can't use async/await in forEach/map loop, if we call await on 
        a non-promise, it will immediately resolve to the value (i.e. the array).  
        It causes we can't not catch the inner error stacks normally.
        Calling .map(...) returns an array, so we need to call Promise.all(...) 
        to await all of them.  -- By Janden Ma
      ************************************************************************** */
      await Promise.all(
        params.map(async p => {
          const { sql, replacements, alias } = p // v0.1.9 change 'tableName' to 'alias' --Janden
          if (returnWithAlias && !alias) {
            throw new Error(
              'alias should be string when returnWithAlias is true, but got undefined or null'
            )
          }
          const res =
            replacements && replacements.length > 0
              ? await client.query(sql, replacements)
              : await client.query(sql)
          if (returnWithAlias) {
            result[alias] = res.rows
          } else {
            result.push(res.rows)
          }
        })
      )

      let finalRes = result
      // Avoiding unnecessary arrays, providing object return for single record transaction
      if (finalRes instanceof Array) {
        if (params.length === 1 || forceFlat) finalRes = finalRes.flat() // Refactored to use the new Array.flat function

        if (returnSingleRecord) [finalRes] = finalRes
      }

      if (transaction) await transaction(finalRes)

      await client.query('COMMIT')
      // Transaction succeeded so retain connection in pool
      await this.releaseClient()
      // Return the work

      return finalRes
    } catch (err) {
      try {
        console.warn('TRANSACTION ROLLBACK: ', err)
        await client.query('ROLLBACK')
        await this.releaseClient()
      } catch (e) {
        console.warn('ROLLBACK ERROR: ', e)
        // Rollback failed so discard connection
        await this.releaseClient()
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
      const sql = `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}' LIMIT 1`
      const res = await this.Transaction({ params: [{ sql }] }) // v0.1.9 bug fixes
      return res.length > 0
    } catch (e) {
      throw e
    }
  }

  /**
   * @description check whether where clause includes illegal operator, e.g. ===
   * @param {string} whereClause
   * @param {bool} operatorRequired
   */
  CheckWhereClauseOperator(whereClause, operatorRequired = true) {
    // The conditions for legality are opposite depending on whether or not an operator is required/allowed in the statement.
    let illegal = operatorRequired
    this.op.every(p => {
      if (
        String(whereClause)
          .toUpperCase()
          .search(p) !== -1 &&
        String(whereClause)
          .toUpperCase()
          .split(p).length === 2
      ) {
        illegal = !operatorRequired
        return !operatorRequired
      }
      return operatorRequired
    })
    if (illegal) throw new Error('condition operator is illegal')
  }

  // Clean up the whereClause for parsing
  /**
   *
   * @param {string} whereClause the sql string to clean up
   */
  cleanWhereClause(whereClause) {
    const cleanedWhiteSpace = whereClause.replace(/\s+/gm, ' ')
    const trimmed = cleanedWhiteSpace.trim()
    const toUpper = trimmed.toUpperCase()

    return toUpper
  }

  /**
   * @description check whether where clause is illegal
   * @param {string} whereClause
   */
  CheckWhereClause(whereClause) {
    const cleanedWhereClause = this.cleanWhereClause(whereClause)
    const joinerString = `${Object.keys(this.joiner)
      .map(key => `\\b${this.joiner[key]}\\b`)
      .join('|')}`
    const joinerRegex = new RegExp(joinerString, 'gm')
    const statements = cleanedWhereClause.split(joinerRegex)

    // The old method of splitting up where clauses didn't work for 'between' because the right side of the AND statement in a between doesn't contain a comparison operator
    let operatorRequired = true
    let betweenSide = 0
    statements.forEach(statement => {
      // Because between statements do not have comparative operators. This will check that they don't include operators
      switch (betweenSide) {
        case 0:
          if (statement.search(this.between) !== -1) {
            operatorRequired = false
            betweenSide = 1
            this.CheckWhereClauseOperator(statement, operatorRequired)
            break
          }

          this.CheckWhereClauseOperator(statement, operatorRequired)
          break
        case 1:
          this.CheckWhereClauseOperator(statement, operatorRequired)
          operatorRequired = true
          betweenSide = 0
          break
        default:
          break
      }
    })
  }

  /**
   * @description generate insert sql
   * @param {Object} params an object includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
   */
  GenerateInsertSQL(params = {}, tableName) {
    let cstr = ''
    let pstr = ''
    const paramsArray = Object.keys(params).filter(p => params[p] !== undefined)
    if (!paramsArray || paramsArray.length === 0) return null
    paramsArray.forEach((key, index) => {
      cstr = cstr.concat(`"${key}"`)
      pstr = pstr.concat(`$${index + 1}`)
      if (index !== paramsArray.length - 1) {
        cstr = cstr.concat(', ') // If not the last one, concat comma
        pstr = pstr.concat(', ') // If not the last one, concat comma
      }
    })
    const sql = `INSERT INTO ${tableName} (${cstr}) VALUES (${pstr}) RETURNING *`
    return {
      sql,
      replacements: paramsArray.map(p => params[p]),
      alias: tableName
    }
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
      throw new Error('insertFields is incorrect')
    if (!params || params.length === 0)
      throw new Error('Can not generate a insert sql without data')
    let fstr = ''
    let pstr = ''
    const paramsArray = []
    let frequency = 1
    insertFields.forEach((field, index) => {
      fstr = fstr.concat(`"${field}"`)
      if (index !== insertFields.length - 1) {
        fstr = fstr.concat(', ') // If not the last one, concat comma
      }
    })
    params.forEach((p, index) => {
      let tmp = ''
      insertFields.forEach((field, i) => {
        tmp = tmp.concat(`$${frequency}`)
        frequency += 1
        if (i !== insertFields.length - 1) {
          tmp = tmp.concat(', ') // If not the last one, concat comma
        }
        paramsArray.push(p[field])
      })
      pstr = pstr.concat(`(${tmp})`)
      if (index !== params.length - 1) {
        pstr = pstr.concat(', ') // If not the last one, concat comma
      }
    })

    const sql = `INSERT INTO ${tableName} (${fstr}) VALUES ${pstr} RETURNING *`
    return { sql, replacements: paramsArray, alias: tableName }
  }

  /**
   * @description generate update sql
   * @param {{params:object,tableName:string,whereClause:string,pkName:string,autoSetTimeFields:Array<string>}} args
   * @returns {{sql:string,replacements:Array<any>,tableName:string}} an object includes sql and params
   */
  async GenerateUpdateSQL(args) {
    const {
      params = {},
      tableName,
      whereClause,
      pkName = 'id',
      autoSetTimeFields
    } = args
    const pkArr = String(pkName).split(',')
    const paramsArray = Object.keys(params).filter(
      p => pkArr.includes(p) || params[p] !== undefined
    )
    if (!paramsArray || paramsArray.length === 0) return null
    let where = 'WHERE 1 = 1'
    if (whereClause) {
      this.CheckWhereClause(whereClause)
      where = where.concat(` AND ${whereClause}`)
    } else {
      pkArr.forEach(p => {
        where = where.concat(` AND "${p}" = '${params[p] || null}'`)
      })
    }
    let setSql = ''
    paramsArray.forEach((key, index) => {
      setSql = setSql.concat(`"${key}" = $${index + 1}`)
      if (index !== paramsArray.length - 1) {
        setSql = setSql.concat(', ') // If not the last one, concat comma
      }
    })
    // #region v0.1.8 refactor logic by Janden
    if (autoSetTimeFields && autoSetTimeFields.length > 0) {
      await Promise.all(
        autoSetTimeFields.map(async f => {
          await this.CheckTableColumnExist(tableName, f).then(res => {
            // if dbtable includes autoSetTimeField, update it
            if (res) {
              setSql = setSql.concat(`, "${f}" = CURRENT_TIMESTAMP`)
            } else {
              console.warn(
                `!![AutoSetTimeFields Warning]: Table ${tableName} doesn't include field "${f}", skipped!!`
              )
            }
          })
        })
      )
    }
    // #endregion
    const sql = `UPDATE ${tableName} SET ${setSql} ${where} RETURNING *`
    return {
      sql,
      replacements: paramsArray.map(p => params[p]),
      alias: tableName
    }
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
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Object} the response from postgres
   */
  async InsertExecutor(params, tableName, callback) {
    const sql = this.GenerateInsertSQL(params, tableName)
    const res = await this.Transaction(
      { params: [sql], returnSingleRecord: true },
      callback
    )

    return res
  }

  /**
   * @description An execute inserting helper function
   * @param {Array<string>} insertFields the fields which you want to insert
   * @param {Array<Object>} params an array includes the fields and values you want to insert
   * @param {string} tableName the name of table
   * @param {function} callback function to be run before committing the database transaction
   * @returns {object} the responses from postgres
   */
  async MultiInsertToOneTableExecutor(
    insertFields,
    params,
    tableName,
    callback
  ) {
    const sql = this.GenerateMultiInsertSQL(insertFields, params, tableName)
    const res = await this.Transaction(
      { params: [sql], forceFlat: true },
      callback
    )
    return res
  }

  /**
   * @description An execute inserting helper function
   * @param {Array<{params: Object, tableName: string, forceFlat: boolean}>} items
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Array} the responses from postgres
   */
  async MultiInsertExecutor(items, forceFlat, callback) {
    const sqls = []
    items.forEach(item => {
      const { params, tableName } = item
      const sql = this.GenerateInsertSQL(params, tableName)
      sqls.push(sql)
    })
    const res = await this.Transaction(
      {
        params: sqls,
        forceFlat
      },
      callback
    )
    return res
  }

  /**
   * @description An execute updating helper function, update by primary key
   * @param {Object} params an object includes the fields and values you want to update, must includes primary key and its value
   * @param {string} tableName the name of table
   * @param {string} pkName the name of primary key, default 'id'
   * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Object} the response from postgres
   */
  async UpdateByPkExecutor(
    params,
    tableName,
    pkName = 'id',
    autoSetTimeFields, // v0.1.7 support set autoSetTimeFields in update
    callback
  ) {
    const sql = await this.GenerateUpdateSQL({
      params,
      tableName,
      pkName,
      autoSetTimeFields
    })
    const res = await this.Transaction(
      { params: [sql], returnSingleRecord: true },
      callback
    )
    return res
  }

  /**
   * @description An execute updating helper function, custom conditions
   * @param {Object} params an object includes the fields and values you want to update, must includes primary key and its value
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {Array<string>} autoSetTimeFields Those fields need to set time automatically, should be included in params, e.g ['updatedAt']
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Object} the response from postgres
   */
  async UpdateExecutor(
    params,
    tableName,
    whereClause,
    autoSetTimeFields,
    callback
  ) {
    const sql = await this.GenerateUpdateSQL({
      params,
      tableName,
      whereClause,
      autoSetTimeFields // v0.1.7 support set autoSetTimeFields in update
    })
    const res = await this.Transaction({ params: [sql] }, callback)
    return res
  }

  /**
   * @description An execute updating helper function, custom conditions
   * @param {Array<{params: Object, tableName: string, whereClause: string, pkName: string, autoSetTimeFields: Array<string>}>} items
   * @param {boolean} forceFlat whether or not to force results into a single array
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Array<object>} the response from postgres
   */
  async MultiUpdateExecutor(items, forceFlat, callback) {
    const sqls = []
    await Promise.all(
      items.map(async item => {
        const {
          params,
          tableName,
          whereClause,
          pkName,
          autoSetTimeFields
        } = item
        const sql = await this.GenerateUpdateSQL({
          params,
          tableName,
          whereClause,
          pkName,
          autoSetTimeFields // v0.1.7 support set autoSetTimeFields in update
        })
        sqls.push(sql)
      })
    )
    const res = await this.Transaction({ params: sqls, forceFlat }, callback)
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
  //   return res
  // }

  /**
   * @description An execute deleting helper function
   * @param {string} tableName the name of table
   * @param {string} whereClause e.g. "employeeId" = '123'
   * @param {boolean} returnSingleRecord whether or not to only return one result
   * @param {function} callback function to be run before committing the database transaction
   * @returns {Object} the response from postgres
   */
  async DeleteExecutor(tableName, whereClause, returnSingleRecord, callback) {
    let sql = `DELETE FROM ${tableName}`
    if (whereClause) {
      this.CheckWhereClause(whereClause)
      sql = sql.concat(` WHERE ${whereClause}`)
    }
    sql = sql.concat(` RETURNING *`)
    // actually return without alias, if need set returnWithAlias is true
    const res = await this.Transaction(
      {
        params: [{ sql, alias: tableName, forceFlat: true, returnSingleRecord }]
      },
      callback
    )
    return res
  }

  /**
   * @description An execute querying helper function for one table
   * @param {tableName:string,whereClause:string,selectFields:string,sortBy:string,limit:number,offset:number, callback:function, returnSingleRecord: bool} args
   * @returns {Object} the response from postgres
   */
  async SingleQueryExecutor(args) {
    const {
      tableName,
      whereClause,
      selectFields = '*',
      sortBy,
      limit,
      offset,
      callback,
      returnSingleRecord
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
    // actually return without alias, if need set returnWithAlias is true
    const res = await this.Transaction(
      { params: [{ sql, alias: tableName }], returnSingleRecord },
      callback
    )
    return res
  }
}

module.exports = { DataAccess }
module.exports.DataAccess = DataAccess
module.exports.default = DataAccess
