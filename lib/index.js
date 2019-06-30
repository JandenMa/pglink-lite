const { Connection } = require('./connection')
class Pgraphql {
  constructor(
    database,
    username,
    password,
    host,
    port = 5432,
    connectionMax = 10
  ) {
    this._inst = Connection(
      database,
      username,
      password,
      host,
      port,
      connectionMax
    )
  }
}

module.exports = { Pgraphql }
module.exports.Pgraphql = Pgraphql
module.exports.default = Pgraphql
