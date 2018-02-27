FROM node:carbon

WORKDIR /app

COPY package*.json ./

RUN yarn

# Bundle app source
COPY . .

# EXPOSE 8080

CMD [ "yarn", "start" ]