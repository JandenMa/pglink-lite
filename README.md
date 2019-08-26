# pglink-lite

> A library for Postgresql to use ORM on NodeJS with GraphQL
>
> Via *Janden Ma*
>
> MIT LICENCE



_This library is built for who uses GraphQL on NodeJS, you can use model to operate data._



## Version Change Logs

- **Build20190812 :** Prepared version
- **Build20190819 :** Beta version 

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
    database: 'test'
  })

  module.exports.default = pglink
  ```

- Model (_models/users.js_)

  ```javascript
  // models/users.js
  const pglink = require('../core/pglink')

  class UserModel extends pglink.Model {
    constructor(params) {
      super({ tableName: 'users', params, pkName: 'userId' })
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
    const inst = new UserModel(null)
    const res = await inst.findByPk(args.userId)
    return res
  }

  const insertUser = async (_, args) => {
    const inst = new UserModel({ ...args.user })
    const res = await inst.insertOne()
    return res
  }

  const editUser = async (_, args) => {
    const inst = new UserModel({ ...args.user })
    const res = await inst.updateByPk()
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

  ``` javascript
  import { PgLink } from 'pglink-lite'
  // or
  import PgLink from 'pglink-lite'
  // or
  const { PgLink } = 'pglink-lite'
  // or
  const PgLink = 'pglink-lite'
  ```

- **Instantiate `PgLink`**

  ``` javascript
  export const pglink = new PgLink({
    host: 'http://192.168.1.100', 
    port: 5432, 
    userName: 'root',  
    password: '123456', 
    database: 'test' 
  })
  ```

  - Props: `object`

    | Key           | Type     | Introduction                       | Default value |
    | ------------- | -------- | ---------------------------------- | ------------- |
    | host          | `string` | Postgresql server host             | "localhost"   |
    | port          | `number` | Postgresql server port             | 5432          |
    | userName      | `string` | Postgresql server user name        | "postgres"    |
    | password      | `string` | Postgresql server password         | ""_(empty)_   |
    | database      | `string` | Postgresql database name           | "postgres"    |
    | connectionMax | `number` | Postgresql database max connection | 10            |

- **Inherit and declare model**

  ``` javascript
  // example
  class xxxModel extends pglink.Model {
    constructor(params) {
      super({ 
        tableName: 'users', 
        params, 
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

    | Key         | Type             | Introduction                                                 | Required |
    | ----------- | ---------------- | ------------------------------------------------------------ | -------- |
    | tableName   | `string`         | the data table in postgresql you need to operate             | true     |
    | params      | `object | array` | the data from resolver                                       | true     |
    | pkName      | `string`         | the name of primary key in the data table, default `id`      | false    |
    | enumMapping | `object`         | to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} | false    |

  - inner properties or functions

    | name               | Type       | Introduction                             | Parameters                                                   | Return                                           | Remark                |
    | ------------------ | ---------- | ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | --------------------- |
    | dataAccess         | `object`   | A data table operator (CRUD)             | -                                                            | -                                                | see the details below |
    | findAll            | `function` | For querying all rows                    | -                                                            | all rows data or error                           | Promise               |
    | findByPk           | `function` | For querying by primary key              | `pkValue`: stringnum, <br />`selectFields`: string, default * | one row data or error                            | Promise               |
    | findByConditions   | `function` | For querying by conditions               | `whereClause`: string (' name = "Tim" '), <br />`selectFields`: string, default * | some rows data or error                          | Promise               |
    | insertOne          | `function` | For inserting one row to a table         | -                                                            | inserted row data or errors                      | Promise               |
    | updateByPk         | `function` | For updating by primary key              | -                                                            | updated row data or errors                       | Promise               |
    | updateByConditions | `function` | For updating by conditions               | `whereClause`: string (' name = "Tim" ')                     | updated rows data or errors                      | Promise               |
    | deleteByConditions | `function` | For deleting by conditions               | `whereClause`: string (' name = "Tim" ')                     | deleted rows data or errors                      | Promise               |
    | encodeFromEnum     | `function` | For encoding the enum to integer value   | input data, object or array                                  | same structure of input data, with encoded enum  | object                |
    | decodeToEnum       | `function` | For decoding the enum from integer value | output data, object or array                                 | same structure of output data, with decoded enum | object                |

  - dataAccess functions

    1. **Transaction**

       - Introduction

         core function with transaction

       - Parameters: 

         ```javascript
         args: {
           params: Array<{
            	sql: string
             replacements?: Array<any>
             tableName?: string
           }>
           returnTableName?: boolean
         },
         transaction: Function // callback function or Transaction
         ```

       - Returns

         reponse from database

    2. **GenerateInsertSQL**

       - Introduction

         generate insert sql object

       - Parameters

         ```js
         params: object, //data from resolver, includes inserted fields and values
         tableName: string //name of inserted table 
         ```

       - Returns

         ``` javascript
         {
           sql: string
           replacement: Array<any>
           tableName: string
         }
         ```

    3. **GenerateMultiInsertSQL**

       - Introduction

         generate bulk insert sql object

       - Parameters

         ``` js
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

    4. **GenerateUpdateSQL**

       - Introduction

         generate update sql object

       - Parameters

         ``` javascript
         {
             /** an object includes the fields and values you want to update */
             params: object
             /** the name of table */
             tableName: string
             /** e.g. "employeeId" = '123' */
             whereClause?: string
             /** the name of primary key, default 'id' */
             pkName?: string
             /** those fields need to set time automatically */
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

    5. **InsertExecutor**

       - Introduction 

         execute insert sql

       - Parameters

         ```js
         params: object, //data from resolver, includes inserted fields and values
         tableName: string //name of inserted table 
         ```

       - Returns 

         response from database

    6. **MultiInsertToOneTableExecutor**

       - Introduction

         execute insert sqls to one table

       - Parameters

         ```js
         insertFields: Array<string>,
         params: object, //data from resolver, includes inserted fields and values
         tableName: string //name of inserted table 
         ```

       - Returns

         response from database

    7. **MultiInsertExecutor**

       - Introduction

         execute insert sqls to deferent tables

       - Parameters

         ``` javascript
         Array<
           {
             params: object, //data from resolver, includes inserted fields and values
             tableName: string //name of inserted table 
         	}
         >
         ```

       - Returns

         response from database

    8. **UpdateByPkExecutor**

       - Introduction

         execute update sql by primary key

       - Parameters

         ``` javascript
         params: object, //data from resolver, includes updated fields and values
         tableName: string, //name of inserted table 
         pkName?: string //the name of primary key
         ```

       - Returns

         response from database

    9. **UpdateExecutor**

       - Introduction

         execute update sql by conditions

       - Parameters

         ```javascript
         params: object, //data from resolver, includes updated fields and values
         tableName: string, //name of inserted table 
         whereClause?: string //e.g. "employeeId" = '123'
         ```

       - Returns

         response from database

    10. **MultiUpdateExecutor**

        - Introduction

          execute bulk update sqls by conditions

        - Parameters

          ```javascript
          Array<
            {
            	params: object, //data from resolver, includes updated fields and values
          		tableName: string, //name of inserted table 
          		whereClause?: string //e.g. "employeeId" = '123'
          		pkName: string //the name of primary key
            }
          >
          ```

        - Returns

          response from database

    11. **DeleteExecutor**

        - Introduction

          execute delete sql by conditions

        - Parameters

          ```javascript
          tableName: string, //name of inserted table 
          whereClause?: string //e.g. "employeeId" = '123'
          ```

        - Returns

          response from database

    12. **SingleQueryExecutor**

        - Introduction

          execute query sql

        - Parameters

          ``` javascript
          {
              /** the name of table */
              tableName: string
              /** e.g. "employeeId" = '123' */
              whereClause: string
              /** the fields what you want to select, default * */
              selectFields?: string
              /** the field name for sorting, e.g.: 'id DESC' */
              sortBy?: string
              /** to limit the count of rows you want to query */
              limit?: number
              /** how many rows you want to skip */
              offset?: number
           }
          ```

        - Returns

          response from database
