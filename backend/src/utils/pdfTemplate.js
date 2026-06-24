const generateTable = (payslip, copyType, monthName, lastDay, earningsTotal, deductionsTotal) => {
    return `
      <table>
        <tr>
            <td colspan="4" class="text-center font-bold header-title">SmarTec Solutions</td>
            <td colspan="1" class="text-right font-bold">${copyType}</td>
        </tr>
        <tr>
            <td colspan="5" class="text-center font-bold">10 Desai Appartement, Gotri Rd, opp. Dev Commercial Center, Vadodara, Gujarat 390021</td>
        </tr>
        <tr>
            <td class="font-bold">Name Of Employee</td>
            <td colspan="1">${payslip.employee_name || 'N/A'}</td>
            <td class="font-bold">Bank IFSC</td>
            <td>N/A</td>
            <td class="font-bold">Employee Code :- ${payslip.emp_code || 'N/A'}</td>
        </tr>
        <tr>
            <td class="font-bold">Department</td>
            <td colspan="1">N/A</td>
            <td class="font-bold">Bank A/c No</td>
            <td>N/A</td>
            <td class="font-bold">Date Of Joining:- N/A</td>
        </tr>
        <tr>
            <td class="font-bold">Designation</td>
            <td colspan="1">N/A</td>
            <td colspan="2" class="text-center font-bold">Salary Slip</td>
            <td class="font-bold">Month : ${monthName}/${payslip.year}</td>
        </tr>
        <tr class="bg-gray font-bold text-center">
            <td>Total Days of Month</td>
            <td>Op. PL</td>
            <td>Utilized PL</td>
            <td>Leave of Current Month</td>
            <td>Total Working Days</td>
        </tr>
        <tr class="text-center">
            <td>${lastDay}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${lastDay}</td>
        </tr>
        <tr class="bg-gray font-bold">
            <td colspan="2" class="text-center">Income/ Earnings</td>
            <td colspan="3" class="text-center">Deductions</td>
        </tr>
        <tr class="bg-gray font-bold text-center">
            <td>Fixed Pay (A)</td>
            <td>Amount (Rs.)</td>
            <td colspan="2">Deduction</td>
            <td>Amount (Rs.)</td>
        </tr>
        <tr>
            <td>Basic</td>
            <td class="text-right">${parseFloat(payslip.basic_salary || 0).toFixed(2)}</td>
            <td colspan="2">TDS</td>
            <td class="text-right">${parseFloat(payslip.tds || 0).toFixed(2)}</td>
        </tr>
        <tr>
            <td>House Rent Allowance (HRA)</td>
            <td class="text-right">${parseFloat(payslip.hra || 0).toFixed(2)}</td>
            <td colspan="2">Professional Tax</td>
            <td class="text-right">${parseFloat(payslip.professional_tax || 0).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Medical Allowance</td>
            <td class="text-right">${parseFloat(payslip.medical_allowance || 0).toFixed(2)}</td>
            <td colspan="2">Provident Fund (PF)</td>
            <td class="text-right">${parseFloat(payslip.pf_deduction || 0).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Travel Allowance</td>
            <td class="text-right">${parseFloat(payslip.travel_allowance || 0).toFixed(2)}</td>
            <td colspan="2">-</td>
            <td class="text-right">-</td>
        </tr>
        <tr>
            <td>Special Allowance</td>
            <td class="text-right">${parseFloat(payslip.special_allowance || 0).toFixed(2)}</td>
            <td colspan="2">-</td>
            <td class="text-right">-</td>
        </tr>
        <tr class="bg-gray font-bold">
            <td>Sub Total (A)</td>
            <td class="text-right">${earningsTotal.toFixed(2)}</td>
            <td colspan="2">Total Deductions (B)</td>
            <td class="text-right">${deductionsTotal.toFixed(2)}</td>
        </tr>
        <tr class="bg-gray font-bold">
            <td colspan="4" class="text-right">Net Payable For Current Month (A-B)</td>
            <td class="text-right">${parseFloat(payslip.net_salary || 0).toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="5">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px;">
                    <div class="signature-box">Stamp<br/>Here</div>
                    <div>Receiver's Signature : _________________________</div>
                    <div>Authorised Signature : _________________________</div>
                </div>
                <div class="text-center font-bold" style="margin-top: 10px;">This is electronically generated slip hence does not require signature.</div>
            </td>
        </tr>
      </table>
    `;
};

const getPdfHtml = (payslip, isFrontend = false) => {
    const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' });
    const shortMonth = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'short' });
    const lastDay = new Date(payslip.year, payslip.month, 0).getDate();

    const earningsTotal = parseFloat(payslip.basic_salary) + parseFloat(payslip.hra) + parseFloat(payslip.special_allowance) + parseFloat(payslip.travel_allowance) + parseFloat(payslip.medical_allowance);
    const deductionsTotal = parseFloat(payslip.pf_deduction) + parseFloat(payslip.professional_tax) + parseFloat(payslip.tds);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Salary Slip</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            font-family: Arial, sans-serif;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #000;
            padding: 4px 6px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .bg-gray { background-color: #d1d5db; }
        .header-title { font-size: 14px; }
        .signature-box {
            height: 60px;
            border: 1px solid #000;
            width: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
        }
    </style>
</head>
<body>
    ${generateTable(payslip, 'Receiver Copy', monthName, lastDay, earningsTotal, deductionsTotal)}
    <br/>
    ${generateTable(payslip, 'Office Copy', monthName, lastDay, earningsTotal, deductionsTotal)}
</body>
</html>
    `;
};

module.exports = { getPdfHtml };
