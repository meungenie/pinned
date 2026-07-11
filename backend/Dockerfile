FROM node:20-alpine

RUN apk upgrade --no-cache libcrypto3 libssl3

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chown -R node:node /app

EXPOSE 5000

USER node
CMD ["node", "server.js"]
