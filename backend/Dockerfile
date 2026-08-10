FROM node:20-alpine

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install --production && npm install tar@^7.5.19 --save-exact

COPY . .

RUN chown -R node:node /app

EXPOSE 5000

USER node
CMD ["node", "server.js"]
