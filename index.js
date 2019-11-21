'use strict'

const { Connection } = require('./lib/core/connection')
const { ModelImpl } = require('./lib/model')
const { DataType } = require('./lib/dataType')

class PgLink {
  /**
   * @param {{host:string,port:number,userName:string,password:string,database:string,connectionMax:number,globalAutoSetTimeFields:Array<striing>,idleTimeoutMillis:number,connectionTimeoutMillis:number}} args
   */
  constructor(args) {
    const {
      host,
      port,
      password,
      userName,
      database,
      connectionMax,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      globalAutoSetTimeFields = [] // v0.1.8 for whole app to use
    } = args
    const connection = Connection({
      host,
      port,
      password,
      userName,
      database,
      // maximum number of clients the pool should contain
      // by default this is set to 10.
      connectionMax,
      // number of milliseconds to wait before timing out when connecting a new client
      // by default this is 0 which means no timeout
      connectionTimeoutMillis,
      // number of milliseconds a client must sit idle in the pool and not be checked out
      // before it is disconnected from the backend and discarded
      // default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients
      idleTimeoutMillis
    })
    this.Model = ModelImpl(connection, globalAutoSetTimeFields)
    this.DataTypes = DataType
  }
}

module.exports = { PgLink }
module.exports.PgLink = PgLink
module.exports.default = PgLink
