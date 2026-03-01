# Quizly: Quiz Platform

## Installation & Setup

Clone the repository

```bash
git clone https://github.com/KurenkovMaxgit/Meduzzen-quizly-backend.git
```

Navigate to the project directory

```bash
cd Meduzzen-quizly-backend
```

Install dependencies

```bash
npm install
```

Configure environment variables and edit with your configuration

```bash
cp .env.example .env
```

Run database containers

```bash
npm run db:dev:up
```

Start development server

```bash
npm run start:dev
```

## API Docs

[http://localhost:8080/api-docs](http://localhost:8080/api-docs)

## Testing

Run tests

```bash
npm run test
```

## Testing within Docker

Run script

```bash
npm run test:docker
```

## E2E Testing

Run script

```bash
npm run test:e2e
```

## Migrations

In development mode, schemas synchronize automatically upon running the application. However, for production environments, migrations are strictly required

### Generating migration

Use this command to create a new migration file based on your entity changes:

```bash
npm run migration:generate --name=<migration-name>
```

### Running migration

Executes all pending migrations against the database:

```bash
npm run migration:run
```

### Reverting migration

Rolls back the last executed migration:

```bash
npm run migration:revert
```
