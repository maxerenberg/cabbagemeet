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

To store the data files in memory (Linux only), create a folder under `/run`
and mount it with the `-v` flag:
```bash
mkdir -p ${XDG_RUNTIME_DIR:-/run/user/$UID}/cabbagemeet/mariadb
docker run ... -v ${XDG_RUNTIME_DIR:-/run/user/$UID}/cabbagemeet/mariadb:/var/lib/mysql:z mariadb
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
To disable this, set `SIGNUP_REQUIRES_EMAIL_VALIDATION = false` in .development.env.

In development mode, you can run a mock SMTP server in a new terminal window, which
will listen on `localhost:8025`:
```bash
npm run smtp
```

In development mode, whenever the server generates a verification code or link,
it will print it to stdout after sending it via email.

## Redis
If you are running multiple instances of the application, and a user could be directed
to any of them (e.g. round-robin load balancing), then Redis must be used to avoid cache
incoherency between the instances. For example, with Docker:
```bash
docker run -d --name cabbagemeet-redis -p 127.0.0.1:6379:6379 redis
```

Then set the following environment variables:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

If you are using an existing Redis server and would like to use a different
database number (0-15), you can specify that too, e.g.
```
REDIS_DATABASE=1
```

### Connecting to Redis
```bash
docker exec -it cabbagemeet-redis redis-cli
```

### Flushing the database
```
127.0.0.1:6379> FLUSHDB
OK
127.0.0.1:6379> SCRIPT FLUSH
OK
```

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

## Modifying the public API
If you modify the public API (e.g. add a new endpoint, modify the request
parameters of an existing endpoint), you must regenerate the RTK Query hooks
for the frontend:
```bash
cd ../client
wget -O openapi.json localhost:3001/swagger-json
npx @rtk-query/codegen-openapi openapi-config.ts
```

## Migrations
If you add/remove/modify any of the entity classes, you will need to create a new database migration.
To do this, you need to first run the existing migrations on a new empty database, then generate a new migration from that one using the entity classes.

First, create a timestamp which we will use as the migration name for each database type:
```bash
# use gdate on MacOS (brew install coreutils)
timestamp=$(date +%s)
```

### SQLite
```bash
# Assuming temp.db does not exist
export SQLITE_PATH=temp.db
npm run migration:run:sqlite
npm run migration:generate:sqlite -- -t $timestamp
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
npm run migration:generate:mariadb -- -t $timestamp
# Remove or replace instances of "temp" from the generated migration script
sed -i 's/\\`temp\\`\.//g' migrations/mariadb/$timestamp-Migration.js
sed -i '/^ *async \(up\|down\)(queryRunner) {$/a const { dbname } = (await queryRunner.query("SELECT DATABASE() AS `dbname`"))[0];' migrations/mariadb/$timestamp-Migration.js
sed -i 's/"temp"/dbname/g' migrations/mariadb/$timestamp-Migration.js
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
npm run migration:generate:postgres -- -t $timestamp
# Cleanup
echo 'DROP DATABASE temp; \q' | docker exec -it cabbagemeet-postgres psql -U cabbagemeet postgres
```

## Support
Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
