FROM node:latest

WORKDIR /app

COPY . .

RUN yarn install

ENTRYPOINT [ "yarn", "start" ]