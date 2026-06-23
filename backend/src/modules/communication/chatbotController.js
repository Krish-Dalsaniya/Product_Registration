const Groq = require('groq-sdk');
const db = require('../../config/db');
const { fetchAdminStatsData } = require('../admin/adminController');

// Initialize Groq. It automatically picks up process.env.GROQ_API_KEY
const groq = new Groq();

const SYSTEM_PROMPT = `You are a helpful and intelligent AI Assistant embedded within an internal corporate application called 'Crudex'. 
Your primary job is to help employees (Admins, Designers, Sales, Maintenance) navigate the application, understand their workflows, and find specific data.

Here is the structure of the application's sidebar and navigation:
- Dashboard: Overview of metrics and recent activities. Found under /admin/dashboard.
- Users/Personnel: Manage employees (Designers, Maintenance, Sales). Found under /admin/users.
- Teams: Group users into teams. Found under /admin/teams.
- Products: Manage the main product catalogs. Found under /admin/products.
- Customers: Manage customer data and their registered products. Found under /admin/customers.
- Roles Access: Manage roles and their default permissions. Found under /admin/roles.
- User Access: Manage custom permissions for specific users overriding their role defaults. Found under /admin/user-access.
- Inventory: Manage stock. It has sub-categories: PCB, Electronics, Electrical, and Structural parts. Found under /admin/inventory.
- Finished Goods: Manage completed products ready for dispatch. Found under /admin/finished-goods.
- Book a Sale: Interface for Sales personnel to log sales. Found under /admin/book-a-sale.
- Support Center: Internal ticketing system to report issues to Maintenance or IT. Found under /admin/support-tickets.
- Chat: Internal messaging between employees. Found under /admin/chat.

If an employee asks how to do something or where to find something, guide them to the appropriate page.
Keep your responses concise, friendly, and highly professional. Do not invent features that are not listed here. Use markdown formatting to make your responses easy to read.

CRITICAL TOOL INSTRUCTION:
Do NOT output tool calls as inline text (e.g., <function=...>). You MUST use the native JSON tool calling capability provided by the API. If you need to search for something, just call the tool natively.

CRITICAL INSTRUCTION FOR DEEP LINKING:
When you use a search tool and find a specific existing record, you MUST provide a clickable markdown link pointing to that record's profile page. 
You MUST replace the ID placeholder with the ACTUAL NUMERIC ID returned by the database! Do NOT output literal strings like "{product_id}" or "<ID>".
Format your links like this:
- Product: [Product Name](/admin/products/123)
- Customer: [Company Name](/admin/customers/456)
- Ticket: [Ticket Title](/admin/support/789)

CRITICAL RULE: If you are auto-filling a form for a NEW product, you MUST NOT generate ANY clickable links. Period. 
If the user asks you to edit or rewrite the description for an EXISTING product by name (e.g. "Edit the description for Glucometer"):
1. You MUST FIRST use the 'search_product_details' tool to find its exact 'product_id'.
2. THEN, call the 'autofill_product_form' tool and pass that 'product_id'.

CRITICAL RULE: If the user asks you to "write the description of production role", "describe the admin role", or asks about ANY employee role or team, DO NOT use the 'autofill_product_form' tool! Instead, simply answer them in plain text. A "role" is NOT a "product".

`;

