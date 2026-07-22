---
name: rngo-system-inference
description: Create a system definition YAML files under .rngo/systems/ for each stateful interface (database, file system, object storage, SaaS platform, etc.) in a repository, for the rngo CLI.
---

# rngo System Inference Skill

Your job is to create one **system definition file** for every **system** in this repository.

## System

A **system** is where an application maintains persistent state. Systems can be:

- databases (SQLite, PostgreSQL, MySQL, etc.)
- file systems
- object storage
- SaaS platforms

### Naming

A **system** should be uniquely named using lower kebab-case, and should be as direct as possible. If an application has a single database, it should be named `database` or `db`. If an application uses both PostgreSQL and Redis, there should be a system named `postgres` and a system named `redis`.

## System Definition File

A **system definition file** is a YAML that defines a **system** and lives under `.rngo/systems/`. Each file's extension MUST BE `.yml` and should NEVER BE `.yaml`.

The name of each file should match the name of the system it defines. For example:

- a system named `database` should have a definition file at `.rngo/systems/database.yaml`
- a system named `redis` should have a definition file at `.rngo/systems/redis.yaml`

### Format

A system definition file may contain a top-level `format` key that defines how it expects data to be formatted for import. For example:

```yaml
format:
  type: sql
```

```yaml
format:
  type: json
```

If `format` is not specified, the system will default to the `json` format.

### Import

A system definition file must contain an `import` top-level key, with a `command` sub-key. The `command` sub-key specifies the shell command to execute for data import. The CLI will pipe simulation events to this command's stdin. For example:

```yaml
import:
  command: sqlite3 db.sqlite
```

```yaml
import:
  command: PGPASSWORD='secret' psql -h localhost -U app -d app
```

You may also add a `before` sub-key. This command will be executed exactly once, before the first event is sent to `command`. For example:

```yaml
import:
  before: rm db.sqlite && sqlite3 db.sqlite < schema.sql
  command: sqlite3 db.sqlite
```

### Infer

A system definition file must contain an `infer` top-level key, with a `context` sub-key. The `context` sub-key must contain a `command` that outputs a schema or interface definition for the system, along with a `description` field. This data will be used by an LLM to infer the system's **entities**, which correspond to a systems's tables, relations, endpoints, buckets, collections, etc. For example:

```yaml
infer:
  context:
    description: schema migration file
    command: cat ./schema.sql
```

```yaml
infer:
  context:
    description: pgdump output
    command: PGPASSWORD='secret' pg_dump --schema-only -h localhost -U app -d app
```

## System Definition Examples

### SQLite System

**File: `.rngo/systems/sqlite.yml`**

```yaml
format:
  type: sql
import:
  before: sqlite3 db.sqlite "DELETE FROM users;"
  command: sqlite3 db.sqlite
infer:
  context:
    description: schema migration file
    command: sqlite3 db.sqlite '.schema'
```

### PostgreSQL System

**File: `.rngo/systems/postgres.yml`**

```yaml
format:
  type: sql
import:
  before: psql postgresql://user:pass@localhost:5432/dbname -c "TRUNCATE TABLE users CASCADE;"
  command: psql postgresql://user:pass@localhost:5432/dbname
infer:
  context:
    description: pg_dump output
    command: pg_dump postgresql://user:pass@localhost:5432/dbname
```

### MySQL System

**File: `.rngo/systems/mysql.yml`**

```yaml
format:
  type: sql
import:
  command: mysql -u root -p password dbname
infer:
  context:
    description: mysqldump output
    command: mysqldump -h localhost -u root -p --no-data dbname > schema.sql
```

### File System (JSON)

**File: `.rngo/systems/fs.yml`**

```yaml
format:
  type: json
import:
  command: jq -s '.' > data/output.json
infer:
  context:
    description: json schema
    command: cat schema.jsonl
```

### MongoDB System

**File: `.rngo/systems/mongodb.yml`**

```yaml
format:
  type: json
import:
  command: mongoimport --db mydb --collection users --jsonArray
infer:
  context:
    description: user json schema
    command: cat user.json
```

### S3/Object Storage System

**File: `.rngo/systems/s3.yml`**

