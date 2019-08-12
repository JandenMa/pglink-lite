# pgsqlize-lite

> A library for Postgresql to use ORM on NodeJS with GraphQL
>
> MIT LICENCE



_This library is built for who uses GraphQL on NodeJS, you can use model to operate data._ 



### Version Change Logs

- __Build20190812 :__  Prepared version

---

### Installation

- npm

  ```bash
  npm i pgsqlize-lite --save
  ```

- yarn

  ```bash
  yarn add pgsqlize-lite --save
  ```

---

### Quick Example

- Instance (_core/pgsqlize.js_)

  ``` javascript
  // core/pgsqlize.js
  const {Pgsqlize} = require('pgsqlize-lite')
  
  const pgsqlize = new Pgsqlize({
    host: 'http://192.168.1.100',
    port: 5432,
    useName: 'root',
    password: '123456',
    database: 'test'
  });
  
  module.exports.default = pgsqlize
  ```

- Model (_models/users.js_)

  ``` javascript
  // models/users.js
  const pgsqlize = require('../core/pgsqlize')
  
  class UserModel extends pgsqlize.model{
    constructor(params){
      super({tableName: 'users', params, pkName: 'userId'})
    }
  }
  
  module.exports.default = UserModel
  ```

- Schema (_schemas/users.js_) 

  ``` javascript
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
  module.exports.default = typeDefs;
  ```

- Resolver (_resolvers/users.js_)

  ```javascript
  // resolvers/users.js
  const UserModel = require('../models/users.js')
  
  const getUserById = async (_, args) => {
    const inst = new UserModel(null);
    const res = await inst.findByPk(args.userId);
    return res;
  };
  
  const insertUser = async (_, args) => {
    const inst = new UserModel({...args.user});
    const res = await inst.insertOne();
    return res;
  };
  
  const editUser = async (_, args) => {
    const inst = new UserModel({...args.user});
    const res = await inst.updateByPk();
    return res;
  };
  
  module.exports = {
    getUserById,
    insertUser,
    editUser
  };
  ```

---

（continue...）