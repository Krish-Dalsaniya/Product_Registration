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
             COALESCE(ss.dearness_allowance, 0) as dearness_allowance,
             COALESCE(ss.performance_incentive, 0) as performance_incentive,
             COALESCE(ss.non_compete_incentive, 0) as non_compete_incentive,
             COALESCE(ss.on_project_incentive, 0) as on_project_incentive,
             COALESCE(ss.recreational_incentive, 0) as recreational_incentive,
             COALESCE(ss.claims_amount, 0) as claims_amount,
             COALESCE(ss.pf_deduction, 0) as pf_deduction,
             COALESCE(ss.professional_tax, 0) as professional_tax,
             COALESCE(ss.tds, 0) as tds,
             COALESCE(ss.esi_deduction, 0) as esi_deduction,
             COALESCE(ss.internal_emi, 0) as internal_emi,
             COALESCE(ss.personal_advance_deduction, 0) as personal_advance_deduction,
             COALESCE(ss.official_advance_deduction, 0) as official_advance_deduction,
             COALESCE(ss.performance_incentive_deduction, 0) as performance_incentive_deduction,
             COALESCE(ss.on_project_incentive_deduction, 0) as on_project_incentive_deduction
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
    const body = req.body;
    
    await query(`
      INSERT INTO hr_salary_structures (
        employee_id, basic_salary, hra, special_allowance, travel_allowance, medical_allowance, dearness_allowance,
        performance_incentive, non_compete_incentive, on_project_incentive, recreational_incentive,
        claims_amount,
        pf_deduction, professional_tax, tds, esi_deduction, internal_emi,
        personal_advance_deduction, official_advance_deduction,
        performance_incentive_deduction, on_project_incentive_deduction
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (employee_id) DO UPDATE
      SET basic_salary = EXCLUDED.basic_salary,
          hra = EXCLUDED.hra,
          special_allowance = EXCLUDED.special_allowance,
          travel_allowance = EXCLUDED.travel_allowance,
          medical_allowance = EXCLUDED.medical_allowance,
          dearness_allowance = EXCLUDED.dearness_allowance,
          performance_incentive = EXCLUDED.performance_incentive,
          non_compete_incentive = EXCLUDED.non_compete_incentive,
          on_project_incentive = EXCLUDED.on_project_incentive,
          recreational_incentive = EXCLUDED.recreational_incentive,
          claims_amount = EXCLUDED.claims_amount,
          pf_deduction = EXCLUDED.pf_deduction,
          professional_tax = EXCLUDED.professional_tax,
          tds = EXCLUDED.tds,
          esi_deduction = EXCLUDED.esi_deduction,
          internal_emi = EXCLUDED.internal_emi,
          personal_advance_deduction = EXCLUDED.personal_advance_deduction,
          official_advance_deduction = EXCLUDED.official_advance_deduction,
          performance_incentive_deduction = EXCLUDED.performance_incentive_deduction,
          on_project_incentive_deduction = EXCLUDED.on_project_incentive_deduction,
          updated_at = CURRENT_TIMESTAMP
    `, [
      employee_id, 
      body.basic_salary || 0, body.hra || 0, body.special_allowance || 0, body.travel_allowance || 0, body.medical_allowance || 0, body.dearness_allowance || 0,
      body.performance_incentive || 0, body.non_compete_incentive || 0, body.on_project_incentive || 0, body.recreational_incentive || 0,
      body.claims_amount || 0,
      body.pf_deduction || 0, body.professional_tax || 0, body.tds || 0, body.esi_deduction || 0, body.internal_emi || 0,
      body.personal_advance_deduction || 0, body.official_advance_deduction || 0,
      body.performance_incentive_deduction || 0, body.on_project_incentive_deduction || 0
    ]);
    
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
               COALESCE(ss.dearness_allowance, 0) as dearness_allowance,
               COALESCE(ss.performance_incentive, 0) as performance_incentive,
               COALESCE(ss.non_compete_incentive, 0) as non_compete_incentive,
               COALESCE(ss.on_project_incentive, 0) as on_project_incentive,
               COALESCE(ss.recreational_incentive, 0) as recreational_incentive,
               COALESCE(ss.claims_amount, 0) as claims_amount,
               COALESCE(ss.pf_deduction, 0) as pf_deduction,
               COALESCE(ss.professional_tax, 0) as professional_tax,
               COALESCE(ss.tds, 0) as tds,
               COALESCE(ss.esi_deduction, 0) as esi_deduction,
               COALESCE(ss.internal_emi, 0) as internal_emi,
               COALESCE(ss.personal_advance_deduction, 0) as personal_advance_deduction,
               COALESCE(ss.official_advance_deduction, 0) as official_advance_deduction,
               COALESCE(ss.performance_incentive_deduction, 0) as performance_incentive_deduction,
               COALESCE(ss.on_project_incentive_deduction, 0) as on_project_incentive_deduction
        FROM hr_employees e
        LEFT JOIN hr_salary_structures ss ON e.employee_id = ss.employee_id
        WHERE e.employment_status != 'Terminated'
      `);
      
      for (let emp of empResult.rows) {
        const fixed_pay = parseFloat(emp.basic_salary) + parseFloat(emp.hra) + parseFloat(emp.special_allowance) + parseFloat(emp.travel_allowance) + parseFloat(emp.medical_allowance) + parseFloat(emp.dearness_allowance);
        
        const variable_pay = parseFloat(emp.performance_incentive) + parseFloat(emp.non_compete_incentive) + parseFloat(emp.on_project_incentive) + parseFloat(emp.recreational_incentive);
        
        const claims = parseFloat(emp.claims_amount);

        const deductions = parseFloat(emp.pf_deduction) + parseFloat(emp.professional_tax) + parseFloat(emp.tds) + parseFloat(emp.esi_deduction) + parseFloat(emp.internal_emi) + parseFloat(emp.personal_advance_deduction) + parseFloat(emp.official_advance_deduction) + parseFloat(emp.performance_incentive_deduction) + parseFloat(emp.on_project_incentive_deduction);

        const net_salary = fixed_pay + variable_pay - deductions + claims;
        
        await client.query(`
          INSERT INTO hr_payrolls (
            employee_id, month, year, status,
            basic_salary, hra, special_allowance, travel_allowance, medical_allowance, dearness_allowance,
            performance_incentive, non_compete_incentive, on_project_incentive, recreational_incentive,
            claims_amount,
            pf_deduction, professional_tax, tds, esi_deduction, internal_emi,
            personal_advance_deduction, official_advance_deduction,
            performance_incentive_deduction, on_project_incentive_deduction,
            net_salary
          )
          VALUES ($1, $2, $3, 'Draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (employee_id, month, year) DO UPDATE
          SET basic_salary = EXCLUDED.basic_salary,
              hra = EXCLUDED.hra,
              special_allowance = EXCLUDED.special_allowance,
              travel_allowance = EXCLUDED.travel_allowance,
              medical_allowance = EXCLUDED.medical_allowance,
              dearness_allowance = EXCLUDED.dearness_allowance,
              performance_incentive = EXCLUDED.performance_incentive,
              non_compete_incentive = EXCLUDED.non_compete_incentive,
              on_project_incentive = EXCLUDED.on_project_incentive,
              recreational_incentive = EXCLUDED.recreational_incentive,
              claims_amount = EXCLUDED.claims_amount,
              pf_deduction = EXCLUDED.pf_deduction,
              professional_tax = EXCLUDED.professional_tax,
              tds = EXCLUDED.tds,
              esi_deduction = EXCLUDED.esi_deduction,
              internal_emi = EXCLUDED.internal_emi,
              personal_advance_deduction = EXCLUDED.personal_advance_deduction,
              official_advance_deduction = EXCLUDED.official_advance_deduction,
              performance_incentive_deduction = EXCLUDED.performance_incentive_deduction,
              on_project_incentive_deduction = EXCLUDED.on_project_incentive_deduction,
              net_salary = EXCLUDED.net_salary,
              updated_at = CURRENT_TIMESTAMP
        `, [
          emp.employee_id, month, year, 
          emp.basic_salary, emp.hra, emp.special_allowance, emp.travel_allowance, emp.medical_allowance, emp.dearness_allowance,
          emp.performance_incentive, emp.non_compete_incentive, emp.on_project_incentive, emp.recreational_incentive,
          emp.claims_amount,
          emp.pf_deduction, emp.professional_tax, emp.tds, emp.esi_deduction, emp.internal_emi,
          emp.personal_advance_deduction, emp.official_advance_deduction, emp.performance_incentive_deduction, emp.on_project_incentive_deduction,
          net_salary
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
    
    const baseUrl = process.env.FRONTEND_URL;
    const downloadUrl = `${baseUrl}/payslip/${payslip.payroll_id}`;

    const html = `
      <h2>Payslip for ${payslip.month}/${payslip.year}</h2>
      <p>Hello ${payslip.full_name},</p>
      <p>Your payslip for the period ${payslip.month}/${payslip.year} has been processed.</p>
      <div style="margin-top: 25px;">
        <a href="${downloadUrl}" style="background-color: #0369a1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Salary Slip</a>
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

    const { getPdfHtml } = require('../../../../utils/pdfTemplate');
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
