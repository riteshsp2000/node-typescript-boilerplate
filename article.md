# Build a Typesafe GraphQL API with Type-graphql and Typegoose

## Introduction

In this article, we will be trying to solve one of the most common problems encountered while developing a GraphQL based backend with MongoDB and Mongoose. Before we start, here is a quick overlook of the major technologies that we’ll be dealing with.

Typescript is an open-source language that builds on JavaScript by adding static type definitions. Types provide a way to describe the shape of an object, providing better documentation and allowing TypeScript to validate that your code is working correctly.

GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data. GraphQL provides a complete and understandable description of the data in your API, gives clients the power to ask for exactly what they need and nothing more, makes it easier to evolve APIs over time and enables powerful developer tools.

## Prerequisites

The article assumes that you have a working knowledge of TypeScript, MongoDB, GraphQL and Node.js. Before you begin, you will need:

1. A basic Node.js server setup with Express.js (or any framework of your choice.)
2. A GraphQL server setup with your Node server (popular examples include Apollo-Server, Express-GraphQL)
3. MongoDB setup with your server. (Either local DB or MongoDB Atlas)

## The Problem: Multiple Sources of Truth

Most of the production level code these days is written in Typescript owing to its phenomenal type system. Adding GraphQL to this, we can leverage all its benefits such as having a client-driven API, prevent any over-fetching or under fetching of data, reduce the number of API calls, stating typing etc. However, the initial boilerplate code quickly increases when a database comes into the mix. That is, you’ll quickly find yourself maintaining three type definitions for one schema which then creates multiple sources of truth.

The following example shows a Mongoose schema, an Interface (type definition) for the schema, and the corresponding GraphQL type definition

```ts
// ================ User.js ================
// Typescript Interface Definition
export interface IUser {
  name: string;
  email: string;
  username: string;
  password: string;
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
  },
  password: {
    type: String,
    required: true,
  },
});

export const UserModel = mongoose.model('User', userSchema);

// GraphQL Type Definition (either one works)
export const types = gql`
  type User {
    _id: ID
    name: String
    email: String
    userName: String
    password: String
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

Usage
Following is the definition that takes care of all the three types/schemas i.e. Mongoose Schema, Typescript interface and GraphQL type definition.

```js
// Libraries
import { prop, getModelForClass } from "@typegoose/typegoose";
import { Field as Field, ObjectType } from "type-graphql";

@ObjectType()
export class User {
  @Field(type => ID, {nullable: false})
  _id!: string;

  @prop({ required: true })
  @Field(() => String)
  name: string;

  @prop({ required: true })
  @Field(() => String)
  email: string;

  @prop()
  @Field(() => String)
  username: string;

  @prop()
  @Field(() => String)
  password: string;
}

export const UserModel = getModelForClass(User);
```
