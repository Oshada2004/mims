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

3. Open http://localhost:3000. The backend test endpoint is
	http://localhost:5000/api/test.

To access the MySQL database from the running container:

	```bash
	docker compose exec database mysql -u root -pabc123
	```

Stop the services with `docker compose down`. To also remove the database
volume and reset the database, use `docker compose down -v`.

## Folder Structure

```text
mims/
├── backend/          # Express API and Dockerfile
├── db/               # MySQL initialization script
├── frontend/         # React app and Dockerfile
├── docker-compose.yml
└── README.md
```

## Built So Far

- MySQL 8 database with a `connection_test` table.
- Express backend with CORS, environment configuration, and `/api/test`.
- React frontend that displays the database connection status.
- Docker Compose setup for database, backend, and frontend containers.
