'use strict'

const { Connection } = require('./connection')
const { DataType } = require('./dataType')

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
    this._isLmd = isLambda
    this._inst = Connection(
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
