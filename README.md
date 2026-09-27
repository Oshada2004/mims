# MIMS

MIMS is a Docker-based MySQL, Express, and React application. It currently
provides a basic database connection check.

## Setup with Docker

1. Create a `.env` file in the project root:

	```env
	DB_HOST=database
    DB_PORT=3306
    DB_NAME=mims_db
    DB_USER=user
    DB_PASSWORD=abc123
    DB_ROOT_PASSWORD=abc123
    PORT=5000
	```

2. Build and start the services:
	run the docker desktop in the local machine 
	```bash
	docker compose up --build
	```

3. Flyway automatically applies pending migrations from `db/migrations`.
   Open http://localhost:3000. The backend test endpoint is
	http://localhost:5000/api/test.

To access the MySQL database from the running container:

	```bash
	docker compose exec database mysql -u root -pabc123
	```

Stop the services with `docker compose down`. To also remove the database
volume and reset the database, use `docker compose down -v`.

## Database migrations

Create a new migration for every schema change. Use the next version number
and commit the file to Git, for example:

```text
db/migrations/V2__create_users.sql
```

Flyway runs pending migrations before the backend starts and records applied
migrations in the `flyway_schema_history` table. Never edit a migration that
has already been applied; add a new migration instead.

To run migrations without starting the frontend and backend:

```bash
docker compose up database flyway
```

## Folder Structure

```text
mims/
├── backend/          # Express API and Dockerfile
├── db/migrations/    # Versioned Flyway SQL migrations
├── frontend/         # React app and Dockerfile
├── docker-compose.yml
└── README.md
```

## Built So Far

- MySQL 8 database with a `connection_test` table.
- Express backend with CORS, environment configuration, and `/api/test`.
- React frontend that displays the database connection status.
- Docker Compose setup for database, backend, and frontend containers.
