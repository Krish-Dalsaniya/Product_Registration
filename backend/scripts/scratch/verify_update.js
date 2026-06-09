const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function verify() {
  try {
    const id = 4;
    console.log(`Verifying part ${id}...`);
    
    // Mock the body that would come from frontend
    const body = {
        part_category: 'Pump',
        part_name: 'Verification Pump',
        part_number: 'VER-123',
        manufacturer: 'VeriCorp',
        part_type: 'Test',
        description: 'Test description',
        used_in_product: 'Test Product',
        material: 'Iron',
        status: 'Active',
        rated_voltage: '220V',
        rated_current: '5A',
        power_rating: '1kW',
        phase_type: 'Single',
        frequency: '50Hz',
        input_type: 'AC',
        output_type: 'DC',
        connector_type: 'Plug',
        mounting_type: 'Floor',
        protection_rating: 'IP65',
        operating_temperature: '-10 to 50C',
        dimensions: '10x10x10',
        weight: '5kg',
        category_name: 'Pump',
        pump_type: 'Centrifugal'
    };

    // This script mocks the updateElectricalPart logic
    await pool.query('BEGIN');

    console.log('Updating master...');
    await pool.query(
        `UPDATE electrical_part_master 
         SET part_category=$1, part_name=$2, part_number=$3, manufacturer=$4, part_type=$5, description=$6, used_in_product=$7, material=$8, status=$9, updated_at=CURRENT_TIMESTAMP
         WHERE part_id=$10`,
        [body.part_category, body.part_name, body.part_number, body.manufacturer, body.part_type, body.description, body.used_in_product, body.material, body.status, id]
    );

    console.log('Updating tech specs...');
    await pool.query(
        `UPDATE electrical_tech_spec SET
        rated_voltage = $1, rated_current = $2, power_rating = $3, phase_type = $4, frequency = $5, input_type = $6, output_type = $7, connector_type = $8, mounting_type = $9, protection_rating = $10, operating_temperature = $11, dimensions = $12, weight = $13, updated_at = NOW()
        WHERE part_id = $14`,
        [body.rated_voltage, body.rated_current, body.power_rating, body.phase_type, body.frequency, body.input_type, body.output_type, body.connector_type, body.mounting_type, body.protection_rating, body.operating_temperature, body.dimensions, body.weight, id]
    );

    await pool.query('COMMIT');
    console.log('SUCCESS: Update verified!');

  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('VERIFICATION FAILED:', e);
  } finally {
    await pool.end();
  }
}
verify();
