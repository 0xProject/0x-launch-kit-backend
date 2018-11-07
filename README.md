# 0x-launch-kit

This is a template 0x relayer. It's customizable, open source and completely free to use. You can just fork it and start modifying it for your own needs.

It ships as both a typescript and javascript module. TS sources are in the `ts` directory while auto-generated JS sources are in the `js` directory.

TODO:(leo) Add instructions for deleting ts/js directories

## Deploying

`0x-launch-kit` ships as a docker container. To build the image run:

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

Chack that it's working by running

```
curl http://localhost:3000/v2/asset_pairs
```
