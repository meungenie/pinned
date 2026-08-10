FROM node:22-alpine

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chown -R node:node /app

EXPOSE 5000

USER node
CMD ["node", "server.js"]
