import type { ConfigFile } from '@rtk-query/codegen-openapi';

/*
See https://redux-toolkit.js.org/rtk-query/usage/code-generation
To generate the code, run:
```
wget -O openapi.json localhost:3001/swagger-json
npx @rtk-query/codegen-openapi openapi-config.ts
```
*/

const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/slices/emptyApi.ts',
  apiImport: 'emptyApi',
  outputFile: './src/slices/api.ts',
  exportName: 'api',
  hooks: true,
  flattenArg: true,
};

export default config;
