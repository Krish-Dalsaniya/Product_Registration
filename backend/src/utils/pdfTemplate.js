const val = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const valOrDash = (amount) => {
    const num = parseFloat(amount || 0);
    return num === 0 ? '-' : num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const generateReceiverCopy = (payslip, monthName, lastDay, fixedPay, variablePay, totalDeductions) => {
    return `
      <table>
        <tr>
            <td colspan="6" class="text-center font-bold header-title">SmarTec Solutions</td>
            <td colspan="2" class="text-right font-bold">Receiver Copy</td>
        </tr>
        <tr>
            <td colspan="8" class="text-center font-bold">10 Desai Appartement, Gotri Rd, opp. Dev Commercial Center, Vadodara, Gujarat 390021</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Name Of Employee</td>
            <td colspan="2">${payslip.employee_name || 'N/A'}</td>
            <td class="font-bold">Bank IFSC</td>
            <td>N/A</td>
            <td class="font-bold">Employee Code :- </td>
            <td class="text-right">${payslip.emp_code || 'N/A'}</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Department</td>
            <td colspan="2">N/A</td>
            <td class="font-bold">Bank A/c No</td>
            <td>N/A</td>
            <td class="font-bold">Date Of Joining:-</td>
            <td class="text-right">N/A</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Designation</td>
            <td colspan="2">N/A</td>
            <td colspan="2" class="text-center font-bold">Salary Slip</td>
            <td class="font-bold">Month :</td>
            <td class="text-right">${monthName}/${payslip.year}</td>
        </tr>

        <tr class="bg-gray font-bold text-center">
            <td>Total Days of<br/>Month</td>
            <td>Op. PL</td>
            <td>Utilized PL</td>
            <td>Leave of Current<br/>Month</td>
            <td>Late Comings<br/>and Personal<br/>Window Leaves</td>
            <td>Deductable<br/>Leave</td>
            <td>Available PL</td>
            <td>Total Working<br/>Days</td>
        </tr>
        <tr class="text-center">
            <td>${parseFloat(payslip.total_days_month || lastDay).toFixed(2)}</td>
            <td>${valOrDash(payslip.op_pl)}</td>
            <td>${valOrDash(payslip.utilized_pl)}</td>
            <td>${valOrDash(payslip.leave_of_current_month)}</td>
            <td>${valOrDash(payslip.late_comings)}</td>
            <td>${valOrDash(payslip.deductable_leave)}</td>
            <td>${valOrDash(payslip.available_pl)}</td>
            <td>${parseFloat(payslip.total_working_days || lastDay).toFixed(2)}</td>
        </tr>

        <tr class="bg-gray font-bold text-center">
            <td colspan="4">TOTAL CTC AMOUNT</td>
            <td>${val(fixedPay + variablePay)}</td>
            <td colspan="2">Income/ Earnings</td>
            <td>Amount (Rs.)</td>
        </tr>
        
        <tr>
            <td colspan="3" class="bg-gray font-bold text-center">Claims</td>
            <td colspan="2" class="bg-gray font-bold text-center">Amount (Rs.)</td>
            <td colspan="2" class="bg-gray font-bold text-center">Fixed Pay (A)</td>
            <td class="bg-gray"></td>
        </tr>

        <tr>
            <td colspan="3"></td><td colspan="2"></td>
            <td colspan="2">Basic</td>
            <td class="text-right">${val(payslip.basic_salary)}</td>
        </tr>
        <tr>
            <td colspan="3"></td><td colspan="2"></td>
            <td colspan="2">Dearness Allowance</td>
            <td class="text-right">${val(payslip.dearness_allowance)}</td>
        </tr>
        <tr>
            <td colspan="3" class="font-bold">Total Claims (A)</td>
            <td colspan="2" class="text-right font-bold">${val(payslip.claims_amount)}</td>
            <td colspan="2">House Rent Allowance (HRA)</td>
            <td class="text-right">${val(payslip.hra)}</td>
        </tr>
        <tr>
            <td colspan="3" class="bg-gray font-bold text-center">Deduction</td>
            <td colspan="2" class="bg-gray font-bold text-center">Amount (Rs.)</td>
            <td colspan="2">Medical Allowance</td>
            <td class="text-right">${val(payslip.medical_allowance)}</td>
        </tr>
        <tr>
            <td colspan="3">TDS</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.tds)}</td>
            <td colspan="2">Travel Allowance</td>
            <td class="text-right">${val(payslip.travel_allowance)}</td>
        </tr>
        <tr>
            <td colspan="3">Employee Contributions (Provident Funds)</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.pf_deduction)}</td>
            <td colspan="2">Special Allowance</td>
            <td class="text-right">${val(payslip.special_allowance)}</td>
        </tr>
        <tr>
            <td colspan="3">Employee Contributions (ESI)</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.esi_deduction)}</td>
            <td colspan="2" class="bg-gray font-bold">Sub Total (C)</td>
            <td class="text-right bg-gray font-bold">${val(fixedPay)}</td>
        </tr>
        <tr>
            <td colspan="3">Professional Tax</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.professional_tax)}</td>
            <td colspan="2" class="bg-gray font-bold text-center">Variable Pay (B)</td>
            <td class="bg-gray"></td>
        </tr>
        <tr>
            <td colspan="3">Internal Montly EMI dedictons</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.internal_emi)}</td>
            <td colspan="2">Performance Incentive</td>
            <td class="text-right">${val(payslip.performance_incentive)}</td>
        </tr>
        <tr>
            <td colspan="3">Deductions against Personal Advances</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.personal_advance_deduction)}</td>
            <td colspan="2">Non Compete Incentive</td>
            <td class="text-right">${val(payslip.non_compete_incentive)}</td>
        </tr>
        <tr>
            <td colspan="3">Deductions against Official Advances</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.official_advance_deduction)}</td>
            <td colspan="2">On Project Incentive</td>
            <td class="text-right">${val(payslip.on_project_incentive)}</td>
        </tr>
        <tr>
            <td colspan="3">Deductions Against Performance Incentives</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.performance_incentive_deduction)}</td>
            <td colspan="2">Recreational Incentive</td>
            <td class="text-right">${val(payslip.recreational_incentive)}</td>
        </tr>
        <tr>
            <td colspan="3">Deductions Against On-Project Incentives</td>
            <td colspan="2" class="text-right">${valOrDash(payslip.on_project_incentive_deduction)}</td>
            <td colspan="2" class="bg-gray font-bold">Sub Total (D)</td>
            <td class="text-right bg-gray font-bold">${val(variablePay)}</td>
        </tr>
        
        <tr class="bg-gray font-bold">
            <td colspan="3">Total Deductions (B)</td>
            <td colspan="2" class="text-right">${val(totalDeductions)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr class="bg-gray font-bold">
            <td colspan="6" class="text-center">Net Payable For Current Month (A+B-C+D)</td>
            <td colspan="2" class="text-right">${val(payslip.net_salary)}</td>
        </tr>
        <tr>
            <td colspan="8" style="padding-top: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div class="signature-box">Stamp<br/>Here</div>
                    <div style="margin-bottom: 5px;">Receiver's Signature : _________________________</div>
                    <div style="margin-bottom: 5px;">Authorised Signature : _________________________</div>
                </div>
                <div class="text-center font-bold" style="margin-top: 10px;">This is electronically generated slip hence does not require signature.</div>
            </td>
        </tr>
      </table>
    `;
};

const generateOfficeCopy = (payslip, monthName, lastDay, fixedPay, variablePay, totalDeductions) => {
    return `
      <table style="margin-top: 15px;">
        <tr>
            <td colspan="6" class="text-center font-bold header-title">SmarTec Solutions</td>
            <td colspan="2" class="text-right font-bold">Office Copy</td>
        </tr>
        <tr>
            <td colspan="8" class="text-center font-bold">10 Desai Appartement, Gotri Rd, opp. Dev Commercial Center, Vadodara, Gujarat 390021</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Name Of Employee</td>
            <td colspan="2">${payslip.employee_name || 'N/A'}</td>
            <td class="font-bold">Bank IFSC</td>
            <td>N/A</td>
            <td class="font-bold">Employee Code :- </td>
            <td class="text-right">${payslip.emp_code || 'N/A'}</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Department</td>
            <td colspan="2">N/A</td>
            <td class="font-bold">Bank A/c No</td>
            <td>N/A</td>
            <td class="font-bold">Date Of Joining:-</td>
            <td class="text-right">N/A</td>
        </tr>
        <tr>
            <td colspan="2" class="font-bold">Designation</td>
            <td colspan="2">N/A</td>
            <td colspan="2" class="text-center font-bold">Salary Slip</td>
            <td class="font-bold">Month :</td>
            <td class="text-right">${monthName}/${payslip.year}</td>
        </tr>

        <tr class="bg-gray font-bold text-center">
            <td>Total Days of<br/>Month</td>
            <td>Op. PL</td>
            <td>Utilized PL</td>
            <td>Leave of Current<br/>Month</td>
            <td>Late Comings<br/>and Personal<br/>Window Leaves</td>
            <td>Deductable<br/>Leave</td>
            <td>Available PL</td>
            <td>Total Working<br/>Days</td>
        </tr>
        <tr class="text-center">
            <td>${parseFloat(payslip.total_days_month || lastDay).toFixed(2)}</td>
            <td>${valOrDash(payslip.op_pl)}</td>
            <td>${valOrDash(payslip.utilized_pl)}</td>
            <td>${valOrDash(payslip.leave_of_current_month)}</td>
            <td>${valOrDash(payslip.late_comings)}</td>
            <td>${valOrDash(payslip.deductable_leave)}</td>
            <td>${valOrDash(payslip.available_pl)}</td>
            <td>${parseFloat(payslip.total_working_days || lastDay).toFixed(2)}</td>
        </tr>

        <tr class="bg-gray font-bold text-center">
            <td colspan="4">Income/ Earnings</td>
            <td>Amount (Rs.)</td>
            <td colspan="2">Deduction C</td>
            <td>Amount (Rs.)</td>
        </tr>
        
        <tr>
            <td colspan="4" class="bg-gray font-bold text-center">Fixed Pay (A)</td>
            <td class="bg-gray"></td>
            <td colspan="2">TDS</td>
            <td class="text-right">${valOrDash(payslip.tds)}</td>
        </tr>
        <tr>
            <td colspan="4">Basic</td>
            <td class="text-right">${val(payslip.basic_salary)}</td>
            <td colspan="2">Advance</td>
            <td class="text-right">${valOrDash(parseFloat(payslip.personal_advance_deduction || 0) + parseFloat(payslip.official_advance_deduction || 0))}</td>
        </tr>
        <tr>
            <td colspan="4">Dearness Allowance</td>
            <td class="text-right">${val(payslip.dearness_allowance)}</td>
            <td colspan="2">Professional Tax</td>
            <td class="text-right">${valOrDash(payslip.professional_tax)}</td>
        </tr>
        <tr>
            <td colspan="4">House Rent Allowance (HRA)</td>
            <td class="text-right">${val(payslip.hra)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Medical Allowance</td>
            <td class="text-right">${val(payslip.medical_allowance)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Travel Allowance</td>
            <td class="text-right">${val(payslip.travel_allowance)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Special Allowance</td>
            <td class="text-right">${val(payslip.special_allowance)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr class="bg-gray font-bold">
            <td colspan="4">Sub Total (A)</td>
            <td class="text-right">${val(fixedPay)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>

        <tr class="bg-gray font-bold text-center">
            <td colspan="4">Variable Pay (B)</td>
            <td></td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Performance Incentive</td>
            <td class="text-right">${val(payslip.performance_incentive)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Non Compete Incentive</td>
            <td class="text-right">${val(payslip.non_compete_incentive)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">On Project Incentive</td>
            <td class="text-right">${val(payslip.on_project_incentive)}</td>
            <td colspan="2"></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4">Recreational Incentive</td>
            <td class="text-right">${val(payslip.recreational_incentive)}</td>
            <td colspan="2" class="font-bold">Total Deductions C</td>
            <td class="text-right font-bold">${val(totalDeductions)}</td>
        </tr>
        <tr class="bg-gray font-bold">
            <td colspan="4">Sub Total (B)</td>
            <td class="text-right">${val(variablePay)}</td>
            <td colspan="2">Net Payable For Current Month (A+B-C)</td>
            <td class="text-right">${val(fixedPay + variablePay - totalDeductions)}</td>
        </tr>
        
        <tr>
            <td colspan="8" style="padding-top: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div class="signature-box">Stamp<br/>Here</div>
                    <div style="margin-bottom: 5px;">Receiver's Signature : _________________________</div>
                    <div style="margin-bottom: 5px;">Authorised Signature : _________________________</div>
                </div>
                <div class="text-center font-bold" style="margin-top: 10px;">This is electronically generated slip hence does not require signature.</div>
            </td>
        </tr>
      </table>
    `;
};

const getPdfHtml = (payslip, isFrontend = false) => {
    const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'short' });
    const lastDay = new Date(payslip.year, payslip.month, 0).getDate();

    const fixedPay = parseFloat(payslip.basic_salary || 0) + parseFloat(payslip.hra || 0) + parseFloat(payslip.special_allowance || 0) + parseFloat(payslip.travel_allowance || 0) + parseFloat(payslip.medical_allowance || 0) + parseFloat(payslip.dearness_allowance || 0);
    const variablePay = parseFloat(payslip.performance_incentive || 0) + parseFloat(payslip.non_compete_incentive || 0) + parseFloat(payslip.on_project_incentive || 0) + parseFloat(payslip.recreational_incentive || 0);
    
    // Only includes deductions that are subtracted from the gross. 
    // Wait, the PDF says: C = TDS, Advance, Professional Tax. But there are also other deductions in Receiver Copy.
    const totalDeductions = parseFloat(payslip.pf_deduction || 0) + parseFloat(payslip.professional_tax || 0) + parseFloat(payslip.tds || 0) + parseFloat(payslip.esi_deduction || 0) + parseFloat(payslip.internal_emi || 0) + parseFloat(payslip.personal_advance_deduction || 0) + parseFloat(payslip.official_advance_deduction || 0) + parseFloat(payslip.performance_incentive_deduction || 0) + parseFloat(payslip.on_project_incentive_deduction || 0);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Salary Slip</title>
    <style>
        body {
            margin: 0;
            padding: 10px;
            background-color: #ffffff;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 3px 4px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .bg-gray { background-color: #d1d5db; }
        .header-title { font-size: 12px; }
        .signature-box {
            height: 40px;
            border: 1px solid #000;
            width: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            margin-left: 5px;
        }
    </style>
</head>
<body>
    ${generateReceiverCopy(payslip, monthName, lastDay, fixedPay, variablePay, totalDeductions)}
    ${generateOfficeCopy(payslip, monthName, lastDay, fixedPay, variablePay, totalDeductions)}
</body>
</html>
    `;
};

module.exports = { getPdfHtml };
