<p align="center">
  <img src="./client/public/logo192.png" width="120" alt="CabbageMeet logo" />
</p>

<p align="center">An online application for scheduling group meetings</p>

## Description
CabbageMeet aims to be an open-source alternative to [LettuceMeet](https://lettucemeet.com). It is a web-based application for scheduling meetings between two or more people.

Meeting respondents can submit their availabilities by clicking or dragging
their available times on a grid, making it easier to see the times at which
most people are available. Respondents can get notified via email when
a meeting is scheduled.

Google/Outlook calendar integration is also supported, so an event can be
created on your personal calendar when a meeting is scheduled.

## Running in development mode
### Backend
```bash
cd server
# Will listen on port 3001 by default, change PORT in .development.env to
# change this
npm start

# Open a new terminal window
# The mock SMTP server is needed for signup email verification
# Set VERIFY_SIGNUP_EMAIL_ADDRESS=false in .development.env to disable it
cd server
scripts/mockSmtpServer.js
```

### Frontend
```bash
# Start the React app
cd client
# Will listen on port 3000 by default and proxy API requests to port 3001
# Set the environment variables PORT and PROXY_PORT to change this
npm start
```

## Running in production mode
```bash
# Create a static build
cd client
npm run build

cd ../server
# Create a symlink to the static build folder
ln -sf ../client/build client
npm run build
# Set any necessary environment variables
# See the server README for more details
vim .env
# Start the app
npm run start:prod
```
