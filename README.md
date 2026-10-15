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

## Sending real emails

Transfer confirmation codes and other notices are sent by `backend/src/config/mailer.js`.
By default (`MAIL_TRANSPORT=smtp` with `SMTP_HOST=mailpit`) every email is caught by
**Mailpit** and shown at http://localhost:8025. Nothing reaches a real inbox. All mail
settings live in the project's `.env`, which the backend container reads through
`env_file`. `.env` is git-ignored, so never put real passwords in `.env.example`.

When the backend starts, it checks the mail connection and logs one line:

```text
Mail: ready (smtp smtp.gmail.com:465 (TLS), from your.address@gmail.com).
Mail: NOT ready (smtp smtp.gmail.com:465 (TLS)): EAUTH 535 Invalid login: ...
```

Show it with `docker compose logs backend | grep Mail:`.

### Gmail (SMTP with an App Password)

1. Sign in to the Google account that will send the emails and open
   https://myaccount.google.com/security.
2. Turn on **2-Step Verification**. App Passwords are only available with it.
3. Open https://myaccount.google.com/apppasswords, enter a name (for example `MIMS`) and
   click **Create**. Copy the 16-letter password. Google shows it only once.
4. Put these values in `.env`:

   ```env
   MAIL_TRANSPORT=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your.address@gmail.com
   SMTP_PASS=abcdefghijklmnop        # the App Password, spaces removed
   MAIL_FROM=MIMS Bank <your.address@gmail.com>
   ```

   `MAIL_FROM` must use the same Gmail address as `SMTP_USER`. Otherwise Gmail rewrites
   the sender, or the mail is marked as spam.
5. Recreate the backend so it reads the new values, then send a test email:

   ```bash
   docker compose up -d --force-recreate backend
   docker compose logs backend | grep Mail:
   docker compose exec backend npm run mail:test -- someone@example.com
   ```

   The script prints `Sent.` or the provider's error, such as `EAUTH 535 Invalid login`
   (wrong App Password) or `ETIMEDOUT` (the host blocks SMTP ports; use the HTTP option
   below).
6. **Check the spam folder.** The first emails from a new sender often land there. Mark
   one as "Not spam".

### Switching back to Mailpit

```env
MAIL_TRANSPORT=smtp
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=MIMS <no-reply@mims.local>
```

Then run `docker compose up -d --force-recreate backend`.

### HTTP API (Brevo) for hosts that block SMTP

Some hosting providers block outgoing SMTP ports (25/465/587). In that case, send through
[Brevo](https://www.brevo.com)'s HTTP API on port 443. The free plan allows 300 emails a day.

1. Create a Brevo account. Under **Senders, domains & dedicated IPs → Senders**, add and
   verify the address you will send from.
2. Under **SMTP & API → API keys**, create an API key.
3. Put these values in `.env`:

   ```env
   MAIL_TRANSPORT=http
   MAIL_API_KEY=xkeysib-...
   MAIL_FROM=MIMS Bank <verified.sender@example.com>
   ```

   The `SMTP_*` values are ignored in this mode.
4. Recreate the backend and run `npm run mail:test` as above. A wrong key shows up as
   `unauthorized 401 Key not found`.

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