```yaml
format:
  type: json
import:
  command: aws s3 cp - s3://my-bucket/data.json
infer:
  context:
    description: json schema
    command: cat schema.json
```

## Inference Context Configuration (Optional)

Systems can provide context for LLM-based entity inference by including an `infer.context` section:

**File: `.rngo/systems/sqlite.yml`**

```yaml
format:
  type: sql
import:
  command: sqlite3 db.sqlite
infer:
  context:
    description: sqlite schema
    command: sqlite3 db.sqlite '.schema'
```

When `rngo infer prompt` is run, the CLI will:

1. Execute the `infer.context.command`
2. Include the output in the inference prompt
3. Instruct the LLM to create entities based on this context
4. Automatically associate inferred entities with this system

**Inference Context Fields:**

- `description`: Human-readable description of what the context contains
- `command`: Shell command to execute to retrieve context information

**Common Inference Context Examples:**

PostgreSQL schema:

```yaml
infer:
  context:
    description: postgres schema
    command: psql postgresql://localhost/db -c '\d+'
```

Migration files:

```yaml
infer:
  context:
    description: database migrations
    command: cat db/migrations/*.sql
```

ORM models:

```yaml
infer:
  context:
    description: TypeScript database models
    command: cat src/models/*.ts
```

## System Inference Best Practices

### 1. Identify Data Persistence Points

Look for:

- Database connections and configuration files
- ORM/query builder usage (Drizzle, Prisma, TypeORM, etc.)
- File I/O operations that persist state
- API calls to external services

### 2. Create One System Per Backend

Each distinct data storage backend should have its own system definition:

- Separate system for SQLite vs PostgreSQL
- Separate system for primary DB vs cache
- Separate system for different file storage locations

### 3. Choose the Correct Format

**Use `type: sql` for:**

- PostgreSQL, MySQL, SQLite, SQL Server, Oracle
- Any database that accepts SQL INSERT statements

**Use `type: json` for:**

- MongoDB, DynamoDB, Firebase
- File storage systems
- REST APIs
- Any system that accepts JSON data

### 4. Construct Appropriate Import Commands

**For databases with authentication:**

```yaml
command: psql postgresql://user:password@host:port/database
```

**For local databases:**

```yaml
command: sqlite3 path/to/database.db
```

**For piping to files:**

```yaml
command: cat > output/data.json
```

### 5. Use before/after for Data Preparation

**Truncate tables before import:**

```yaml
before: psql postgresql://localhost/db -c "TRUNCATE TABLE users;"
```

**Drop and recreate tables:**

```yaml
before: sqlite3 db.sqlite "DROP TABLE IF EXISTS users; CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"
```

## Common Patterns by Technology Stack

### Rails/ActiveRecord + PostgreSQL

**System: `.rngo/systems/postgres.yml`**

```yaml
format:
  type: sql
import:
  command: psql postgresql://localhost/myapp_development
infer:
  context:
    description: rails schema
    command: cat db/schema.rb
```

### Node.js + Drizzle + SQLite

**System: `.rngo/systems/sqlite.yml`**

```yaml
format:
  type: sql
import:
  command: sqlite3 db/app.db
infer:
  context:
    description: drizzle schema
    command: cat src/db/schema.ts
```

### Django + PostgreSQL

**System: `.rngo/systems/postgres.yml`**

```yaml
format:
  type: sql
import:
  command: psql postgresql://localhost/django_db
infer:
  context:
    description: django models
    command: find . -name 'models.py' -exec cat {} \;
```

### Express + MongoDB

**System: `.rngo/systems/mongodb.yml`**

```yaml
format:
  type: json
import:
  command: mongoimport --db myapp --collection users --jsonArray
infer:
  context:
    description: mongoose schemas
    command: cat src/models/*.js
```

## Summary

To set up a system:

1. **Create a file** in `.rngo/systems/[name].yml`
2. **Define format**: Choose `json` or `sql` based on the backend
3. **Configure import**: Specify the command to receive piped data
4. **Add before/after** (optional): Include setup/cleanup commands
5. **Configure inference** (optional): Provide context for entity generation
