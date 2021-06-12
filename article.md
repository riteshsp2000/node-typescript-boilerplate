# Build a Typesafe GraphQL API with Type-graphql and Typegoose

## Introduction

In this article, we will be trying to solve one of the most common problems encountered while developing a GraphQL based backend with Typescript and MongoDB. Before we start, here is a quick overlook of the major technologies that we’ll be dealing with.

- Typescript is an open-source language that builds on JavaScript by adding static type definitions. Types provide a way to describe the shape of an object, providing better documentation and allowing TypeScript to validate that your code is working correctly.

- GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data. GraphQL provides a complete and understandable description of the data in your API, gives clients the power to ask for exactly what they need and nothing more, makes it easier to evolve APIs over time and enables powerful developer tools.

## Prerequisites

The article assumes that you have a working knowledge of TypeScript, MongoDB, GraphQL and Node.js. Before you begin, you will need:

1. A GraphQL server setup with your Node server (popular examples include Apollo-Server, Express-GraphQL)
2. MongoDB setup with your server. (Either local DB or MongoDB Atlas)

## The Problem: Multiple Sources of Truth

Most of the production level code these days is written in Typescript owing to its phenomenal type system. Adding GraphQL to this, we can leverage all its benefits such as having a client-driven API, prevent any over-fetching or under fetching of data, reduce the number of API calls, stating typing etc. However, the initial boilerplate code quickly increases when a database comes into the mix. That is, you’ll quickly find yourself maintaining three type definitions for one schema which then creates multiple sources of truth.

The following example shows a Mongoose schema, an Interface (type definition) for the schema, and the corresponding GraphQL type definition

```ts
// ================ User.ts ================
// Typescript Interface Definition
export interface IUser {
  name: string;
  email: string;
  userName: string;
  password: string;
  articles: IArticle[];
}

// MongoDB, Mongoose Schema definition
const useSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: false,
    unique,
    default: generateUserName(),
  },
  password: {
    type: String,
    required: true,
  },
  articles: [
    {
      type: Schema.Types.ObjectId,
      required: false,
    },
  ],
});

export const UserModel = mongoose.model('User', userSchema);

// GraphQL Type Definition (either one works)
export const types = gql`
  type User {
    id: ID
    name: String
    email: String
    userName: String
    password: String
    articles: [Article]
  }
`;
```

```ts
// ================ Article.ts ================
// Typescript Interface Definition
export interface IArticle {
  title: string;
  content: string;
  author: IUser[];
}

// MongoDB, Mongoose Schema definition
const useSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  authors: [
    {
      type: Schema.Types.ObjectId,
      required: true,
    },
  ],
});

export const UserModel = mongoose.model('User', userSchema);

// GraphQL Type Definition (either one works)
export const types = gql`
  type User {
    id: ID
    title: String
    content: String
    authors: [User]
  }
`;
```

## The solution: Single Source of Truth

By single source of truth, what I mean is, it would be really great if we could have a single definition for each schema. A single file that needs to be changed to make any updates in the future.
To maintain a single source of truth, there exist multiple libraries such as TypeGraphQL, GraphQL Nexus, TypeORM, Typegoose etc. In this guide, we’ll be using TypeGraphQL as GraphQL Nexus is not well maintained. TypeORM is well suited for Relational Databases and it has some compatibility issues with MongoDB which makes Typegoose as our choice.

## Installations and Setup

1. Package installations.

```shell
yarn add type-graphql reflect-metadata
```

2. Reflect-metadata shim is required to make the type reflection work. We must ensure that it is imported at the top of our entry file (before we use/import type-graphql or any of our resolvers)

```js
import “reflect-metadata”
```

3. Add typegoose for schema definitions.

```shell
yarn add typegoose
```

4. Typescript configuration: It’s important to set these options in the tsconfig.json. Typegraphql uses Decorators and decorators are a stage 2 proposal for Javascript and are available as an experimental feature for Typescript.

```json
	“compileOptions”: {
		“emitDecoratorMetadata”: true,
		“experimentalDecorators”: true,
}
```

5. Typegraphql is designed to work with node.js LTS and the latest stable releases. It uses features from ES2018 so we should set our tsconfig.json file appropriately.

```json
{
	“target”: “es2018” // or newer if your node.js version supports this
}
```

