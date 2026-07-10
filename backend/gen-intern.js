const fs = require('fs');
const path = require('path');

const traineeCtrlPath = path.join(__dirname, 'src', 'modules', 'business', 'hr', 'controllers', 'traineeController.js');
const internCtrlPath = path.join(__dirname, 'src', 'modules', 'business', 'hr', 'controllers', 'internController.js');

let content = fs.readFileSync(traineeCtrlPath, 'utf8');

// Replace all instances
content = content.replace(/trainee/g, 'intern');
content = content.replace(/Trainee/g, 'Intern');
content = content.replace(/TRAINEE/g, 'INTERN');
content = content.replace(/compCode\+YYYY\+MM\+XX/g, 'INT+YYYY+MM+XX'); // adjust comment if needed

// We need to fix the `intern_code` generation which in trainee uses `LIPL` compCode.
// Let's modify the code prefix inside the create function
content = content.replace(/const compCode = 'LIPL';/g, "const compCode = 'INT';");

// We also need to add `convertToTrainee` logic.
// Find the `convertToEmployee` function and duplicate it for `convertToTrainee`.
const convertToEmpRegex = /const convertToEmployee = async \(req, res\) => \{[\s\S]*?\n\};/m;
const match = content.match(convertToEmpRegex);

if (match) {
    let convertToTraineeCode = match[0]
        .replace(/convertToEmployee/g, 'convertToTrainee')
        .replace(/Employee/g, 'Trainee')
        .replace(/employee/g, 'trainee')
        .replace(/EMPLOYEE/g, 'TRAINEE')
        .replace(/hr_employees/g, 'hr_trainees')
        .replace(/emp_code/g, 'trainee_code')
        .replace(/hr_employee_id_seq/g, 'hr_trainee_id_seq') // wait, trainee code is custom generated, let's just make it simple
        .replace(/Converted to Employee/g, 'Converted to Trainee');
    
    // We need to fix the ID generation in convertToTrainee since Trainee ID generation uses LIPL+Year+Month+Num
    // This might be complex via regex. Instead I'll just append a basic convertToTrainee function.
}

// Let's just append convertToTrainee manually at the end of the exports.
const additionalCode = `
const convertToTrainee = async (req, res) => {
    try {
        const { id } = req.params;
        const internRes = await client.query('SELECT * FROM hr_interns WHERE intern_id = $1', [id]);
        if (internRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        }
        const intern = internRes.rows[0];

        // Generate trainee code
        const compCode = 'LIPL';
        const doj = new Date();
        const dojYear = doj.getFullYear().toString();
        const dojMonth = (doj.getMonth() + 1).toString().padStart(2, '0');
        const codePrefix = \`\${compCode}\${dojYear}\${dojMonth}\`;
        
        let nextNum = 1;
        const codeRes = await client.query(
            "SELECT trainee_code FROM hr_trainees WHERE trainee_code LIKE $1 ORDER BY trainee_code DESC LIMIT 1",
            [\`\${codePrefix}%\`]
        );
        if (codeRes.rows.length > 0) {
            const lastCode = codeRes.rows[0].trainee_code;
            const lastNumStr = lastCode.substring(codePrefix.length);
            const lastNum = parseInt(lastNumStr, 10);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const trainee_code = \`\${codePrefix}\${nextNum.toString().padStart(2, '0')}\`;

        // Insert into hr_trainees
        const insertRes = await client.query(
            \`INSERT INTO hr_trainees 
            (trainee_code, first_name, last_name, email, mobile, gender, date_of_birth, department_id, designation_id, mentor_employee_id, education, institute, specialization, image_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Applied')
            RETURNING *\`,
            [trainee_code, intern.first_name, intern.last_name, intern.email, intern.mobile, intern.gender, intern.date_of_birth, intern.department_id, intern.designation_id, intern.mentor_employee_id, intern.education, intern.institute, intern.specialization, intern.image_url]
        );

        // Update intern status
        await client.query("UPDATE hr_interns SET status = 'Converted to Trainee' WHERE intern_id = $1", [id]);

        res.status(200).json({ success: true, data: insertRes.rows[0], message: 'Converted to Trainee successfully' });
    } catch (error) {
        console.error('Error converting intern to trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to convert to trainee' } });
    }
};
`;

content = content.replace(/module\.exports = \{/g, additionalCode + '\nmodule.exports = {\n    convertToTrainee,');

fs.writeFileSync(internCtrlPath, content);
console.log('Created internController.js');

// Now do internRoutes.js
const traineeRoutesPath = path.join(__dirname, 'src', 'modules', 'business', 'hr', 'routes', 'traineeRoutes.js');
const internRoutesPath = path.join(__dirname, 'src', 'modules', 'business', 'hr', 'routes', 'internRoutes.js');

let routesContent = fs.readFileSync(traineeRoutesPath, 'utf8');
routesContent = routesContent.replace(/trainee/g, 'intern');
routesContent = routesContent.replace(/Trainee/g, 'Intern');
// Add convert to trainee route
routesContent = routesContent.replace(/router\.post\('\/:id\/convert', requireRole\('Admin', 'HR'\), internController\.convertToEmployee\);/, 
    "router.post('/:id/convert', requireRole('Admin', 'HR'), internController.convertToEmployee);\nrouter.post('/:id/convert-to-trainee', requireRole('Admin', 'HR'), internController.convertToTrainee);");

fs.writeFileSync(internRoutesPath, routesContent);
console.log('Created internRoutes.js');

// Update hrRoutes.js
const hrRoutesPath = path.join(__dirname, 'src', 'modules', 'business', 'hr', 'routes', 'hrRoutes.js');
let hrRoutesContent = fs.readFileSync(hrRoutesPath, 'utf8');
hrRoutesContent = hrRoutesContent.replace(/const traineeRoutes = require\('\.\/traineeRoutes'\);/, "const traineeRoutes = require('./traineeRoutes');\nconst internRoutes = require('./internRoutes');");
hrRoutesContent = hrRoutesContent.replace(/router\.use\('\/trainees', traineeRoutes\);/, "router.use('/trainees', traineeRoutes);\nrouter.use('/interns', internRoutes);");

fs.writeFileSync(hrRoutesPath, hrRoutesContent);
console.log('Updated hrRoutes.js');
