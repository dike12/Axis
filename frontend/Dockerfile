# build the base image
FROM node:20-alpine AS base
WORKDIR /opt/app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

# create dev image for local development 
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# build the project, get it ready for prod
FROM base AS build
RUN npm run build

# prod stage, move the built project files into nginx to be served in prod
FROM nginx:alpine AS prod
COPY --from=build /opt/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]