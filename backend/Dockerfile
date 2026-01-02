FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install -g nest && yarn install

COPY . .
RUN yarn build 

EXPOSE 3002
CMD ["yarn", "start"]
