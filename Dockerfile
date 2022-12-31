FROM node:18-alpine
WORKDIR /app
COPY ["client/package.json", \
      "client/package-lock.json", \
      "client/tsconfig.json", \
      "client/"]
RUN cd client && npm install --omit=dev
COPY client/src client/src/
COPY client/public client/public/
RUN find client/src -name "*.test.tsx" -delete && rm client/src/test-utils.tsx
ARG REACT_APP_API_BASE_URL=/
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN cd client && npm run build
COPY ["server/package.json", \
      "server/package-lock.json", \
      "server/tsconfig.json", \
      "server/tsconfig.build.json", \
      "server/tsconfig.build.json", \
      "server/nest-cli.json", \
      "server/"]
RUN cd server && npm install
COPY server/src server/src/
COPY server/migrations server/migrations/
RUN find server/src -name "*.spec.ts" -delete
RUN cd server && npm run build
RUN cd server && npm uninstall $(node -e "const fs = require('fs'); const cfg = JSON.parse(fs.readFileSync('package.json',{encoding:'utf-8'})); for (const dep of Object.keys(cfg.devDependencies)) console.log(dep);")

FROM node:18-alpine
WORKDIR /app
COPY --from=0 /app/server/dist dist/
COPY --from=0 /app/server/node_modules node_modules/
COPY --from=0 /app/client/build client/
ENV NODE_ENV=production
CMD ["node", "dist/src/main"]