const groqTools = [
  {
    type: "function",
    function: {
      name: "get_low_inventory",
      description: "Get a list of inventory parts (PCB, electronics, electrical, structural) that have a low stock quantity.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "The category of inventory to check. Must be one of: pcb, electronics, electrical, structural",
            enum: ["pcb", "electronics", "electrical", "structural"]
          },
          threshold: {
            type: "integer",
            description: "The threshold for low stock. Default is 10."
          }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_sales_summary",
      description: "Get a summary of the most recent booked sales.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of recent sales to fetch. Default is 5."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_support_tickets",
      description: "Get a list of currently pending or in-progress support tickets.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of tickets to fetch. Default is 5."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_roles",
      description: "Get a list of all roles and their assigned permission IDs.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_users_with_roles",
      description: "Get a list of users, their roles, and whether they have custom permissions.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Number of users to fetch. Default is 10." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_product_details",
      description: "Search for a specific product by name to get its details and product ID for deep linking.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The product name or keyword to search for."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_customer",
      description: "Search for a specific customer by name or company to get their details.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The customer name or company name to search for."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_support_ticket",
      description: "Search for a specific support ticket by title or ID to get its details and ticket ID for deep linking.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The support ticket title, keyword, or numeric ID to search for."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_support_ticket",
      description: "Create a new support ticket in the database. Use this when the user asks to report an issue, fix something broken, or request support.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "A concise title for the support ticket." },
          description: { type: "string", description: "Detailed description of the issue." },
          priority: { type: "string", enum: ["Low", "Medium", "High"], description: "The priority level of the ticket." }
        },
        required: ["title", "description", "priority"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "autofill_product_form",
      description: "Auto-fill the frontend product creation form. Use this ONLY when the user explicitly asks to create a physical or software CATALOG PRODUCT (e.g. Dispenser, Electronic item) or edit a product description. DO NOT use this when the user asks about employee 'roles' (e.g. production role, admin role), users, or teams.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "The name of the product." },
          product_id: { type: "string", description: "OPTIONAL. The ID of the existing product if you are editing one. You MUST search for the product first to find this ID." },
          category: { type: "string", description: "The product category (e.g. Dispenser, Electronic, Structural)." },
          description: { type: "string", description: "Rich HTML formatted product description to go in the ReactQuill editor. Use <p>, <ul>, <li>, <strong> etc. Make it detailed and professional." },
          feature: { type: "string", description: "Rich HTML formatted key features list to go in the ReactQuill editor. Use <ul> and <li>." }
        },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_inventory",
      description: "Update the stock quantity of an inventory part (restock or deduct).",
      parameters: {
        type: "object",
        properties: {
          part_number: { type: "string", description: "The exact part number of the inventory item (e.g. PCB-101)." },
          quantity_change: { type: "integer", description: "The amount to change the stock by. Positive integer to restock/add, negative integer to deduct/remove." }
        },
        required: ["part_number", "quantity_change"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_ticket",
      description: "Assign a support ticket to a specific user/staff member.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: { type: "string", description: "The ID of the support ticket (e.g. TCK-001)." },
          user_name: { type: "string", description: "The name of the user to assign the ticket to." }
        },
        required: ["ticket_id", "user_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "autofill_book_a_sale",
      description: "Auto-fill the Book a Sale form when a user wants to book/log a new sale.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "The name of the customer or company." },
          product_name: { type: "string", description: "The name of the finished good product being sold." },
          quantity: { type: "integer", description: "The quantity of units being sold." }
        },
        required: ["customer_name", "product_name", "quantity"]
      }
    }
  }
];

