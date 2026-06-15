const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/adminController.js');
let content = fs.readFileSync(file, 'utf8');

const queryReplacement = `
  const result = await db.query(queryText);
  const row = result.rows[0];

  // Fetch designations distribution
  const destQuery = \`
    SELECT r.role_name as department, COALESCE(u.designation, 'Unassigned') as designation, COUNT(u.user_id)::int as count 
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.is_active = TRUE 
    GROUP BY r.role_name, COALESCE(u.designation, 'Unassigned');
  \`;
  const destResult = await db.query(destQuery);
`;

content = content.replace("  const result = await db.query(queryText);\r\n  const row = result.rows[0];", queryReplacement);
content = content.replace("  const result = await db.query(queryText);\n  const row = result.rows[0];", queryReplacement);

const statsReplacement = `
    finishedGoodsCount: parseInt(row.finished_goods_count),
    finishedGoodsQty: parseInt(row.finished_goods_qty),
    bookASaleCount: parseInt(row.book_a_sale_count),
    bookASaleQty: parseInt(row.book_a_sale_qty),
    supportTicketsTotal: parseInt(row.support_tickets_total),
    supportTicketsActive: parseInt(row.support_tickets_active),
    designationsDistribution: destResult.rows,
    inventory: {
`;

content = content.replace("    finishedGoodsCount: parseInt(row.finished_goods_count),\r\n    finishedGoodsQty: parseInt(row.finished_goods_qty),\r\n    bookASaleCount: parseInt(row.book_a_sale_count),\r\n    bookASaleQty: parseInt(row.book_a_sale_qty),\r\n    supportTicketsTotal: parseInt(row.support_tickets_total),\r\n    supportTicketsActive: parseInt(row.support_tickets_active),\r\n    inventory: {", statsReplacement);
content = content.replace("    finishedGoodsCount: parseInt(row.finished_goods_count),\n    finishedGoodsQty: parseInt(row.finished_goods_qty),\n    bookASaleCount: parseInt(row.book_a_sale_count),\n    bookASaleQty: parseInt(row.book_a_sale_qty),\n    supportTicketsTotal: parseInt(row.support_tickets_total),\n    supportTicketsActive: parseInt(row.support_tickets_active),\n    inventory: {", statsReplacement);

fs.writeFileSync(file, content);
console.log('Updated adminController.js');
