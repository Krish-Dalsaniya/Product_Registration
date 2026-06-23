const fs = require('fs');
const path = require('path');
const converter = require('number-to-words');

const getPdfHtml = (payslip, isFrontend = false) => {
    const toCamelCase = (str) => {
      return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };
    const words = toCamelCase(converter.toWords(parseFloat(payslip.net_salary || 0)));

    const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' });
    const shortMonth = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'short' });
    const lastDay = new Date(payslip.year, payslip.month, 0).getDate();

    const earningsTotal = parseFloat(payslip.basic_salary) + parseFloat(payslip.hra) + parseFloat(payslip.special_allowance) + parseFloat(payslip.travel_allowance) + parseFloat(payslip.medical_allowance);
    const deductionsTotal = parseFloat(payslip.pf_deduction) + parseFloat(payslip.professional_tax) + parseFloat(payslip.tds);

    let logoSrc = '/text_logo.png';
    if (!isFrontend) {
        try {
            const logoPath = path.join(__dirname, '../../../../text_logo.png');
            const logoBase64 = fs.readFileSync(logoPath, 'base64');
            logoSrc = `data:image/png;base64,${logoBase64}`;
        } catch(e) {
            console.error('Error loading logo', e);
        }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Salary Slip</title>
    <style>
        body {
            margin: 0;
            padding: 2rem;
            background-color: #ffffff;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
        }

        .slip-container {
            max-width: 800px;
            width: 100%;
            background-color: #ffffff;
            position: relative;
            z-index: 1;
            padding: 2rem;
            color: #1e293b;
            box-sizing: border-box;
        }

        .header {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            margin-bottom: 2rem;
            text-align: center;
        }

        .logo-img {
            max-width: 350px;
            max-height: 100px;
            object-fit: contain;
            margin-bottom: 10px;
        }

        .payslip-title {
            font-size: 18px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #334155;
            margin: 0;
        }

        .section-title {
            background-color: #f1f5f9;
            border: 1px solid #1e293b;
            padding: 8px 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 1.5rem;
            margin-bottom: 0;
            font-size: 14px;
            color: #0f172a;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            border: 1px solid #1e293b;
        }

        th, td {
            border: 1px solid #1e293b;
            padding: 10px 16px;
        }

        th {
            background-color: #f8fafc;
            text-align: left;
            font-weight: 600;
            color: #0f172a;
        }

        td {
            color: #334155;
        }

        .td-label {
            font-weight: 600;
            color: #0f172a;
            background-color: #f8fafc;
            width: 20%;
        }

        .text-right {
            text-align: right;
        }

        .text-bold {
            font-weight: 700;
            color: #0f172a;
        }

        .split-tables {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            margin-top: 1.5rem;
            border: 1px solid #1e293b;
        }

        .split-tables table {
            border: none;
            margin: 0;
        }

        .split-tables .left-table {
            border-right: 1px solid #1e293b;
        }

        .split-tables th, .split-tables td {
            border-top: none;
            border-left: none;
            border-right: none;
        }
        
        .split-tables tr:last-child td {
            border-bottom: none;
        }

        .total-row td {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #1e293b !important;
        }

        .net-salary-container {
            margin-top: 1.5rem;
            display: flex;
            justify-content: flex-end;
        }

        .net-salary-table {
            width: 450px;
        }

        .net-salary-table td {
            font-size: 16px;
        }

        .net-salary-table .amount {
            font-size: 20px;
            font-weight: 800;
            background-color: #f1f5f9;
        }

        .footer {
            margin-top: 4rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .signatory {
            width: 200px;
            border-top: 1px solid #1e293b;
            padding-top: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 14px;
        }

        .generated-info {
            text-align: right;
            font-size: 12px;
            color: #64748b;
        }
        
        .company-info-bar {
            text-align: center;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 2rem;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="slip-container" id="payslip-content">
        <!-- Header -->
        <div class="header">
            <img src="${logoSrc}" alt="Logo" class="logo-img">
            <p class="payslip-title">Payslip for ${monthName} ${payslip.year}</p>
        </div>

        <div class="company-info-bar">
            Income Tax: 00001-47 &nbsp;|&nbsp; contact@crudex.com &nbsp;|&nbsp; CRUDEX Enterprises Pvt Ltd
        </div>

        <!-- Employee Details -->
        <div class="section-title">Employee Details</div>
        <table>
            <tr>
                <td class="td-label">Employee ID</td>
                <td width="30%">${payslip.emp_code}</td>
                <td class="td-label">Name</td>
                <td width="30%">${payslip.employee_name}</td>
            </tr>
            <tr>
                <td class="td-label">Department</td>
                <td>Engineering</td>
                <td class="td-label">Designation</td>
                <td>Software Engineer</td>
            </tr>
        </table>

        <!-- Payment Period -->
        <div class="section-title">Payment Period</div>
        <table>
            <tr>
                <td>Payslip for ${monthName} ${payslip.year}</td>
                <td class="text-right">01 ${shortMonth} ${payslip.year} – ${lastDay} ${shortMonth} ${payslip.year}</td>
            </tr>
        </table>

        <!-- Earnings & Deductions -->
        <div class="split-tables">
            <!-- Earnings -->
            <div class="left-table">
                <table>
                    <thead>
                        <tr>
                            <th>Earnings</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Basic Salary</td>
                            <td class="text-right">Rs.${parseFloat(payslip.basic_salary).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>HRA (40% of Basic)</td>
                            <td class="text-right">Rs.${parseFloat(payslip.hra).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>DA</td>
                            <td class="text-right">Rs.0.00</td>
                        </tr>
                        <tr>
                            <td>Special Allowance</td>
                            <td class="text-right">Rs.${parseFloat(payslip.special_allowance).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Other Allowances</td>
                            <td class="text-right">Rs.${(parseFloat(payslip.travel_allowance)+parseFloat(payslip.medical_allowance)).toFixed(2)}</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total Earnings</td>
                            <td class="text-right">Rs.${earningsTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Deductions -->
            <div class="right-table">
                <table>
                    <thead>
                        <tr>
                            <th>Deductions</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Provident Fund (PF)</td>
                            <td class="text-right" style="color: #ef4444;">Rs.${parseFloat(payslip.pf_deduction).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Professional Tax (PT)</td>
                            <td class="text-right" style="color: #ef4444;">Rs.${parseFloat(payslip.professional_tax).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Income Tax (TDS)</td>
                            <td class="text-right" style="color: #ef4444;">Rs.${parseFloat(payslip.tds).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Other Deductions</td>
                            <td class="text-right" style="color: #ef4444;">–</td>
                        </tr>
                        <tr>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total Deductions</td>
                            <td class="text-right" style="color: #ef4444;">Rs.${deductionsTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Net Salary -->
        <div class="net-salary-container">
            <table class="net-salary-table">
                <tr>
                    <td class="td-label">Net Salary<br><span style="font-size: 11px; font-weight: normal; font-style: italic;">Amount in Words: ${words} Rupees Only</span></td>
                    <td class="text-right text-bold amount">Rs.${parseFloat(payslip.net_salary).toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="signatory">
                Authorized Signatory
            </div>
            <div class="generated-info">
                <p style="margin: 0;">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p style="margin: 4px 0 0; color: #94a3b8;">System-generated payslip. No signature required.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { getPdfHtml };
