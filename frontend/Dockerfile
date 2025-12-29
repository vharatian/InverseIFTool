FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install -g vite && yarn install

COPY . .
ENV VITE_API_BASE_URL=/api
RUN yarn build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
