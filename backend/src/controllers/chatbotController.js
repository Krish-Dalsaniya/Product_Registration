const Groq = require('groq-sdk');
const { fetchAdminStatsData } = require('./adminController');

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
- Inventory: Manage stock. It has sub-categories: PCB, Electronics, Electrical, and Structural parts. Found under /admin/inventory.
- Finished Goods: Manage completed products ready for dispatch. Found under /admin/finished-goods.
- Book a Sale: Interface for Sales personnel to log sales. Found under /admin/book-a-sale.
- Support Center: Internal ticketing system to report issues to Maintenance or IT. Found under /admin/support-tickets.
- Chat: Internal messaging between employees. Found under /admin/chat.

If an employee asks how to do something or where to find something, guide them to the appropriate page.
Keep your responses concise, friendly, and highly professional. Do not invent features that are not listed here. Use markdown formatting to make your responses easy to read.`;

exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let statsContext = '';
    try {
      const stats = await fetchAdminStatsData();
      statsContext = `
Here is the real-time data from the dashboard:
- Total Designers: ${stats.designers}
- Total Sales Personnel: ${stats.sales}
- Total Maintenance Staff: ${stats.maintenance}
- Total Teams: ${stats.teams} (Designers: ${stats.designerTeams}, Sales: ${stats.salesTeams}, Maintenance: ${stats.maintenanceTeams})
- Total Active Products: ${stats.products}
- Total Customers: ${stats.customers}
- Inventory Counts (Active): PCB: ${stats.inventory.pcb}, Electronics: ${stats.inventory.electronics}, Electrical: ${stats.inventory.electrical}, Structural: ${stats.inventory.structural}
- Finished Goods Quantity: ${stats.finishedGoodsQty}
- Sales Logged (Book a Sale): ${stats.bookASaleCount} records, Total Quantity: ${stats.bookASaleQty}
- Support Tickets: ${stats.supportTicketsTotal} total, ${stats.supportTicketsActive} active (Pending/In Progress)

Use this data to directly answer questions about quantities or statistics without telling the user to navigate to the dashboard.`;
    } catch (err) {
      console.error('Failed to fetch stats for chatbot context:', err);
    }

    const groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT + statsContext },
      ...messages
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 500,
    });

    res.json({
      role: 'assistant',
      content: chatCompletion.choices[0]?.message?.content || 'Sorry, I could not process that request.'
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    res.status(500).json({ error: 'Internal server error while communicating with the AI assistant.' });
  }
};
