---
name: Database Policy
description: Mandatory rules for database schema changes in the Product Registration project. Must be followed whenever database schemas are modified.
---

# Product Registration - Mandatory Database Change Policy

## Background
Our CI/CD pipeline automatically deploys frontend and backend code and executes `backend/database/migration.sql` on Testing, UAT, and future environments.
If database schema changes exist in the Main database but are not present in `migration.sql`, the application will fail on deployment.

## Mandatory Rule
Every single database schema change MUST be added to `backend/database/migration.sql` before any code is pushed.

### What Counts as a Schema Change?
- CREATE TABLE
- ALTER TABLE
- DROP TABLE
- ADD COLUMN
- MODIFY COLUMN
- DROP COLUMN
- CREATE INDEX
- CREATE VIEW
- CREATE FUNCTION
- CREATE TRIGGER
- CREATE CONSTRAINT
- Foreign Keys
- Unique Constraints
- Sequences
- Default Values

### Required Workflow
1. Implement and test the feature.
2. If any database schema change was made, **immediately append the same SQL** to `backend/database/migration.sql`.
3. Verify that a fresh environment can be updated using only `migration.sql`.
4. Commit Frontend changes, Backend changes, and `migration.sql` changes.
5. Push to Testing or Main.

### Definition of Done
A feature is NOT complete unless:
- [x] Frontend code is committed
- [x] Backend code is committed
- [x] All database schema changes are appended to `migration.sql`

*If migration.sql is not updated, the feature is considered incomplete even if it works on the Main database.*

### ALWAYS
- Add every schema change to `migration.sql`
- Keep `migration.sql` idempotent wherever possible (`IF NOT EXISTS`, etc.)
- Test `migration.sql` before pushing
- Commit schema and migration together
- Ensure Local, Testing, UAT and Production remain identical

### NEVER
- Create tables manually on Production
- Create tables manually on Testing
- Modify Production schema directly
- Modify only your local database
- Forget `migration.sql`
- Merge schema changes without `migration.sql`
- Assume another developer already added the migration
