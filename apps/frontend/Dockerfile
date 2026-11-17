# Build context is the repository root (see deployments/compose.yml): the npm
# workspace lock file lives there. The root .dockerignore keeps the context
# small.
FROM node:22-alpine AS build

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace apps/frontend --include-workspace-root=false

COPY apps/frontend apps/frontend
# MOCK=true builds an image that serves canned controller responses. Default
# true since the gRPC-Web proxy was removed (2026-11-17): the current frontend
# cannot reach the controller until phase 10 moves it onto the backend API.
ARG MOCK=true
RUN MOCK=$MOCK npm --workspace apps/frontend run build

FROM nginx:1.27-alpine

# Exports NGINX_LOCAL_RESOLVERS, used by the template to resolve the upstreams
# at request time.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
# Upstream substituted into the nginx template at start; the image works
# without compose setting it. Override at run time.
ENV API_BASE_URL=http://api:8000

COPY deployments/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
