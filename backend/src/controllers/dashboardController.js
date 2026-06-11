const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

// Helper to safely execute queries that might fail due to missing columns in dev environment
const safeQuery = async (queryText, params = []) => {
  try {
    return await db.query(queryText, params);
  } catch (error) {
    if (error.code === '42703') { // undefined column error
      console.warn('Missing column in database, returning empty fallback data for query');
      return { rows: [] };
    }
    throw error;
  }
};

const getSalesDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Total Customers
    const totalCustomersRes = await safeQuery(`SELECT COUNT(*) as count FROM customers`);
    const totalCustomers = totalCustomersRes.rows[0]?.count ? parseInt(totalCustomersRes.rows[0].count) : 0;

    // My Customers
    const myCustomersRes = await safeQuery(`SELECT COUNT(*) as count FROM customers WHERE created_by = $1`, [userId]);
    const myCustomers = myCustomersRes.rows[0]?.count ? parseInt(myCustomersRes.rows[0].count) : 0;

    // Total Book a Sale
    const bookASaleTotalRes = await safeQuery(`SELECT COUNT(*) as count FROM book_a_sale`);
    const bookASaleTotal = bookASaleTotalRes.rows[0]?.count ? parseInt(bookASaleTotalRes.rows[0].count) : 0;

    // Open Support Tickets
    const openTicketsRes = await safeQuery(`SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('Pending', 'In Progress')`);
    const openSupportTickets = openTicketsRes.rows[0]?.count ? parseInt(openTicketsRes.rows[0].count) : 0;

    // Last 5 customers created by user
    const recentCustomersRes = await safeQuery(`
      SELECT customer_id, customer_name, company_name, created_at 
      FROM customers 
      WHERE created_by = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);

    // Last 5 sales created by user
    const recentSalesRes = await safeQuery(`
      SELECT bs.id, bs.quantity, p.product_name, c.customer_name, bs.created_at
      FROM book_a_sale bs
      JOIN finished_goods fg ON bs.finished_good_id = fg.id
      JOIN products p ON fg.product_id = p.product_id
      JOIN customers c ON bs.customer_id = c.customer_id
      WHERE bs.created_by = $1
      ORDER BY bs.created_at DESC
      LIMIT 5
    `, [userId]);

    sendSuccess(res, {
      totalCustomers,
      myCustomers,
      bookASaleTotal,
      openSupportTickets,
      recentCustomers: recentCustomersRes.rows,
      recentSales: recentSalesRes.rows
    });
  } catch (error) {
    next(error);
  }
};

const getMaintenanceDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Open Tickets
    const openTicketsRes = await safeQuery(`SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('Pending', 'In Progress')`);
    const openTickets = openTicketsRes.rows[0]?.count ? parseInt(openTicketsRes.rows[0].count) : 0;

    // Assigned to me
    const assignedTicketsRes = await safeQuery(`SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('Pending', 'In Progress') AND assigned_to = $1`, [userId]);
    const assignedToMeTickets = assignedTicketsRes.rows[0]?.count ? parseInt(assignedTicketsRes.rows[0].count) : 0;

    // Critical Tickets
    const criticalTicketsRes = await safeQuery(`SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('Pending', 'In Progress') AND priority = 'High'`);
    const criticalTickets = criticalTicketsRes.rows[0]?.count ? parseInt(criticalTicketsRes.rows[0].count) : 0;

    // Resolved This Week
    const resolvedThisWeekRes = await safeQuery(`
      SELECT COUNT(*) as count FROM support_tickets 
      WHERE status = 'Resolved' 
      AND updated_at >= date_trunc('week', CURRENT_DATE)
    `);
    const resolvedThisWeekTickets = resolvedThisWeekRes.rows[0]?.count ? parseInt(resolvedThisWeekRes.rows[0].count) : 0;

    // Recent unresolved tickets table
    const recentUnresolvedRes = await safeQuery(`
      SELECT id, ticket_id, query_type as issue_type, priority, created_at, status
      FROM support_tickets
      WHERE status IN ('Pending', 'In Progress')
      ORDER BY 
        CASE priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Low' THEN 3 
          ELSE 4 
        END,
        created_at DESC
      LIMIT 10
    `);

    sendSuccess(res, {
      openTickets,
      assignedToMeTickets,
      criticalTickets,
      resolvedThisWeekTickets,
      recentUnresolvedTickets: recentUnresolvedRes.rows
    });
  } catch (error) {
    next(error);
  }
};

const getDesignerDashboardStats = async (req, res, next) => {
  try {
    // Products Managed (Total)
    const productsRes = await safeQuery(`SELECT COUNT(*) as count FROM products WHERE is_active = TRUE`);
    const productsManaged = productsRes.rows[0]?.count ? parseInt(productsRes.rows[0].count) : 0;

    // Inventory Items Managed (PCB, Electronics, Electrical, Structural)
    const inventoryRes = await safeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM pcb_master WHERE is_active = TRUE) +
        (SELECT COUNT(*) FROM electronics_part_master WHERE is_active = TRUE) +
        (SELECT COUNT(*) FROM electrical_part_master WHERE is_active = TRUE) +
        (SELECT COUNT(*) FROM structural_part_master WHERE is_active = TRUE) as count
    `);
    const inventoryItemsManaged = inventoryRes.rows[0]?.count ? parseInt(inventoryRes.rows[0].count) : 0;

    // Missing Files / Missing Specs (Approximations, or we can just return 0 if complicated)
    const missingFilesRes = await safeQuery(`SELECT COUNT(*) as count FROM products WHERE is_active = TRUE AND image_url IS NULL`);
    const missingFiles = missingFilesRes.rows[0]?.count ? parseInt(missingFilesRes.rows[0].count) : 0;

    const missingTechSpecsRes = await safeQuery(`SELECT COUNT(*) as count FROM products WHERE is_active = TRUE AND technical_specifications IS NULL`);
    const missingTechSpecs = missingTechSpecsRes.rows[0]?.count ? parseInt(missingTechSpecsRes.rows[0].count) : 0;

    // Recently modified products
    const recentProductsRes = await safeQuery(`
      SELECT product_id, product_name, product_code, updated_at
      FROM products
      WHERE is_active = TRUE
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 5
    `);

    // Recently modified inventory (just getting from one of the tables for simplicity, e.g. PCB)
    const recentInventoryRes = await safeQuery(`
      SELECT pcb_id as id, part_number as name, 'PCB' as type, updated_at
      FROM pcb_master
      WHERE is_active = TRUE
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 5
    `);

    sendSuccess(res, {
      productsManaged,
      inventoryItemsManaged,
      missingFiles,
      missingTechSpecs,
      recentlyModifiedProducts: recentProductsRes.rows,
      recentlyModifiedInventory: recentInventoryRes.rows
    });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userPermissions = req.user.permissions || [];
    const isAdmin = req.user.role_name?.toLowerCase() === 'admin' || userPermissions.includes('admin');
    const hasInventory = isAdmin || userPermissions.some(p => p === 'inventory.view' || (p.startsWith('inventory.') && p.endsWith('.view')));
    const hasTickets = isAdmin || userPermissions.some(p => 
      p === 'supporttickets.view' || p === 'support_tickets.view' || 
      (p.startsWith('supporttickets.') && p.endsWith('.view')) ||
      (p.startsWith('support_tickets.') && p.endsWith('.view'))
    );

    let inventoryAlerts = [];
    let supportTickets = [];

    if (hasInventory) {
      const threshold = 10;
      const pcbsRes = await safeQuery(`SELECT pcb_id as id, pcb_name as name, part_no as part_number, stock_quantity, 'PCB' as category FROM pcb_master WHERE stock_quantity < $1 AND is_active = TRUE`, [threshold]);
      const electricalRes = await safeQuery(`SELECT part_id as id, part_name as name, part_number, stock_quantity, 'Electrical' as category FROM electrical_part_master WHERE stock_quantity < $1 AND is_active = TRUE`, [threshold]);
      const electronicsRes = await safeQuery(`SELECT part_id as id, part_name as name, part_number, stock_quantity, 'Electronics' as category FROM electronics_part_master WHERE stock_quantity < $1 AND is_active = TRUE`, [threshold]);
      const structuralRes = await safeQuery(`SELECT part_id as id, part_name as name, part_number, stock_quantity, 'Structural' as category FROM structural_part_master WHERE stock_quantity < $1 AND is_active = TRUE`, [threshold]);
      
      inventoryAlerts = [
        ...(pcbsRes.rows || []),
        ...(electricalRes.rows || []),
        ...(electronicsRes.rows || []),
        ...(structuralRes.rows || [])
      ].sort((a, b) => a.stock_quantity - b.stock_quantity);
    }

    if (hasTickets) {
      const ticketsRes = await safeQuery(`SELECT id, ticket_id, query_type as subject, priority, created_at FROM support_tickets WHERE status = 'Pending' ORDER BY created_at DESC`);
      supportTickets = ticketsRes.rows || [];
    }

    sendSuccess(res, { inventoryAlerts, supportTickets });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesDashboardStats,
  getMaintenanceDashboardStats,
  getDesignerDashboardStats,
  getNotifications
};
