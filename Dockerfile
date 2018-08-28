FROM node:9.8.0

RUN mkdir -p /app

ADD .yarn_cache /usr/local/share/.cache/yarn/v1/

ADD ./package.json ./yarn.* /tmp/
RUN cd /tmp && yarn
RUN cd /app && ln -s /tmp/node_modules 

ADD . /app/

WORKDIR /app