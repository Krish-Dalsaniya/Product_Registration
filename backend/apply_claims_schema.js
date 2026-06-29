const db = require('./src/config/db');

async function applyMigrations() {
    const claimsSchema = `
        CREATE TABLE IF NOT EXISTS hr_claims (
            claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
            claim_type VARCHAR(50) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            description TEXT,
            receipt_url VARCHAR(512),
            status VARCHAR(20) DEFAULT 'Pending',
            submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
            approved_date TIMESTAMP,
            remarks TEXT
        );
    `;

    const advancesSchema = `
        CREATE TABLE IF NOT EXISTS hr_advances (
            advance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
            amount DECIMAL(12,2) NOT NULL,
            reason TEXT,
            repayment_term_months INT NOT NULL,
            monthly_deduction DECIMAL(12,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'Pending',
            submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
            approved_date TIMESTAMP,
            remarks TEXT
        );
    `;

    try {
        console.log('Applying hr_claims schema...');
        await db.query(claimsSchema);
        console.log('hr_claims table created successfully.');
        
        console.log('Applying hr_advances schema...');
        await db.query(advancesSchema);
        console.log('hr_advances table created successfully.');
    } catch (e) {
        console.error('Migration error:', e.message);
    }
    
    process.exit(0);
}

applyMigrations();
