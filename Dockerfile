FROM node:9.8.0

# Install Yarn
RUN npm install -g yarn

WORKDIR /app

COPY . .

RUN yarn install

RUN yarn build

ENTRYPOINT [ "yarn", "serve" ]