# pglink-lite

> A library for Postgresql to use ORM on NodeJS with GraphQL
>
> Via _Janden Ma_
>
> MIT LICENCE

_This library is built for who uses GraphQL on NodeJS, you can use model to operate data._

## Version Change Logs

- **Build20190812 :** Prepared version
- **Build20190819 :** Beta version
- **Build20190826 :** Fix bugs.
- **Build20190829 :** Add multi insert and update functions.
- **Build20190917 :**
  - `MultiUpdateWithConditions` bug fixes.
  - Supports all update functions in model to set the fields, which need to update to current time automatically, when updated.
- **Build20190919 :** Supports set global parameter `globalAutoSetTimeFields`
- **Build20190924 :**
  - Changed `tableName` and `returnTableName` in `Transaction` to `alias` and `returnWithAlias`
  - Added `Execute` function in `dataAccess` to run a single query
  - Bug fixes
  - Optimized something
- **Build20191022 :** Update README.
- **Build20191111 :** Vast changes.
- **Build20191112 :** 
  - Added the ability to force flatten results.
  - Added the ability to return a single record.
- **Build20191114 :** Correct `pg` package dependency.
- **Build20191120 :** 
  - Added `connectionTimeoutMillis` and `idleTimeoutMillis` parameters.
  - Added `DataAccess.Disconnect()` function (beta).
- **Build20191219 :** `findByPk` function supports multiple primary keys. 
- **Build20200107 :** Resolved async issue for `autoSetTimeFields`
- **Build20200116 :** Added `ssl`
- **Build20200120 :** Bug fixes.
- **Build20200212 :** Performance improvements.
- **Build20200218 :** Bug fixes.
- **Build20200409 :** Bug fixes and performance improvements.
- **Build20200421 :** Added customize transaction functions
  - BeginTransaction
  - CommitTransaction
  - RollbackTransaction
- **Build20200423 :** Bug fixes
- **Build20200427 :** Optimized client connections in `Transaction`
- **Build20200514 :** Correct `sortBy` option for build querying sql
- **Build20200824 :** Bug fixes
- **Build20200917 :** Correct declaration and signature of parameters to  `Transaction` 
- **Build20201010 :** Upgrade `pg` to support PostgreSQL 13
- **Build20201027 :** Try to resolve ssl connections failed issue
- **Build20201029 :** Add `preserveClient` for leaving the client open for further operations in the transaction

---

## Installation

- npm

  ```bash
  npm i pglink-lite --save
  ```

- yarn

  ```bash
  yarn add pglink-lite --save
  ```

---

## Quick Example

- Instance (_core/pglink.js_)

  ```javascript
  // core/pgsqlize.js
  const { PgLink } = require('pglink-lite')
  
  const pglink = new PgLink({
    host: 'http://192.168.1.100',
    port: 5432,
    userName: 'root',
    password: '123456',
    database: 'test',
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 60000,
    globalAutoSetTimeFields: ['updatedAt'],
    ssl: true
  })
  
  module.exports.default = pglink
  ```

- Model (_models/users.js_)

  ```javascript
  // models/users.js
  const pglink = require('../core/pglink')

  class UserModel extends pglink.Model {
    constructor() {
      super({ tableName: 'users', pkName: 'userId'})
    }
  }

  module.exports.default = UserModel
  ```

- Schema (_schemas/users.js_)

  ```javascript
  // schemas/users.js
  // you need to install something for gql first, we use apollo-server here
  const { gql } = require('apollo-server')

  const typeDefs = gql`
    type User {
      userId: ID!
      userName: String
      status: Boolean
    }
  
  	input UserInsertInput {
      userName!: String
  	}
  
  	input UserEditInput {
      userId!: ID
      userName: String
      status: Boolean
  	}
  
  	type Query {
  		getUserById(userId: ID!): User
  	}
  
  	type Mutation	{
  		insertUser(user: UserInsertInput): User
  		editUser(user: UserEditInput): User
  	}
  `
  module.exports.default = typeDefs
  ```

- Resolver (_resolvers/users.js_)

  ```javascript
  // resolvers/users.js
  const UserModel = require('../models/users.js')

  const getUserById = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.findByPk({ pk: args.userId })
    return res
  }

  const insertUser = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.insertOne({ params: args.user })
    return res
  }

  const editUser = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.updateByPk({ params: args.user })
    return res
  }

  module.exports = {
    getUserById,
    insertUser,
    editUser
  }
  ```

