## Description
This directory contains the source code for the server component of CabbageMeet.

## Installation
```bash
$ npm install
```

## Database setup
In development mode, by default a SQLite database will be used (filename is `development.db`).
This requires no setup. To use a different database, follow the instructions below.

### MariaDB
**Note**: Do not set `MARIADB_ALLOW_EMPTY_ROOT_PASSWORD` if you are running this in production.
```bash
docker run -d --name cabbagemeet-mariadb -e MARIADB_USER=cabbagemeet -e MARIADB_PASSWORD=cabbagemeet -e MARIADB_DATABASE=cabbagemeet -e MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=yes -p 127.0.0.1:3306:3306 mariadb
```

Now open development.env and modify/set the following variables:
```
DATABASE_TYPE=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=cabbagemeet
MYSQL_PASSWORD=cabbagemeet
MYSQL_DATABASE=cabbagemeet
```

To connect to the database:
```bash
docker exec -it cabbagemeet-mariadb mariadb -ucabbagemeet -pcabbagemeet cabbagemeet
```

To connect to the database as root:
```bash
docker exec -it cabbagemeet-mariadb mariadb -uroot
```

## Running the SMTP server
By default, email address verification is enabled, even in development mode.
To disable this, set `SIGNUP_REQUIRES_EMAIL_VALIDATION = false` in development.env.

In development mode, you can run a mock SMTP server in a new terminal window, which
will listen on `localhost:8025`:
```bash
npm run smtp
```

In development mode, whenever the server generates a verification code or link,
it will print it to stdout after sending it via email.

## Running the app
```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test
```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support
Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
