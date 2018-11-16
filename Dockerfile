FROM node:11.1.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn --frozen-lockfile --ignore-optional
RUN yarn global add forever

# Bundle app source
COPY . .

RUN yarn build

EXPOSE 3000
CMD [ "forever", "ts/lib/index.js" ]
