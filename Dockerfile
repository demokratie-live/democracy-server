FROM node:12.11.1

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

ENTRYPOINT [ "npm", "run", "dev" ]