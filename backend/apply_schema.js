const db = require('./src/config/db');

async function applySchema() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS hr_conversion_requests (
                request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                intern_id UUID REFERENCES hr_interns(intern_id) ON DELETE CASCADE,
                trainee_id UUID REFERENCES hr_trainees(trainee_id) ON DELETE CASCADE,
                target_role VARCHAR(50) NOT NULL,
                payload JSONB,
                status VARCHAR(50) DEFAULT 'Pending',
                certificate_url TEXT,
                requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
                approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Schema applied successfully.");
    } catch (e) {
        console.error("Error applying schema:", e);
    } finally {
        process.exit();
    }
}
applySchema();
