FROM node:11.1.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn --frozen-lockfile

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "yarn", "start:ts" ]
