FROM node:20 as build
WORKDIR /app
COPY nest-cli.json tsconfig*.json package*.json ./
COPY migrations ./migrations
COPY src ./src
RUN npm install
RUN find src -name "*.spec.ts" -delete
RUN npm run build
RUN npm uninstall $(node -e "const fs = require('fs'); const cfg = JSON.parse(fs.readFileSync('package.json',{encoding:'utf-8'})); for (const dep of Object.keys(cfg.devDependencies)) console.log(dep);")

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
CMD ["npm", "run", "start:prod"]
