# 0x-launch-kit

## Table of contents

* [Introduction](#introduction)
* [Language choice](#language-choice)
* [Getting started](#getting-started)
* [Client for your relayers API](#lient-for-your-relayers-api)
* [Commands](#commands)
* [Database](#database)
* [Deployment](#deployment)

## Introduction

Launch a 0x relayer in under a minute with Launch Kit. This repository contains an open-source, free-to-use  0x relayer template that you can use as a starting point for your own project.

- Quickly launch a market for your community token
- Seemlessly create an in-game marketplace for digital items and collectibles
- Enable trading of any ERC-20 or ERC-721 asset

Fork this repository to get started!

### [Learn more](https://0xproject.com/launch-kit)

[TODO: legal disclaimer]

## Language choice

`0x-launch-kit` ships with 2 codebases, one in Typescript and another in Javascript. Although the Javascript is auto-generated from the Typescript, we made sure the Javascript generated is readable.

Before you start using 0x-launch-kit, choose whether you want your codebase to be in Typescript or Javascript.

**If you want to work on it in Javascript:**

-   delete the `ts` directory
-   delete all scripts from `package.json` that end with `:ts`

**If you want to work on it in Typescript:**

-   delete the `js` directory
-   delete all scripts from `package.json` that end with `:js`

## Getting started

To develop ontop of `0x-launch-kit`, follow the following instructions:

1. Fork this repository
2. Clone your fork of this repository
3. Open the `config.ts`/`config.js` file (depending on the language you've chosen above) and edit the following:
- `NETWORK_ID` -- the network you'd like your relayer to run on (`1` corresponds to mainnet)
- `ASSET_PAIRS` -- Which asset pairs you would like to host orderbooks for.
- `FEE_RECIPIENTS` -- The Ethereum addresses which should be specified as the fee recipient in orders your relayer accepts.
4. Make sure you have [Yarn](https://yarnpkg.com/en/) installed.
5. Install the dependencies

```sh
yarn
```
 
6. Build the project [NOTE: For Typescript users only]

```sh
yarn build:ts
```

or build & watch:

```sh
yarn watch:ts
```

**Note:** There isn't currently a build step when working on the Javascript codebase because we assume `0x-launch-kit` will be running on Node.js > v8.0. If you want this project to work in an environment that doesn't support all the latest Javascript features, you will need to add a transpiler (e.g [Babel](https://babeljs.io/)).

7.   Start the relayer

```sh
yarn start:ts
```

OR

```sh
yarn start:js
```

##  Client for your relayer's API

Since your relayer adheres to V2 of the [Standard Relayer API Specification](https://github.com/0xProject/standard-relayer-api/), you can use [0x Connect](https://0xproject.com/docs/connect) (an HTTP/Websocket client for the SRA API) to make calls to your relayer (e.g submit an order, get all orders, etc...).

[TODO: Add more in-line examples]


## Commands

Typescript project commands: 

- `yarn build:ts` - Builds the code
- `yarn lint:ts` - Lints the code
- `yarn start:ts` - Starts the relayer
- `yarn watch:ts` - Watches the code and rebuilds on change
- `yarn prettier:ts` - Auto-formats the code

Javascript project commands:

- `yarn start:js` - Starts the relayer
- `yarn prettier:js` - Auto-formats the code

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses an [SQLite](https://sqlite.org/docs.html) database. 

Because we want to support both Javascript and Typescript codebases, we don't use `TypeORM`'s [decorators](https://github.com/typeorm/typeorm/blob/master/docs/decorator-reference.md) (They don't transpile nicely into readable Javascript). TypeORM shines with decorators however, so you might want to use them if you're going to be working in Typescript.

## Deployment

`0x-launch-kit` ships as a docker container. First, install Docker ([mac](https://docs.docker.com/docker-for-mac/install/), [windows](https://docs.docker.com/docker-for-windows/install/)). To build the image run:

```sh
docker build -t 0x-launch-kit .
```

You can check that the image was built by running:

```sh
docker images
```

And launch it with

```sh
docker run -p 3000:3000 -d 0x-launch-kit
```

Check that it's working by running

```
curl http://localhost:3000/v2/asset_pairs
```
