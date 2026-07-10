const fs = require('fs');
const path = require('path');

const traineeApiPath = path.join(__dirname, 'src', 'api', 'trainee.js');
const internApiPath = path.join(__dirname, 'src', 'api', 'intern.js');

let apiContent = fs.readFileSync(traineeApiPath, 'utf8');

// Replace standard terms
apiContent = apiContent.replace(/trainee/g, 'intern');
apiContent = apiContent.replace(/Trainee/g, 'Intern');
apiContent = apiContent.replace(/TRAINEE/g, 'INTERN');

// For Intern, we also added convertToTrainee
apiContent += `\n
export const convertInternToTraineeApi = (id) => {
    return axiosInstance.post(\`/hr/interns/\${id}/convert-to-trainee\`);
};
`;

fs.writeFileSync(internApiPath, apiContent);
console.log('Created intern.js');
