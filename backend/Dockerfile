FROM node:20-alpine

WORKDIR /app

COPY package*.json yarn.lock ./
RUN npm install -g nest && yarn install

COPY . .
RUN yarn build && yarn seed

EXPOSE 3002
CMD ["yarn", "start"]
