# 0x-launch-kit

This is a template 0x relayer. It's customizable, open source and completely free to use. You can just fork it and start modifying it for your own needs.

It ships as both a typescript and javascript module. TS sources are in the `ts` directory while auto-generated JS sources are in the `js` directory.

If you want to work on it as a JS project:

-   delete the `ts` directory
-   delete all scripts from package.json that end with :ts
-   Look through the JS code and start modifying it. It was auto-generated from TS code and we tried our best to make it readable. It might require some improving and should provide a good starting point.

If you want to work on it as a TS project:

-   delete the `js` directory
-   all the scripts from package.json that end with :js

## Database

This project uses [typeorm](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database that this project uses. As for now this project uses sqlite backend. Because we support both JS and TS code we don't use decorators. TypeORM shines with decorators, so you might want to use them if you're going to use the TS version.

## Configuration

Launch kit can be configured by changing the config variables in the [config.json](config.json) file.

## Deploying

`0x-launch-kit` ships as a docker container. First, install Docker ([mac](https://docs.docker.com/docker-for-mac/install/), [windows](https://docs.docker.com/docker-for-windows/install/)). To build the image run:

```sh
docker build -t 0x-launch-kit .
```

You can check that the image is built running

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
