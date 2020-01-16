const { Pool } = require('pg')

/**
 * @param {{host:string,port:number,userName:string,password:string,database:string,connectionMax:number}} args
 */
const Connection = args => {
  const {
    database = 'postgres',
    host = 'localhost',
    port = 5432,
    userName = 'postgres',
    password = '',
    connectionMax = 10,
    connectionTimeoutMillis = 0,
    idleTimeoutMillis = 10000,
    ssl = false
  } = args
  return new Pool({
    max: connectionMax,
    user: userName,
    database,
    password,
    host,
    port,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    ssl
  })
}

module.exports = { Connection }
module.exports.Connection = Connection
module.exports.default = Connection
