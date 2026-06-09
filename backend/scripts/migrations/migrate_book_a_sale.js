const db = require('./src/config/db');

const sql = `
  CREATE TABLE IF NOT EXISTS book_a_sale (
    id SERIAL PRIMARY KEY,
    finished_good_id INTEGER NOT NULL REFERENCES finished_goods(id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

db.query(sql)
  .then(() => {
    console.log('Table book_a_sale created successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error creating table:', err.message);
    process.exit(1);
  });