---

## Usage

- **Import library package**

  ```javascript
  import { PgLink } from 'pglink-lite'
  // or
  import PgLink from 'pglink-lite'
  // or
  const { PgLink } = require('pglink-lite')
  // or
  const PgLink = require('pglink-lite')
  ```

- **Instantiate `PgLink`**

  ```javascript
  export const pglink = new PgLink({
    host: 'http://192.168.1.100',
    port: 5432,
    userName: 'root',
    password: '123456',
    database: 'test'
  })
  ```

  - Props: `object`

    | Key                     | Type            | Introduction                                                                                                                                                                                                                       | Default value |
    | ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
    | host                    | `string`        | Postgresql server host                                                                                                                                                                                                             | "localhost"   |
    | port                    | `number`        | Postgresql server port                                                                                                                                                                                                             | 5432          |
    | userName                | `string`        | Postgresql server user name                                                                                                                                                                                                        | "postgres"    |
    | password                | `string`        | Postgresql server password                                                                                                                                                                                                         | ""_(empty)_   |
    | database                | `string`        | Postgresql database name                                                                                                                                                                                                           | "postgres"    |
    | connectionMax           | `number`        | Postgresql database max connection                                                                                                                                                                                                 | 10            |
    | connectionTimeoutMillis | `number`        | Number of milliseconds to wait before timing out when connecting a new client, by default this is 0 which means no timeout                                                                                                         | 0             |
    | idleTimeoutMillis       | `number`        | Number of milliseconds a client must sit idle in the pool and not be checked out, before it is disconnected from the backend and discarded, default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients | 10000         |
    | globalAutoSetTimeFields | `Array<string>` | To define fields that should be automatically updated with a current timestamp                                                                                                                                                     | []            |
    | ssl                     | `boolean`       | To connect to pg using ssl                                                                                                                                                                                                         | false         |
