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
DATABASE_TYPE=mariadb
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

To drop the current database and create a new one (stop the app process first):
```bash
docker exec -it cabbagemeet-mariadb mariadb -uroot -e "DROP DATABASE cabbagemeet; CREATE DATABASE cabbagemeet; GRANT ALL PRIVILEGES ON cabbagemeet.* TO cabbagemeet;"
```

### Postgres
```bash
docker run -d --name cabbagemeet-postgres -e POSTGRES_USER=cabbagemeet -e POSTGRES_PASSWORD=cabbagemeet -p 127.0.0.1:5432:5432 postgres
```

Now open development.env and modify/set the following variables:
```
DATABASE_TYPE=postgres
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=cabbagemeet
POSTGRES_PASSWORD=cabbagemeet
POSTGRES_DATABASE=cabbagemeet
```

To connect to the database:
```bash
docker exec -it cabbagemeet-postgres psql -U cabbagemeet
```

To drop the current database and create a new one (stop the app process first):
```bash
echo 'DROP DATABASE cabbagemeet; CREATE DATABASE cabbagemeet; \q' | docker exec -it cabbagemeet-postgres psql -U cabbagemeet postgres
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

## Migrations
If you add/remove/modify any of the entity classes, you will need to create a new database migration.
To do this, you need to first run the existing migrations on a new empty database, then generate a new migration from that one using the entity classes.

For example, for SQLite:
```bash
# Assuming temp.db does not exist
export SQLITE_PATH=temp.db
npm run migration:run:sqlite
npm run migration:generate:sqlite
# Cleanup
rm temp.db
```

### MariaDB
```bash
# Create a new empty database in the container
docker exec -it cabbagemeet-mariadb mariadb -uroot -e "CREATE DATABASE temp; GRANT ALL PRIVILEGES ON temp.* TO cabbagemeet;"
export MYSQL_DATABASE=temp
export MYSQL_USER=cabbagemeet
export MYSQL_PASSWORD=cabbagemeet
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
npm run migration:run:mariadb
npm run migration:generate:mariadb
# Cleanup
docker exec -it cabbagemeet-mariadb mariadb -uroot -e "DROP DATABASE temp"
```

### Postgres
```bash
# Create a new empty database in the container
docker exec -it cabbagemeet-postgres psql -U cabbagemeet postgres -c "CREATE DATABASE temp"
export POSTGRES_DATABASE=temp
export POSTGRES_USER=cabbagemeet
export POSTGRES_PASSWORD=cabbagemeet
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432
npm run migration:run:postgres
npm run migration:generate:postgres
# Cleanup
echo 'DROP DATABASE temp; \q' | docker exec -it cabbagemeet-postgres psql -U cabbagemeet postgres
```

## Support
Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
