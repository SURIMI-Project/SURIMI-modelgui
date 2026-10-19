FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# MOCK=true builds an image that serves canned controller responses.
ARG MOCK=false
RUN MOCK=$MOCK npm run build

FROM nginx:1.27-alpine

# Exports NGINX_LOCAL_RESOLVERS, used by the template to resolve the controller
# upstream at request time.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