For optional configurations, you can check out the installation page of typegraphql [here](https://typegraphql.com/docs/installation.html).

## Usage

Following is the definition that takes care of all the three types/schemas i.e. Mongoose Schema, Typescript interface and GraphQL type definition.

```ts
// ================ UserType.ts ================
// Libraries
import { prop as Property, getModelForClass } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { ObjectId } from 'mongodb';

// Models
import { ArticleModel } from './Article.ts';

@ObjectType({ description: 'The User Model' })
export class User {
  @Field((type) => ID)
  readonly _id: ObjectId;

  @Property({ required: true })
  @Field({ description: 'Name of the user' })
  name: string;

  @Property({ required: true, unique: true })
  @Field()
  email: string;

  @Property({ required: false, default: generateUserName() })
  @Field({ nullable: true })
  username?: string;

  @Property({ required: true })
  password: string;

  @Property({ required: false, default: [] })
  @Field((type) => [string], { name: 'articleIds' })
  articles: string[];

  @Field((type) => [Article])
  get articles(): Article[] {
    return this.articles.map(
      async (articleId) => await ArticleModel.findById(articleId)
    );
  }
}

export const UserModel = getModelForClass(User);
```

## Description

What exactly is going on here? might be your question. Worry not! At first, this syntax feels a bit junky and uneasing but once you get to know what each line of code here represents, it becomes easy to understand the code.

Typegraphql uses classes and decorators for definition of the types. The main reason for doing so is that Typescript has interfaces which are nothing but classes. You can find more about decorators here.

- To start with, we decorate the class with the `@ObjectType` decorator which marks the class as the type known from the GraphQL SDL or GraphQLObjectType.
- The name given to the class is also the name of the Typescript Interface and Mongoose Schema.
- Each property of the object is then defined in the class using `@Field` and `@prop` decorators. (Note: Here I have renamed the prop decorator to Property at the time of import for consistency.)
- `@Field` decorator imported from `type-graphql` is used to define a GraphQL Field and the arguments passed to this configure the graphql field.
- `@prop` decorator imported from `typegoose` is used to defined the individual properties that we use to define a field in the mongoose schema.
- Below each field, a variable and its type is defined as per a Typescript interface. These variables can then be used anywhere in the class.

- `@Field` takes in 2 parameters, one that defines the type of the graphql field and the second an object that configures this particular field.
- In the first property i.e. \_id, we pass a function to `@Field` whose return type is ID (ID here corresponds to GraphQLID or ID from graphql).
- The reason for using a function to define the type of the field instead of having a property in an object is to avoid circular dependency.
- In the second property i.e. name, we pass a configuration object to `@Field` which sets the description of that particular field.

- The `password`, `articles` and `get articles()` fields are a bit strange looking.
- Password is one such field that we want to store in the database but dont want to resolve it in a graphql query. For this to happen, we don't decorate this property with `@Field` decorator and just add the `@prop`.
- As per our mongodb schema, articles is an array of article ids. The idea is that we wish to resolve this and return an array of articles instead of just articles.
- To achieve this, we pass in a configuration property called `name` to the `@Field`. What it does is, the name of the graphql field will be set to whatever we configure(here it is articleIds). And within the class and the schema it'll store as articles (as we want it).
- The final field is the `get articles()` one. As you can see we haven't used the `@prop` decorator which means that this field will not be present in the schema.
- This part of the code creates a graphql field which will be resolved as per the function that we have specified. In this case, we are mapping over the article ids (this.articles) and finding each article from the Database and returning an array of articles.

That covers most of the ways how we'll define our types. It's just one class that takes care of MongoDB Schema, Typescript interface, GraphQL Type. You can create a similar ObjectType for Article as well. Once types are defined the next steps are Queries and Mutations. Following is an example how we are going to define them.

```ts
// ================ UserResolver.ts ================
// Libraries
import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Mutation,
  InputType
} from 'type-graphql';

// Types
import { UserType, UserModel } from './User';

// Input Type
@InputType()
export class userInputType {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field({nullable: true})
  username?: string

  @Field()
}

@Resolver((of) => UserType)
export class UserResolver {
  @Query((returns) => [User], { description: "Returns an array of all Users"  })
  async getUsers(): Promise<User[]> {
    return await UserModel.find({});
  }

  @Query((returns) => User, { nullable: true })
  async getUserById(@Args('id') id: string): Promise<User | undefined> {
    return await UserModel.findById(id)
  }

  @Mutation((returns) => User)
  async addUser(
    @Arg("name") name: string,
    @Arg("email") email: string,
    @Arg("username") name?: string,
    @Arg("password") name: string,
  ): Promise<User | Error> {
    const existingUser = await UserModel.find({email})
    if (existingUser) throw new Error('User already Exists')

    const newUser = new UserModel({
      ...userInput,
      articles: []
    })
    return await newUser.save();
  }

  @Mutation((returns) => User)
  async updateUser(
    @Arg("user") userInput: userInputType
    @Ctx() ctx: Context,
  ): Promise<User | Error> {
    if (!ctx.user) throw new Error("User not authorized.")

    return await UserModel.findOneAndUpdate({email}, {
      name,
      email,
      username,
      password,
    })
  }

  @Mutation((returns) => boolean)
  async deleteUser(
    @Arg("id") id: ID,
    @Ctx() ctx: Context,
  ): Promise<boolean | Error> {
    if (!ctx.user) throw new Error("User not authorized")

    await UserModel.findByIdAndDelete(id)
    return true,
  }
}
```

## Description

Here we go again! But this time you might be having some insights as to what is happening. Lets get to the breakdown.

- Just like object definitions, type-graphql provides us with decorators to describe the various properties. Lets start from the UserResolver. (We'll come back to the UserInputType later)
- UserResolver is class that contains all the queries and mutations related to the user. Unlike the object type definition, here the name doesn't signify much and can be considered as a housing for the queries and mutation (you'll see later why)
- We have our first query called getUsers decorated by the `@Query` decorator which returns an array of Users. The Query can be configured through the configuration object as shown.
- In the second one we see that we are getting an input from the client. This is implemented using the `@Args` decorator. The syntax is bit tricky but visualizing it as follows might help you understand it.

```ts
getUserById(
  @Args('id')
  id: string,
): Promise<User | undefined>
```

- Just like the `@Field` decorator, we add the `@Args` decorator before every argument.
- The next one we have is the addUser Mutation which is decorated by the `@Mutation`. All of these decorators follow the same pattern. Here we are getting multiple arguments, checking for existing user, creating a new one and returning it.
- The updateUser mutation is a bit different. Here we are getting an object with the required arguments as input instead of each argument. This is why we defined an object above called UserInputType with the possible arguments as fields.
- We also get access to the Context object using the `@Ctx` decorator which we then can use to perform our authorization checks.
- Last one is a good old deleteUser mutation which then completes all our CRUD operations.
