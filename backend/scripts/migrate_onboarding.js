const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration' });
    await client.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS hr_onboarding (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'Pending',
                offer_acceptance_date DATE,
                document_checklist JSONB DEFAULT '[]'::jsonb,
                asset_checklist JSONB DEFAULT '[]'::jsonb,
                training_checklist JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS hr_offboarding (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'Resignation Submitted',
                resignation_date DATE,
                last_working_day DATE,
                exit_interview_notes TEXT,
                clearance_checklist JSONB DEFAULT '[]'::jsonb,
                asset_recovery_checklist JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Tables created!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
