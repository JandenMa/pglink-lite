'use strict'

const { DataAccess } = require('./core/dataAccess')
const { DataType } = require('./dataType/dataType/dataType')

class Pgraphql {
  constructor(
    database,
    username,
    password,
    host,
    port = 5432,
    connectionMax = 10,
    isLambda = false
  ) {
    this.isLambda = isLambda
    this.dataAccess = new DataAccess(
      database,
      username,
      password,
      host,
      port,
      connectionMax
    )
  }
  static dataType = DataType
}

module.exports = { Pgraphql }
module.exports.Pgraphql = Pgraphql
module.exports.default = Pgraphql
