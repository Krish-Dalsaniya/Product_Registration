const { query, pool } = require('../../../../config/db');
const { sendSuccess, sendError } = require('../../../../utils/response');
const PDFDocument = require('pdfkit');

const getSalaryStructures = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT e.employee_id, u.full_name as employee_name, e.emp_code,
             COALESCE(ss.basic_salary, 0) as basic_salary,
             COALESCE(ss.hra, 0) as hra,
             COALESCE(ss.special_allowance, 0) as special_allowance,
             COALESCE(ss.travel_allowance, 0) as travel_allowance,
             COALESCE(ss.medical_allowance, 0) as medical_allowance,
             COALESCE(ss.pf_deduction, 0) as pf_deduction,
             COALESCE(ss.professional_tax, 0) as professional_tax,
             COALESCE(ss.tds, 0) as tds
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_salary_structures ss ON e.employee_id = ss.employee_id
      WHERE e.employment_status != 'Terminated'
      ORDER BY u.full_name
    `);
    sendSuccess(res, result.rows, 'Salary structures fetched successfully');
  } catch (error) {
    next(error);
  }
};

const updateSalaryStructure = async (req, res, next) => {
  try {
    const { employee_id } = req.params;
    const { basic_salary, hra, special_allowance, travel_allowance, medical_allowance, pf_deduction, professional_tax, tds } = req.body;
    
    await query(`
      INSERT INTO hr_salary_structures (employee_id, basic_salary, hra, special_allowance, travel_allowance, medical_allowance, pf_deduction, professional_tax, tds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (employee_id) DO UPDATE
      SET basic_salary = EXCLUDED.basic_salary,
          hra = EXCLUDED.hra,
          special_allowance = EXCLUDED.special_allowance,
          travel_allowance = EXCLUDED.travel_allowance,
          medical_allowance = EXCLUDED.medical_allowance,
          pf_deduction = EXCLUDED.pf_deduction,
          professional_tax = EXCLUDED.professional_tax,
          tds = EXCLUDED.tds,
          updated_at = CURRENT_TIMESTAMP
    `, [employee_id, basic_salary, hra, special_allowance, travel_allowance, medical_allowance, pf_deduction, professional_tax, tds]);
    
    sendSuccess(res, null, 'Salary structure updated successfully');
  } catch (error) {
    next(error);
  }
};

const getPayrolls = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    
    let sqlQuery = `
      SELECT p.*, u.full_name as employee_name, e.emp_code
      FROM hr_payrolls p
      JOIN hr_employees e ON p.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
    `;
    let params = [];
    
    if (month && year) {
      sqlQuery += ` WHERE p.month = $1 AND p.year = $2`;
      params = [month, year];
    }
    
    sqlQuery += ` ORDER BY u.full_name`;
    
    const result = await query(sqlQuery, params);
    sendSuccess(res, result.rows, 'Payrolls fetched successfully');
  } catch (error) {
    next(error);
  }
};

const generatePayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get all active employees and their salary structures
      const empResult = await client.query(`
        SELECT e.employee_id,
               COALESCE(ss.basic_salary, 0) as basic_salary,
               COALESCE(ss.hra, 0) as hra,
               COALESCE(ss.special_allowance, 0) as special_allowance,
               COALESCE(ss.travel_allowance, 0) as travel_allowance,
               COALESCE(ss.medical_allowance, 0) as medical_allowance,
               COALESCE(ss.pf_deduction, 0) as pf_deduction,
               COALESCE(ss.professional_tax, 0) as professional_tax,
               COALESCE(ss.tds, 0) as tds
        FROM hr_employees e
        LEFT JOIN hr_salary_structures ss ON e.employee_id = ss.employee_id
        WHERE e.employment_status != 'Terminated'
      `);
      
      for (let emp of empResult.rows) {
        const gross = parseFloat(emp.basic_salary) + parseFloat(emp.hra) + parseFloat(emp.special_allowance) + parseFloat(emp.travel_allowance) + parseFloat(emp.medical_allowance);
        const deductions = parseFloat(emp.pf_deduction) + parseFloat(emp.professional_tax) + parseFloat(emp.tds);
        const net_salary = gross - deductions;
        
        await client.query(`
          INSERT INTO hr_payrolls (employee_id, month, year, basic_salary, hra, special_allowance, travel_allowance, medical_allowance, pf_deduction, professional_tax, tds, net_salary, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Draft')
          ON CONFLICT (employee_id, month, year) DO UPDATE
          SET basic_salary = EXCLUDED.basic_salary,
              hra = EXCLUDED.hra,
              special_allowance = EXCLUDED.special_allowance,
              travel_allowance = EXCLUDED.travel_allowance,
              medical_allowance = EXCLUDED.medical_allowance,
              pf_deduction = EXCLUDED.pf_deduction,
              professional_tax = EXCLUDED.professional_tax,
              tds = EXCLUDED.tds,
              net_salary = EXCLUDED.net_salary,
              updated_at = CURRENT_TIMESTAMP
        `, [
          emp.employee_id, month, year, 
          emp.basic_salary, emp.hra, emp.special_allowance, emp.travel_allowance, emp.medical_allowance,
          emp.pf_deduction, emp.professional_tax, emp.tds, net_salary
        ]);
      }
      
      await client.query('COMMIT');
      sendSuccess(res, null, 'Payroll generated successfully for active employees');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("GENERATE PAYROLL TRANSACTION ERROR:", err);
      return res.status(500).json({ success: false, message: err.message, stack: err.stack });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

const processPayroll = async (req, res, next) => {
  try {
    const { payroll_ids } = req.body;
    if (!payroll_ids || !payroll_ids.length) {
      return res.status(400).json({ success: false, message: 'Payroll IDs required' });
    }
    
    await query(`
      UPDATE hr_payrolls 
      SET status = 'Processed', updated_at = CURRENT_TIMESTAMP
      WHERE payroll_id = ANY($1::uuid[])
    `, [payroll_ids]);
    
    sendSuccess(res, null, 'Payrolls processed successfully');
  } catch (error) {
    next(error);
  }
};

const deleteDraft = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });
    
    await query(`
      DELETE FROM hr_payrolls 
      WHERE month = $1 AND year = $2 AND status = 'Draft'
    `, [month, year]);
    
    sendSuccess(res, null, 'Draft payrolls deleted successfully');
  } catch (error) {
    next(error);
  }
};

const emailPayslip = async (req, res, next) => {
  try {
    const { payroll_id } = req.body;
    if (!payroll_id) return res.status(400).json({ success: false, message: 'Payroll ID required' });

    // Fetch the payslip details including the user's email
    const result = await query(`
      SELECT p.*, u.full_name, u.email, e.emp_code
      FROM hr_payrolls p
      JOIN hr_employees e ON p.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE p.payroll_id = $1
    `, [payroll_id]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Payslip not found' });
    
    const payslip = result.rows[0];
    if (!payslip.email) return res.status(400).json({ success: false, message: 'Employee has no email registered' });

    // Assuming we have the email utility
    const { sendEmail } = require('../../../../utils/email');
    
    const html = `
      <h2>Payslip for ${payslip.month}/${payslip.year}</h2>
      <p>Hello ${payslip.full_name},</p>
      <p>Your payslip for the period ${payslip.month}/${payslip.year} has been processed.</p>
      <div style="margin-top: 25px;">
        <a href="${process.env.BACKEND_URL || 'http://localhost:3000'}/api/hr/payrolls/download/${payslip.payroll_id}" style="background-color: #0369a1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Salary Slip</a>
      </div>
    `;

    await sendEmail({
      to: payslip.email,
      subject: `Payslip for ${payslip.month}/${payslip.year}`,
      html
    });

    sendSuccess(res, null, 'Payslip emailed successfully');
  } catch (error) {
    next(error);
  }
};

const downloadPayslip = async (req, res, next) => {
  try {
    const { payroll_id } = req.params;
    
    const result = await query(`
      SELECT p.*, u.full_name as employee_name, e.emp_code
      FROM hr_payrolls p
      JOIN hr_employees e ON p.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE p.payroll_id = $1
    `, [payroll_id]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Payslip not found' });
    
    const payslip = result.rows[0];

    const { getPdfHtml } = require('../utils/pdfTemplate');
    const htmlContent = getPdfHtml(payslip, false);

    const htmlPdf = require('html-pdf-node');
    const file = { content: htmlContent };
    const options = { format: 'A4', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }, printBackground: true };
    
    htmlPdf.generatePdf(file, options).then(pdfBuffer => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.employee_name.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf"`);
      res.send(pdfBuffer);
    }).catch(err => {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalaryStructures,
  updateSalaryStructure,
  getPayrolls,
  generatePayroll,
  processPayroll,
  deleteDraft,
  emailPayslip,
  downloadPayslip
};
