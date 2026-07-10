# Product Registration Database Migration Standard

## Background: Why Schema Drift Happened

Recently, we encountered a serious database schema drift issue where the backend code was identical on Local, Testing, and Production, but the application behaved differently because database schema changes were applied directly to the Production database (and developer local databases) without being properly reflected in `backend/database/migration.sql`. 

Because of this drift, the CI/CD pipeline executed `migration.sql` successfully, but the Testing database still missed several tables and columns, causing runtime failures. Examples included missing tables like `chat_attachments` and `email_verification_tokens`, as well as missing columns like `candidate_evaluation_forms.type`.

To ensure this **never happens again**, we are enforcing a strict database migration standard.

## Why `migration.sql` is Mandatory

The `migration.sql` file is the single source of truth for our database schema across all environments. If a schema change is not in this file, **it does not exist in the project**.

Our CI/CD pipeline relies on this file to synchronize the database schema before restarting the backend. If you bypass this file, you break the application for other developers and for the deployed environments.

## How CI/CD Works

1. The pipeline pulls the latest code.
2. It installs dependencies and builds the frontend.
3. It executes `psql -v ON_ERROR_STOP=1 -d product_registration -f database/migration.sql`.
4. If the migration script fails, **the deployment stops and immediately fails**. The backend will not restart, preventing code from running against an incompatible database.
5. If the migration succeeds, the backend is restarted.

This process applies identically to any branch (e.g., `main` or `testing`) that triggers the deployment pipeline.

## Developer Responsibilities

As a developer on this project, you must adhere to the following mandatory workflow for any database change:

1. **Update `migration.sql`**: Append your database schema changes to the end of `backend/database/migration.sql`.
2. **Ensure Idempotency**: Use `IF NOT EXISTS` for tables/columns and `OR REPLACE` for views/functions to ensure the script can run multiple times safely.
3. **Test the Migration**: Run the migration against a fresh or local database to ensure there are no syntax errors or conflicts.
4. **Commit Together**: Commit your backend code, frontend code, and `migration.sql` in the **same commit or Pull Request**.
5. **Never Modify Manually**: Do not manually modify the schema of Testing or Production databases. Everything must flow through `migration.sql`.

## Code Review & Release Checklist

Every Pull Request that affects PostgreSQL must satisfy the following checklist. Reviewers **must not approve** the PR unless every item is checked:

- [ ] Did you create/modify/drop a table?
- [ ] Did you add/remove columns?
- [ ] Did you modify indexes?
- [ ] Did you modify constraints?
- [ ] Did you update `migration.sql`?
- [ ] Can `migration.sql` run multiple times safely?
- [ ] Was `migration.sql` tested?
- [ ] Will CI/CD successfully apply this migration?
- [ ] Will a fresh database become identical to your local database?

## Best Practices

- **Chronological Order**: Always append new changes to the bottom of the file. Do not insert them in the middle, as this makes it harder to track changes.
- **Section Headers**: Use clear headers with the date and feature name. Example:
  ```sql
  -- ============================================================================
  -- 2026-07-10
  -- HR Recruitment
  -- Added Open Position JSON fields
  -- ============================================================================
  ALTER TABLE open_positions ADD COLUMN IF NOT EXISTS skills JSONB;
  ```
- **Idempotency is Key**: Always use `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`.

## Common Mistakes

- **"I'll add it later"**: Forgetting to include the SQL in the PR and breaking Testing.
- **Local Only**: Modifying your local database via an IDE (like DBeaver or TablePlus) and forgetting to copy the SQL to `migration.sql`.
- **Non-idempotent scripts**: Writing `ALTER TABLE x ADD COLUMN y;` which crashes the CI pipeline if it runs a second time.

## Database Troubleshooting

If the CI pipeline fails during the database migration step:
1. **Check the logs**: The pipeline will output the exact PostgreSQL error.
2. **Fix the script**: Usually, it's a syntax error or a missing `IF NOT EXISTS`.
3. **Do not force deploy**: Fix the SQL and push the fix. Do not manually apply it to the server to bypass the failure.