const executeTool = async (toolCall, req) => {
  const name = toolCall.function.name;
  let args = {};
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch (e) {}

  if (name === 'get_low_inventory') {
    const threshold = args.threshold || 10;
    const cat = args.category;
    let queryText = '';
    
    if (cat === 'pcb') {
      queryText = `SELECT part_no as part_number, pcb_name as name, stock_quantity FROM pcb_master WHERE stock_quantity <= $1 AND is_active = TRUE LIMIT 20`;
    } else if (cat === 'electronics') {
      queryText = `SELECT part_number, part_name as name, stock_quantity FROM electronics_part_master WHERE stock_quantity <= $1 AND status = 'Active' LIMIT 20`;
    } else if (cat === 'electrical') {
      queryText = `SELECT part_number, part_name as name, stock_quantity FROM electrical_part_master WHERE stock_quantity <= $1 AND is_active = TRUE LIMIT 20`;
    } else if (cat === 'structural') {
      queryText = `SELECT part_number, part_name as name, stock_quantity FROM structural_part_master WHERE stock_quantity <= $1 AND is_active = TRUE LIMIT 20`;
    } else {
      return JSON.stringify({ error: "Invalid category" });
    }
    
    const result = await db.query(queryText, [threshold]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'get_roles') {
    const queryText = `
      SELECT r.role_id, r.role_name, r.description,
             COALESCE(json_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), '[]') as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      GROUP BY r.role_id
      ORDER BY r.role_id
    `;
    const result = await db.query(queryText);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'get_users_with_roles') {
    const limit = args.limit || 10;
    const queryText = `
      SELECT u.user_id, u.full_name, u.email, r.role_name, u.is_active,
             COALESCE(uca.has_custom_permissions, false) as has_custom_permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_custom_access uca ON u.user_id = uca.user_id
      ORDER BY u.created_at DESC
      LIMIT $1
    `;
    const result = await db.query(queryText, [limit]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'get_recent_sales_summary') {
    const limit = args.limit || 5;
    const queryText = `
      SELECT b.sale_id, b.customer_name, p.product_name, b.quantity, b.sale_date, b.status 
      FROM book_a_sale b
      LEFT JOIN products p ON b.product_id = p.product_id
      ORDER BY b.sale_date DESC LIMIT $1
    `;
    const result = await db.query(queryText, [limit]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'get_pending_support_tickets') {
    const limit = args.limit || 5;
    const queryText = `
      SELECT t.ticket_id, t.title, t.priority, t.status, t.created_at, u.full_name as reported_by
      FROM support_tickets t
      LEFT JOIN users u ON t.reported_by = u.user_id
      WHERE t.status IN ('Pending', 'In Progress')
      ORDER BY t.created_at DESC LIMIT $1
    `;
    const result = await db.query(queryText, [limit]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'search_product_details') {
    const query = args.query || '';
    const queryText = `
      SELECT product_id, product_name, product_code, category, sub_category, unit_price, description, created_at 
      FROM products 
      WHERE product_name ILIKE $1 OR description ILIKE $1 
      LIMIT 5
    `;
    const result = await db.query(queryText, [`%${query}%`]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'search_customer') {
    const query = args.query || '';
    const queryText = `
      SELECT customer_id, company_name, customer_name as contact_person, email, customer_site_location as location 
      FROM customers 
      WHERE company_name ILIKE $1 OR customer_name ILIKE $1 
      LIMIT 5
    `;
    const result = await db.query(queryText, [`%${query}%`]);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'search_support_ticket') {
    const query = args.query || '';
    let queryText = '';
    let params = [];

    if (!isNaN(parseInt(query))) {
      // Search by ID
      queryText = `
        SELECT t.ticket_id, t.title, t.description, t.status, t.priority, t.created_at, u.full_name as reported_by
        FROM support_tickets t
        LEFT JOIN users u ON t.reported_by = u.user_id
        WHERE t.ticket_id = $1
      `;
      params = [parseInt(query)];
    } else {
      // Search by title/description
      queryText = `
        SELECT t.ticket_id, t.title, t.description, t.status, t.priority, t.created_at, u.full_name as reported_by
        FROM support_tickets t
        LEFT JOIN users u ON t.reported_by = u.user_id
        WHERE t.title ILIKE $1 OR t.description ILIKE $1
        LIMIT 5
      `;
      params = [`%${query}%`];
    }
    const result = await db.query(queryText, params);
    return JSON.stringify({ data: result.rows });
  }

  if (name === 'create_support_ticket') {
    const { title, description, priority } = args;
    const userId = req.user?.user_id || null;
    
    if (!userId) return JSON.stringify({ error: "User authentication required to create a ticket." });

    const maxIdResult = await db.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 5) AS INTEGER)), 0) + 1 AS next_id
      FROM support_tickets
      WHERE ticket_id ~ '^TCK-[0-9]+$'
    `);
    const nextId = maxIdResult.rows[0].next_id;
    const ticket_id = `TCK-${String(nextId).padStart(3, '0')}`;

    const userResult = await db.query('SELECT full_name FROM users WHERE user_id = $1', [userId]);
    const creatorName = userResult.rows[0]?.full_name || 'AI Assistant';

    const queryText = `
      INSERT INTO support_tickets (
        ticket_id, creator_id, creator_name, query_date, 
        query_type, query_description, troubleshooting_steps, steps_followed,
        priority, status, assigned_to, attachments
      ) VALUES ($1, $2, $6, CURRENT_TIMESTAMP, $3, $4, '', false, $5, 'Pending', 'Unassigned', '[]')
      RETURNING ticket_id, status, created_at
    `;
    const result = await db.query(queryText, [ticket_id, userId, title, description, priority, creatorName]);
    return JSON.stringify({ success: true, message: "Ticket created successfully.", ticket: result.rows[0] });
  }

  if (name === 'autofill_product_form') {
    // We don't do any DB operation here. We just return a success message.
    // The actual interception happens in the chat route.
    return JSON.stringify({ success: true, message: "Form autofilled on client side." });
  }

  if (name === 'update_inventory') {
    const { part_number, quantity_change } = args;
    if (!part_number || quantity_change === undefined) return JSON.stringify({ error: "part_number and quantity_change are required" });

    const tables = [
      { name: 'pcb_master', col: 'part_no' },
      { name: 'electronics_part_master', col: 'part_number' },
      { name: 'electrical_part_master', col: 'part_number' },
      { name: 'structural_part_master', col: 'part_number' }
    ];

    let updated = false;
    let newQty = 0;
    
    for (const table of tables) {
      const query = `
        UPDATE ${table.name} 
        SET stock_quantity = stock_quantity + $1 
        WHERE ${table.col} = $2 
        RETURNING stock_quantity
      `;
      const result = await db.query(query, [quantity_change, part_number]);
      if (result.rows.length > 0) {
        updated = true;
        newQty = result.rows[0].stock_quantity;
        break;
      }
    }

    if (updated) {
      return JSON.stringify({ success: true, message: `Inventory updated successfully. New quantity is ${newQty}.` });
    } else {
      return JSON.stringify({ error: "Part number not found in any inventory category." });
    }
  }

  if (name === 'assign_ticket') {
    const { ticket_id, user_name } = args;
    const query = `UPDATE support_tickets SET assigned_to = $1 WHERE ticket_id = $2 RETURNING ticket_id, assigned_to`;
    const result = await db.query(query, [user_name, ticket_id]);
    if (result.rows.length > 0) {
      return JSON.stringify({ success: true, message: `Ticket ${ticket_id} successfully assigned to ${user_name}.` });
    } else {
      return JSON.stringify({ error: "Ticket not found." });
    }
  }

  if (name === 'autofill_book_a_sale') {
    return JSON.stringify({ success: true, message: "Book a Sale form autofilled on client side." });
  }

  return JSON.stringify({ error: "Tool not found" });
};

exports.chat = async (req, res) => {
  try {
    const { messages, currentPath } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let isAdmin = req.user?.role_name === 'Admin';
    let userPermissions = [];
    
    if (!isAdmin && req.user) {
      const roleId = req.user.role_id;
      const userId = req.user.user_id;
      const customRes = await db.query('SELECT has_custom_permissions FROM user_custom_access WHERE user_id = $1', [userId]);
      const hasCustom = customRes.rows.length > 0 ? customRes.rows[0].has_custom_permissions : false;
      
      if (hasCustom) {
        const result = await db.query(`SELECT p.permission_key FROM permissions p JOIN user_permissions up ON p.permission_id = up.permission_id WHERE up.user_id = $1`, [userId]);
        userPermissions = result.rows.map(r => r.permission_key);
      } else {
        const result = await db.query(`SELECT p.permission_key FROM permissions p JOIN role_permissions rp ON p.permission_id = rp.permission_id WHERE rp.role_id = $1`, [roleId]);
        userPermissions = result.rows.map(r => r.permission_key);
      }
    }

    let statsContext = '';
    try {
      const stats = await fetchAdminStatsData();
      let statsText = [];
      
      if (isAdmin || userPermissions.includes('users.view')) {
         statsText.push(`- Total Designers: ${stats.designers}`);
         statsText.push(`- Total Sales Personnel: ${stats.sales}`);
         statsText.push(`- Total Maintenance Staff: ${stats.maintenance}`);
      }
      if (isAdmin || userPermissions.includes('teams.view')) {
         statsText.push(`- Total Teams: ${stats.teams} (Designers: ${stats.designerTeams}, Sales: ${stats.salesTeams}, Maintenance: ${stats.maintenanceTeams})`);
      }
      if (isAdmin || userPermissions.includes('products.view')) {
         statsText.push(`- Total Active Products: ${stats.products}`);
      }
      if (isAdmin || userPermissions.includes('customers.view')) {
         statsText.push(`- Total Customers: ${stats.customers}`);
      }
      if (isAdmin || userPermissions.includes('inventory.view')) {
         statsText.push(`- Inventory Counts (Active): PCB: ${stats.inventory.pcb}, Electronics: ${stats.inventory.electronics}, Electrical: ${stats.inventory.electrical}, Structural: ${stats.inventory.structural}`);
      }
      if (isAdmin || userPermissions.includes('finishedgoods.view')) {
         statsText.push(`- Finished Goods Quantity: ${stats.finishedGoodsQty}`);
      }
      if (isAdmin || userPermissions.includes('sales.view')) {
         statsText.push(`- Sales Logged (Book a Sale): ${stats.bookASaleCount} records, Total Quantity: ${stats.bookASaleQty}`);
      }
      if (isAdmin || userPermissions.includes('supporttickets.view')) {
         statsText.push(`- Support Tickets: ${stats.supportTicketsTotal} total, ${stats.supportTicketsActive} active (Pending/In Progress)`);
      }

      if (statsText.length > 0) {
        statsContext = `\nHere is the real-time data from the dashboard you have access to:\n` + statsText.join('\n') + `\nUse this data to directly answer questions about quantities or statistics without telling the user to navigate to the dashboard.`;
      } else {
        statsContext = `\nYou currently do not have permission to view real-time statistics.`;
      }
    } catch (err) {
      console.error('Failed to fetch stats for chatbot context:', err);
    }

    let pageContext = '';
    if (currentPath) {
      pageContext = `\n\nCRITICAL CONTEXT: The user is currently on the following page route: ${currentPath}. Tailor your response and suggested actions based on this context. For example, if they are on a product page, assume they want to interact with that product if their request is ambiguous.`;
    }

    let userPermissionsContext = '';
    if (!isAdmin) {
      userPermissionsContext = `\n\nCRITICAL CONTEXT: The current user is NOT an Admin. They only have the following specific permissions: [${userPermissions.join(', ')}]. If they ask to perform an action or access a module they do NOT have permission for, you MUST politely decline and inform them they lack the required access. Do NOT attempt to use tools for actions they are not permitted to do.`;
    } else {
      userPermissionsContext = `\n\nCRITICAL CONTEXT: The current user is an Admin. They have full access to all modules and actions.`;
    }

    let allowedTools = [];

    // Filter tools based on user permissions
    if (isAdmin) {
      allowedTools = groqTools; // Admins get everything
    } else {
      const toolPermissions = {
        'get_low_inventory': 'inventory.view',
        'get_recent_sales_summary': 'sales.view',
        'get_pending_support_tickets': 'supporttickets.view',
        'search_product_details': 'products.view',
        'search_customer': 'customers.view',
        'search_support_ticket': 'supporttickets.view',
        'create_support_ticket': 'supporttickets.create',
        'autofill_product_form': 'products.create',
        'update_inventory': 'inventory.edit',
        'assign_ticket': 'supporttickets.edit',
        'autofill_book_a_sale': 'sales.create',
        'get_roles': 'roles.view',
        'get_users_with_roles': 'users.view'
      };
      
      allowedTools = groqTools.filter(tool => {
        const requiredPerm = toolPermissions[tool.function.name];
        return requiredPerm && userPermissions.includes(requiredPerm);
      });
    }

    let dynamicInstructions = '\n\nCRITICAL INSTRUCTION FOR AGENTIC ACTIONS:';
    if (allowedTools.some(t => t.function.name === 'create_support_ticket')) {
      dynamicInstructions += '\n- Support Tickets: If a user asks you to report a broken item, create an issue, or submit a support ticket, you MUST call the `create_support_ticket` tool with a descriptive title, detailed description, and priority level.';
    }
    if (allowedTools.some(t => t.function.name === 'autofill_product_form')) {
      dynamicInstructions += '\n- Drafting Descriptions & Auto-filling: If a user asks you to write a product description, or fill out the product form, you MUST call the `autofill_product_form` tool. Provide extremely high-quality, rich HTML content for the description and features, and infer an appropriate product name and category. Do NOT say you need more information unless the request is completely blank. Just generate the best possible content based on their prompt.';
    }
    if (allowedTools.some(t => t.function.name === 'update_inventory')) {
      dynamicInstructions += '\n- Inventory Management: If a user asks to restock, add, or deduct inventory, call the `update_inventory` tool with the exact part number and quantity change. Positive for restock, negative for deduct.';
    }
    if (allowedTools.some(t => t.function.name === 'assign_ticket')) {
      dynamicInstructions += '\n- Ticket Assignment: If a user asks to assign a ticket to someone, call the `assign_ticket` tool with the ticket ID and the person\'s name.';
    }
    if (allowedTools.some(t => t.function.name === 'autofill_book_a_sale')) {
      dynamicInstructions += '\n- Booking a Sale: If a user asks to book a sale, log a sale, or sell a product to a customer, call the `autofill_book_a_sale` tool with the product name, customer name, and quantity.';
    }

    let groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT + statsContext + pageContext + userPermissionsContext + dynamicInstructions },
      ...messages
    ];

    let requestOptions = {
      messages: groqMessages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 1000,
    };
    
    if (allowedTools.length > 0) {
      requestOptions.tools = allowedTools;
      requestOptions.tool_choice = 'auto';
    }

    let chatCompletion = await groq.chat.completions.create(requestOptions);

    const parseHallucinatedToolCalls = (msg) => {
      if (msg?.content && msg.content.includes('<function=')) {
        const functionMatch = msg.content.match(/<function=([^>]+)>(.*?)<\/function>/is);
        if (functionMatch) {
          msg.tool_calls = msg.tool_calls || [];
          msg.tool_calls.push({
            id: 'call_' + Math.random().toString(36).substr(2, 9),
            type: 'function',
            function: { name: functionMatch[1].trim(), arguments: functionMatch[2].trim() }
          });
          msg.content = msg.content.replace(functionMatch[0], '').trim();
          return true; // Indicates we found and parsed a hallucinated tool call
        }
      }
      return false;
    };

    let responseMessage = chatCompletion.choices[0]?.message;
    parseHallucinatedToolCalls(responseMessage);

    // Handle tool calls if any
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      groqMessages.push(responseMessage);
      
      let autofillAction = null;

      for (const toolCall of responseMessage.tool_calls) {
        const isToolAllowed = allowedTools.some(t => t.function.name === toolCall.function.name);
        if (!isToolAllowed) {
           return res.json({
             role: 'assistant',
             content: 'Access Denied: You do not have permission to perform this action.'
           });
        }

        if (toolCall.function.name === 'autofill_product_form') {
           const payload = JSON.parse(toolCall.function.arguments || '{}');
           autofillAction = { type: 'AUTOFILL_PRODUCT_FORM', payload };
           
           groqMessages.push({
             tool_call_id: toolCall.id,
             role: 'tool',
             name: toolCall.function.name,
             content: JSON.stringify({ success: true, message: "Form autofilled on client side." })
           });
        } else if (toolCall.function.name === 'autofill_book_a_sale') {
           const payload = JSON.parse(toolCall.function.arguments || '{}');
           
           // Fetch customer_id from name
           let customer_id = null;
           if (payload.customer_name) {
             const custRes = await db.query('SELECT customer_id FROM customers WHERE company_name ILIKE $1 OR customer_name ILIKE $1 LIMIT 1', [`%${payload.customer_name}%`]);
             if (custRes.rows.length > 0) customer_id = custRes.rows[0].customer_id;
           }

           // Fetch finished_good_id from name
           let finished_good_id = null;
           if (payload.product_name) {
             const prodRes = await db.query('SELECT fg.id as finished_good_id FROM finished_goods fg JOIN products p ON fg.product_id = p.product_id WHERE p.product_name ILIKE $1 LIMIT 1', [`%${payload.product_name}%`]);
             if (prodRes.rows.length > 0) finished_good_id = prodRes.rows[0].finished_good_id;
           }

           payload.customer_id = customer_id;
           payload.finished_good_id = finished_good_id;
           
           autofillAction = { type: 'AUTOFILL_BOOK_A_SALE', payload };
           
           groqMessages.push({
             tool_call_id: toolCall.id,
             role: 'tool',
             name: toolCall.function.name,
             content: JSON.stringify({ success: true, message: "Book a Sale form autofilled on client side." })
           });
        } else {
           const toolResult = await executeTool(toolCall, req);
           groqMessages.push({
             tool_call_id: toolCall.id,
             role: 'tool',
             name: toolCall.function.name,
             content: toolResult
           });
        }
      }

      requestOptions.messages = groqMessages;
      chatCompletion = await groq.chat.completions.create(requestOptions);

      responseMessage = chatCompletion.choices[0]?.message;
      
      // Check again for hallucinated tool calls in the second response!
      if (parseHallucinatedToolCalls(responseMessage)) {
        for (const toolCall of responseMessage.tool_calls) {
          const isToolAllowed = allowedTools.some(t => t.function.name === toolCall.function.name);
          if (!isToolAllowed) {
             return res.json({
               role: 'assistant',
               content: 'Access Denied: You do not have permission to perform this action.'
             });
          }

          if (toolCall.function.name === 'autofill_product_form') {
             const payload = JSON.parse(toolCall.function.arguments || '{}');
             autofillAction = { type: 'AUTOFILL_PRODUCT_FORM', payload };
          } else if (toolCall.function.name === 'autofill_book_a_sale') {
             const payload = JSON.parse(toolCall.function.arguments || '{}');
             autofillAction = { type: 'AUTOFILL_BOOK_A_SALE', payload };
          }
        }
      }
      
      res.json({
        role: 'assistant',
        content: responseMessage?.content || 'Sorry, I could not process that request.',
        action: autofillAction
      });
      return;
    }

    res.json({
      role: 'assistant',
      content: responseMessage?.content || 'Sorry, I could not process that request.'
    });

  } catch (error) {
    const errorDetails = error.error?.error?.message || error.message || 'Unknown error';
    console.error('Groq API Error details:', error.error || error);
    res.status(500).json({ error: `Groq Error: ${errorDetails}` });
  }
};
