# 0x-launch-kit

This is a template 0x relayer. It's customizable, open-source and completely free to use. You can fork it and customize it to fix your own needs.

It ships as both a typescript and javascript module. Typescript sources are in the `ts` directory while auto-generated Javascript sources are in the `js` directory.

If you want to work on it in Javascript:

-   delete the `ts` directory
-   delete all scripts from package.json that end with :ts
-   Look through the Javascript code and start modifying it. It was auto-generated from Typescript code and we tried our best to make it readable. It might require some improving and should provide a good starting point.

If you want to work on it in Typescript:

-   delete the `js` directory
-   all the scripts from package.json that end with :js

## Getting started

If you want to just run the code - check out the Deploying section bellow on instructions about how to run a docker container.
If you want to develop on top of `0x-launch-kit`:

-   Fork the repo
-   Clone your version
-   Install the dependencies

    ```sh
    yarn
    ```

-   Build the code

    ```sh
    yarn build:ts
    ```

    or

    ```sh
    yarn watch:ts
    ```

-   Run the code

    ```sh
    yarn start:ts
    ```

Alternatively if you prefer to work with Javascript code

-   Fork the repo
-   Clone your version
-   Install the dependencies

    ```sh
    yarn
    ```

-   Run the code

    ```sh
    yarn start:js
    ```

    We don't have the build step for Javascript code for now, but if you want to use some modern syntax not supported by your current environment - you can add it.

## Commands

-   build - Builds `TS` code and copies the build version over in place of `JS` code (**Warning**: Overrides the JS code)
-   prettier - Prettifies both `JS` and `TS` code

-   lint:ts - Lints `TS` code
-   start:ts - Starts `TS` code
-   build:ts - Builds `TS` code
-   watch:ts - Watches `TS` code and rebuilds on changes
-   prettier:ts - Prettifies `TS` code

-   start:js - Starts `JS` code
-   prettier:js - Prettifies `JS` code

## Database

This project uses [typeorm](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database that this project uses. As for now this project uses an [SQLite](https://sqlite.org/docs.html) backend. Because we support both Javascript and Typescript codebases, we don't use decorators. TypeORM shines with decorators, so you might want to use them if you're going to be working in Typescript.

## Configuration

0x Launch kit can be configured by changing the config variables in the [config.json](config.json) file.

## Deploying

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