- **Inherit and declare model**

  ```javascript
  // example
  class xxxModel extends pglink.Model {
    constructor(params) {
      super({
        tableName: 'users',
        pkName: 'No',
        enumMapping: {
          sex: { MALE: 1, FAMALE: 0 },
          role: { STUDENT: 1, TEACHER: 2 }
        }
      })
    }
    // if you need rewrite inner funtions or add some functions, write here
  }
  ```

  - constructor props : `object`

  | Key         | Type     | Introduction                                                                                         | Required |
  | ----------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- |
  | tableName   | `string` | the data table in postgresql you need to operate                                                     | true     |
  | pkName      | `string` | the name of primary key in the data table, default `id`                                              | false    |
  | enumMapping | `object` | to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} | false    |

  - inner properties or functions

    1. **dataAccess**

       - Introduction

         A data table operator (CRUD)

       - see the details below

    2. **findAll**

       - Introduction

         A function for querying all rows from one table

       - Parameters

          {
            `options`: object, default {
                sortBy: undefined,
                limit: undefined,
                offset: undefined
            }

            `callback`: function
          }

       - Returns

         (Promise) All rows data or error

    3. **findByPk**

       - Introduction

         A function for querying by primary key

       - Parameters

         { 
         
          `pkValue`: string | number | object 
  
           - if multiple primary keys, should use object, e.g. {id: 1, cid: 2}
  
           `selectFields`: string, default \*
  
           `callback`: function
         
          }
  
       - Returns

         (Promise) One row data or error

    4. **findByConditions**

       - Introduction

         A function for querying by conditions

       - Parameters

          {
            `whereClause`: string. (e.g. ' name = "Tim" ')

            `selectFields`: string, default \*

            `options`: object, default {
              sortBy: undefined,
              limit: undefined,
              offset: undefined
            }

            `callback`: function
          }

       - Returns

         (Promise) Some rows data or error

    5. **InsertOne**

       - Introduction

         A function for inserting one row to a table

       - Parameters

         {
    
           `params`: object. (data from resolver)
    
           `callback`: function

           `client`: object
    
         }
    
       - Returns

         (Promise) Inserted row data or errors

    6. **multiInsert**

       - Introduction

         A function for inserting multi rows to a table

       - Parameters

         {
    
          `items`: Array\<object\>. (data from resolver)
    
          `forceFlat`?: boolean (whether or not to force results into a single array)

          `callback`: function

          `client`: object
    
         }
    
       - Returns

         (Promise) Inserted rows data or errors

    7. **updateByPk**

       - Introduction

         A function for updating by primary key

       - Parameters

         {
       `params`: object. (data from resolver, have to include pkName and pkValue)
    
           `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

           `callback`: function

           `client`: object
     }
    
       - Returns

         (Promise) updated row data or errors

    8. **updateByConditions**

       - Introduction

         A function for updating by conditions

       - Parameters

         {
       `params`: object. (data from resolver)
    
           `whereClause`: string. (e.g. ' name = "Tim" ')

           `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

           `callback`: function
         
           `client`: object
    }
    
       - Returns

         (Promise) updated rows data or errors

    9. **multiUpdateWithConditions**

       - Introduction

         A function for multi updating by conditions

       - Parameters

         {
       `items`: Array\<object\>. (data from resolver)
    
           `whereClause`: string with replacements. (e.g. ' company = \$1 ')

           `replacementFields`: Array\<string\> (e.g. ['company'])

           `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

           `forceFlat`?: boolean (if true, forces results into a single array)

           `callback`: function

           `client`: object
     }
    
       - Returns

         (Promise) Updated rows data or errors

    10. **deleteByConditions**

        - Introduction

          A function for deleting by conditions

        - Parameters

          {
        `whereClause`: string. (e.g. ' "companyId" = 1001 ')
    
            `returnSingleRecord?`: boolean (if true, returns just one record)

            `callback`: function

            `client`: object
        }
        - Returns
    
          (Promise) Deleted rows data or errors

    11. **encodeFromEnum**

        - Introduction

          A function for encoding the enum to integer value

        - Parameters

          `data`: object | Array. (input data)

        - Returns

          (Object) Same structure of input data, with encoded enum

    12. **decodeToEnum**

        - Introduction

          A function for decoding the enum from integer value

        - Parameters

          `data`: object | Array. (output data)

        - Returns

          (Object) Same structure of output data, with decoded enum

  - `dataAccess` functions

    1. **Execute**

       - Introduction

         to run a single and simple sql

       - Parameters:

         - sql: string

       - Returns

         reponse from database
       
       - Example:
         ```javascript
           const sqlStatement = `SQL STATEMENT GOES HERE`
           const res = await this.dataAccess.Execute(sqlStatement);
         ```
         
  
    2. **Transaction**

       - Introduction

         core function with transaction

       - Parameters:

         ```javascript
          args: {
             params: Array<{
             sql: string
             replacements?: Array<any>
             alias?: string // to distinguish responses
             }>
           client?: object
           returnWithAlias?: boolean, // if true, return res with alias
           returnSingleRecord?: boolean,
           forceFlat?: boolean,
           preserveClient?: boolean // Skips committing the operation, leaving the client open for further operations in the transaction
          },
          transaction: Function // callback function or Transaction
         ```
  
       - Returns

         reponse from database

    3. **GenerateInsertSQL**

       - Introduction

         generate insert sql object

       - Parameters

         ```javascript
         params: object, //data from resolver, includes inserted fields and values
         tableName: string //name of inserted table
         ```
  
       - Returns

         ```javascript
         {
           sql: string
           replacement: Array<any>
           tableName: string
         }
         ```
  
    4. **GenerateMultiInsertSQL**

       - Introduction

         generate bulk insert sql object

       - Parameters

         ```js
         insertFields: Array<string>,
         params: object, //data from resolver, includes inserted fields and values
         tableName: string //name of inserted table
         ```
  
       - Returns

         ```javascript
         {
           sql: string
           replacement: Array<any>
           tableName: string
         }
         ```
  
    5. **GenerateUpdateSQL**

       - Introduction

         generate update sql object

       - Parameters

         ```javascript
         {
         	/** an object includes the fields and values you want to update */
           params: object
           /** the name of table */
           tableName: string
           /** e.g. "employeeId" = '123' */
           whereClause?: string
           /** the name of primary key, default 'id' */
           pkName?: string
           /** those fields need to set time automatically, default value is from globalAutoSetTimeFields. We will check whether fields included in the table, if not, skip */
           autoSetTimeFields?: Array<string>
         }
         ```
  
       - Returns

         ```javascript
         {
           sql: string
           replacement: Array<any>
           tableName: string
         }
         ```
  
    6. **InsertExecutor**

       - Introduction

         execute insert sql

       - Parameters

         ```js
         params: object, //data from resolver, includes inserted fields and values
         tableName: string, //name of inserted table
         callback?: function, //function to run before committing the transaction
         client?: object //the pg client to be used for the transaction
         ```
    
       - Returns
  
         response from database
  
    7. **MultiInsertToOneTableExecutor**

       - Introduction

         execute insert sqls to one table

       - Parameters
  
         ```js
         insertFields: Array<string>,
         params: object, //data from resolver, includes inserted fields and values
         tableName: string, //name of inserted table
         callback?: function, //function to run before committing the transaction
         client?: object //the pg client to be used for the transaction
         ```
  
       - Returns

         response from database

    8. **MultiInsertExecutor**

       - Introduction

         execute insert sqls to deferent tables

       - Parameters
  
         ```javascript
         Array<
         {
           params: object, //data from resolver, includes inserted fields and values
           tableName: string //name of inserted table
         }>,
         forceFlat?: boolean, //if true, forces results into one array
         callback?: function, //function to run before committing the transaction
         client?: object //the pg client to be used for the transaction
         ```
  
       - Returns

         response from database

    9. **UpdateByPkExecutor**

       - Introduction

         execute update sql by primary key

       - Parameters
  
         ```javascript
         params: object, //data from resolver, includes updated fields and values
         tableName: string, //name of inserted table
         pkName?: string, //the name of primary key
         autoSetTimeFields?: Array<string> ,//those fields need to set time automatically
         callback?: function, //function to run before committing the transaction
         client?: object //the pg client to be used for the transaction
         ```
  
       - Returns

         response from database

    10. **UpdateExecutor**

        - Introduction

          execute update sql by conditions

        - Parameters
  
          ```javascript
          params: object, //data from resolver, includes updated fields and values
          tableName: string, //name of inserted table
          whereClause?: string, //e.g. "employeeId" = '123'
          autoSetTimeFields?: Array<string>, //those fields need to set time automatically
          callback?: function, //function to run before committing the transaction
          client?: object //the pg client to be used for the transaction
          ```
  
        - Returns

          response from database

    11. **MultiUpdateExecutor**

        - Introduction

          execute bulk update sqls by conditions

        - Parameters
  
          ```javascript
          Array<
            {
            params: object, //data from resolver, includes updated fields and values
              tableName: string, //name of inserted table
              whereClause?: string //e.g. "employeeId" = '123'
              pkName: string, //the name of primary key
              autoSetTimeFields?: Array<string>, //those fields need to set time automatically
              client?: object //the pg client to be used for the transaction
            }>,
            forceFlat?: boolean, //if true, forces results into a single array
            callback?: function //function to run before committing the transaction
          ```
  
        - Returns

          response from database

    12. **DeleteExecutor**

        - Introduction

          execute delete sql by conditions

         - Parameters

           ```javascript
           tableName: string, //name of inserted table
           whereClause?: string, //e.g. "employeeId" = '123'
           returnSingleRecord?: boolean,//if true, returns one record instead of array
           callback?: function, //function to run before committing the transaction
           client?: object //the pg client to be used for the transaction
           ```
        
        - Returns
        
        response from database
    
  
    13. **SingleQueryExecutor**
  
        - Introduction
  
          execute query sql
  
        - Parameters
  
          ```javascript
          {
             /** the name of table */
           	tableName: string
             /** e.g. "employeeId" = '123' */
             whereClause: string
             /** the fields what you want to select, default * */
             selectFields?: string
             /** the field name for sorting, e.g.: [{field: 'id', sequence:'DESC'}] */
             sortBy?: Array<{ field: String; sequence?: 'ASC' | 'DESC' }>
             /** to limit the count of rows you want to query */
             limit?: number
             /** how many rows you want to skip */
             offset?: number,
            /** if true, return a single record instead of an array */
             returnSingleRecord?: boolean,
             client?: object //the pg client to be used for the transaction
          }
          ```
  
        - Returns
  
          response from database
        
    14. **Disconnect** [Beta Function]
    
        - Introduction
    
          It will drain the pool of all active clients, disconnect them, and shut down any internal timers in the pool. It is common to call this at the end of a script using the pool or when your process is attempting to shut down cleanly.
