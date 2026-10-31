FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9640

CMD ["npm", "start"]
