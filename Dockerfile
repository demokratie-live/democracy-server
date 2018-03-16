FROM node:latest

# Install Yarn
RUN npm install -g yarn

WORKDIR /app

COPY . .

RUN yarn install

RUN yarn build

ENTRYPOINT [ "yarn", "serve" ]