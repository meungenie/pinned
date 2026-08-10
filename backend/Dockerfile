FROM node:20-alpine

RUN apk update && apk upgrade --no-cache && \
    npm install -g npm@latest

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chown -R node:node /app

EXPOSE 5000

USER node
CMD ["node", "server.js"]
