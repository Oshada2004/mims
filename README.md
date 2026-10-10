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

   This starts MySQL, Flyway migrations/seeds, the backend, and the Vite
   frontend. You do not need to install dependencies locally or start either JavaScript
   service separately. The frontend installs its Linux-native optional
   dependencies when the container starts.

3. Flyway automatically applies pending migrations from `db/migrations`.
   Open http://localhost:5173. The backend API is available at
	http://localhost:5000.

To access the MySQL database from the running container:

	```bash
	docker compose exec database mysql -u root -pabc123
	```

docker compose down -v && \
docker compose up -d database && \
docker compose exec database sh -c 'until mysql -u root -pabc123 -e "USE mims_db;" >/dev/null 2>&1; do sleep 2; done' && \
docker compose run --rm flyway migrate -locations=filesystem:/flyway/sql/migrations,filesystem:/flyway/sql/seeds


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

Backend Setup
Navigate to the backend directory:

```Bash
cd backend
```
Install dependencies:

```Bash
npm install
```
Create a .env file in backend/:

```Code snippet
PORT=8080
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mims_db
```
Start the Express backend server:

```Bash
npm start
# or for development mode:
node src/index.js
```

Frontend Setup
Open a new terminal tab and navigate to the frontend directory:

```bash
cd frontend
```
Install dependencies:

```Bash
npm install
```
Create a .env file in frontend/:

Code snippet
VITE_API_URL=http://localhost:8080/api
Start the Vite development server:

```Bash
npm run dev
```
Open http://localhost:5173 in your browser.

Testing API Endpoints via CLI (curl)
Once the backend is running, test the single-step endpoints directly using curl:

1. Full User Registration (Creates Person + Profile + Auth Credentials)
```Bash
curl -X POST "http://localhost:8080/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "()",
    "last_name": "()",
    "dob": "2000-01-01",
    "nic": "200012345678",
    "phone_number": "0771234567",
    "address": "Katubedda, Moratuwa",
    "postal_code": "10400",
    "email": "()@gmail.com",
    "username": "()",
    "password": "()",
    "user_role": "ADMIN",
    "branch_id": 1,
    "department": "IT",
    "salary": 150000.00
  }'
  ```
User Authentication (Login)
```Bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "lasith_admin",
    "password": "Password123!"
  }'
```