# CabbageMeet client

This directory contains the frontend source code for the CabbageMeet application.
It was created with [Create-React-App](https://create-react-app.dev).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## E2E tests (Playwright)
### Dependencies
If you are going to use your computer's existing Chromium installation, you
don't need to install a Playwright-bundled browser (this needs to be the
latest Chromium version, though).

Otherwise, you need to install the Playwright browser(s) separately:
```bash
# Or chromium, webkit, etc.
# Omit the browser argument to install all browsers listed in playwright.config.ts
# Run `npx playwright install --help` to see all options
sudo npx playwright install --with-deps firefox

# Or, to just download the browser without the system dependencies
npx playwright install firefox
```

See https://playwright.dev/docs/cli#install-system-dependencies for details.

### Running the servers
#### Frontend
You can either start the Create-React-App server separately, or build the
static files and serve those from NestJS.

Option 1: start the Create-React-App server
```bash
# The NestJS server will listen on this port
export PROXY_PORT=3002
# The Create-React-App server will listen on this port
export PORT=3003
npm start
```

Option 2: use a static React build
```bash
npm run build
cd ../server
ln -sf ../client/build client
```

#### Backend
```bash
cd ../server
# You can also place these env variables in a .env file
export DATABASE_TYPE=sqlite
export SQLITE_PATH=:memory:
export PORT=3002
export VERIFY_SIGNUP_EMAIL_ADDRESS=false
# Use http://localhost:3002 if using a static React build
export PUBLIC_URL=http://localhost:3003
npm run build
npm run start:prod
```

### Run tests locally
```bash
npm run test:e2e:cr
```

### Run tests remotely with local browser
On the computer which will run the browser, run
```bash
# If unset, default is chromium
export BROWSER=firefox
# Set HEADLESS=true to run tests headlessly (default: false)
# Set PORT=<number> to run the websocket on a specific port (default: random)
tests/server.js
```

To use your system's existing chromium installation:
```bash
export BROWSER=chromium
export BROWSER_PATH=/usr/bin/chromium
tests/server.js
```

Make note of the port number which is printed on the command line, and
create an SSH reverse port forwarding, e.g.
```bash
# Replace 39671 with the actual port number
ssh -R 39671:localhost:39671 user@server
```

If you haven't done so already, make sure that you also forward port
3003 (if running the Create-React-App server, otherwise port 3002 if serving
the static build from NestJS) from your local machine to the server, via the
flag `-L 3003:localhost:3003`.

Now on the server, set the environment variable WS_ENDPOINT to the URL
which was printed earlier, then start the tests, e.g.
```bash
export WS_ENDPOINT=ws://127.0.0.1:39671/1234567890abcdef
npm run test:e2e:cr
```
