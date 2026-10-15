# BTrust - Banking Information Management System (MIMS)

BTrust (MIMS) is a comprehensive, full-stack banking information management web application engineered to streamline core banking operations. Built with a React (Vite) frontend, an Express.js backend and a MySQL database managed with Flyway migrations, the platform delivers secure, role-based workflows for Administrators, Staff and Customers.

Key features include:
- **Role-Based Portals**: Dedicated dashboards and permissions for Administrators, Bank Staff and Customers.
- **Account Management**: Seamless creation and servicing of Savings and Joint accounts with tier-based interest rates.
- **Fixed Deposits**: Term deposit creation, automated unique ID generation, compounding interest calculations, batch payout scheduling and early closure workflows.
- **Transactions & Transfers**: Real-time account-to-account money transfers, deposits, withdrawals and immutable transaction audit logs.
- **Automated Banking Processes**: Automated interest calculation, batch payouts, maturity settlement schedules and cron-driven operations.
- **Analytics & Reporting**: Comprehensive administrative reporting for customer summaries, active fixed deposits and transaction trends.

---

## 🌐 Live Deployments & Hosting

| Component | Platform | URL / Connection |
| :--- | :--- | :--- |
| **Frontend** | Vercel | [https://btrust-gamma.vercel.app/](https://btrust-gamma.vercel.app/) |
| **Backend** | Google Cloud Run | [https://mims-887119333354.europe-west1.run.app](https://mims-887119333354.europe-west1.run.app) |
| **Database** | Google Cloud SQL (MySQL) | `project-686d811c-c8dd-41e9-8b8:us-east1:mims-mysql-instance` |

---

## 👥 Team Members & Contributions

### JAYASINGHE O.D. (240279C)
- Database schema design for user profiles and transaction logging.
- Designed database stored procedures, triggers and functions necessary for profile creation and transaction logging.
- Developed reusable frontend UI components.

### KARIYAWASAM T.S. (240322E)
- Assisted with database integration and authorization, database indexing and validation of data exchanged between application modules.
- Contributed to backend integration and coordination between routes, controllers and database operations.
- Supported API integration, session logout and testing across application modules.
- Developed and integrated frontend pages and reusable components.
- Connected frontend interfaces with backend APIs and handled application data and responses.

### NIRMALI H.M.U. (240468F)
- Designed and implemented bank account database procedures (Savings, Joint accounts).
- Implemented report generation backend logic.
- Implemented interest calculation procedures for savings accounts, batch payouts and automatic scheduling.
- Implemented account-to-account transaction procedures.
- Created the necessary routes and controllers for the implemented procedures and functions.
- Developed relevant frontend pages and workflows.

### RATHNAPALA J.L.E. (240558G)
- Designed the database schema for authentication.
- Worked on authentication-related database operations and password hashing.
- Implemented authentication and authorization functionality across the system.
- Integrated login, session validation, access control and password reset operations with database procedures.

### RATHNAYAKE T.S. (240568L)
- Designed fixed deposit creation and unique ID generation procedures.
- Implemented fixed deposit early closure procedures.
- Implemented interest calculation, batch payouts, maturity settlement and automatic scheduling.
- Implemented active fixed deposit reporting.
- Created the necessary routes and controllers for the implemented procedures and functions.
- Developed relevant frontend pages and components.

---

## 📂 Project Structure

```text
mims/
├── backend/          # Express API server, routes, controllers and Dockerfile
├── db/migrations/    # Versioned Flyway SQL migrations and stored procedures
├── frontend/         # React (Vite) application, components and Dockerfile
├── docker-compose.yml# Multi-container orchestration (MySQL, Backend, Frontend, Flyway)
└── README.md
```

---

## 🚀 Setup & Local Development

### 1. Using Docker Compose (Recommended)

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
   ```bash
   docker compose up --build
   ```
   This will spin up:
   - **MySQL 8** database container
   - **Flyway** running database migrations and seeds from `db/migrations`
   - **Express Backend** at `http://localhost:5000`
   - **React (Vite) Frontend** at `http://localhost:5173`

3. To access the MySQL database from the running container:
   ```bash
   docker compose exec database mysql -u root -pabc123
   ```

4. Resetting the database and applying migrations:
   ```bash
   docker compose down -v && \
   docker compose up -d database && \
   docker compose exec database sh -c 'until mysql -u root -pabc123 -e "USE mims_db;" >/dev/null 2>&1; do sleep 2; done' && \
   docker compose run --rm flyway migrate -locations=filesystem:/flyway/sql/migrations,filesystem:/flyway/sql/seeds
   ```

5. Stop the containers:
   ```bash
   docker compose down
   ```
   *(Add `-v` to also remove volumes and reset the database).*

---

### 2. Manual Setup (Without Docker)

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `backend/`:
   ```env
   PORT=8080
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mims_db
   ```
4. Start the backend server:
   ```bash
   npm start
   # or development mode:
   node src/index.js
   ```

#### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `frontend/`:
   ```env
   VITE_API_URL=http://localhost:8080/api
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Migrations

Versioned SQL migrations are located in `db/migrations/`.

- When adding schema changes, create a new file following the naming convention: `db/migrations/V<number>__<description>.sql`
- Flyway automatically applies pending migrations before services start and maintains a schema history in `flyway_schema_history`.
- To execute migrations independently with Docker:
  ```bash
  docker compose up database flyway
  ```

---

## 🧪 Testing API Endpoints via CLI (curl)

Once the backend is running, test authentication endpoints directly using curl:

### 1. User Registration (Person + Profile + Auth Credentials)
```bash
curl -X POST "http://localhost:8080/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "dob": "2000-01-01",
    "nic": "200012345678",
    "phone_number": "0771234567",
    "address": "Katubedda, Moratuwa",
    "postal_code": "10400",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "password": "Password123!",
    "user_role": "ADMIN",
    "branch_id": 1,
    "department": "IT",
    "salary": 150000.00
  }'
```

### 2. User Authentication (Login)
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "lasith_admin",
    "password": "Password123!"
  }'
```
