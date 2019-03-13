FROM node:11.1.0 as build-machine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn --frozen-lockfile

# Bundle app source
COPY . .

RUN yarn build

#Final image ========================================
FROM mhart/alpine-node:11
RUN npm install pm2 -g 
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY --from=build-machine /usr/src/app /usr/src/app
EXPOSE 3000
CMD ["pm2-docker", "./ts/lib/index.js"]
