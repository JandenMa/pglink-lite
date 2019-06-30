const { Pool } = require('pg')

const Connection = (
  database,
  username,
  password,
  host,
  port,
  connectionMax
) => {
  return new Pool({
    max: connectionMax,
    user: username,
    database,
    password,
    host,
    port
  })
}

module.exports = { Connection }
module.exports.Connection = Connection
module.exports.default = Connection
