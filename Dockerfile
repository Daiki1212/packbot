FROM node:24-bookworm-slim AS build

WORKDIR /app

# purposefully no lock file
# every image gets the newest allowed versions
# from the package.json
COPY package.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Delete Dev Dependencies after build.
# no second npm install
RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]