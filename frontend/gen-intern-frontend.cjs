const fs = require('fs');
const path = require('path');

// 1. API - hr.js
const apiPath = path.join(__dirname, 'src', 'api', 'hr.js');
if (fs.existsSync(apiPath)) {
    let apiContent = fs.readFileSync(apiPath, 'utf8');
    if (!apiContent.includes('fetchInternsApi')) {
        let internApi = `
export const fetchInternsApi = () => api.get('/hr/interns');
export const fetchInternDashboardStatsApi = () => api.get('/hr/interns/dashboard');
export const createInternApi = (data) => api.post('/hr/interns', data);
export const fetchInternByIdApi = (id) => api.get(\`/hr/interns/\${id}\`);
export const updateInternApi = (id, data) => api.put(\`/hr/interns/\${id}\`, data);
export const deleteInternApi = (id) => api.delete(\`/hr/interns/\${id}\`);
export const convertInternToEmployeeApi = (id, data) => api.post(\`/hr/interns/\${id}/convert\`, data);
export const convertInternToTraineeApi = (id, data) => api.post(\`/hr/interns/\${id}/convert-to-trainee\`, data);
export const assignTrainingToInternApi = (id, data) => api.post(\`/hr/interns/\${id}/assign-training\`, data);
`;
        apiContent += internApi;
        fs.writeFileSync(apiPath, apiContent);
        console.log('Updated hr.js');
    }
}

// 2. TraineeList.jsx -> InternList.jsx
const traineeListPath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'TraineeList.jsx');
const internListPath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'InternList.jsx');
if (fs.existsSync(traineeListPath)) {
    let listContent = fs.readFileSync(traineeListPath, 'utf8');
    listContent = listContent.replace(/trainee/g, 'intern');
    listContent = listContent.replace(/Trainee/g, 'Intern');
    listContent = listContent.replace(/TRAINEE/g, 'INTERN');
    fs.writeFileSync(internListPath, listContent);
    console.log('Created InternList.jsx');
}

// 3. AddTraineeWizard.jsx -> AddInternWizard.jsx
const addTraineePath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'AddTraineeWizard.jsx');
const addInternPath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'AddInternWizard.jsx');
if (fs.existsSync(addTraineePath)) {
    let addContent = fs.readFileSync(addTraineePath, 'utf8');
    addContent = addContent.replace(/trainee/g, 'intern');
    addContent = addContent.replace(/Trainee/g, 'Intern');
    addContent = addContent.replace(/TRAINEE/g, 'INTERN');
    fs.writeFileSync(addInternPath, addContent);
    console.log('Created AddInternWizard.jsx');
}

// 4. TraineeProfile.jsx -> InternProfile.jsx
const profilePath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'TraineeProfile.jsx');
const internProfilePath = path.join(__dirname, 'src', 'modules', 'hr', 'pages', 'InternProfile.jsx');
if (fs.existsSync(profilePath)) {
    let profileContent = fs.readFileSync(profilePath, 'utf8');
    profileContent = profileContent.replace(/trainee/g, 'intern');
    profileContent = profileContent.replace(/Trainee/g, 'Intern');
    profileContent = profileContent.replace(/TRAINEE/g, 'INTERN');
    
    // Add "Convert to Trainee" button logic
    const convertToEmpRegex = /<button[\s\S]*?onClick=\{openConvertModal\}[\s\S]*?Convert to Employee[\s\S]*?<\/button>/m;
    const match = profileContent.match(convertToEmpRegex);
    if (match) {
        let convertToTraineeBtn = `
        <button 
            onClick={() => setConvertTraineeModalOpen(true)}
            className="btn-outline border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-2 font-bold px-4 h-[42px] transition-colors bg-[var(--bg-workspace)]"
        >
            <UserPlus size={16} />
            Convert to Trainee
        </button>
        `;
        profileContent = profileContent.replace(match[0], convertToTraineeBtn + '\n' + match[0]);
    }

    // Add state for convertTraineeModalOpen
    const stateRegex = /const \[convertModalOpen, setConvertModalOpen\] = useState\(false\);/;
    const stateMatch = profileContent.match(stateRegex);
    if (stateMatch) {
        profileContent = profileContent.replace(stateMatch[0], stateMatch[0] + "\n  const [convertTraineeModalOpen, setConvertTraineeModalOpen] = useState(false);");
    }

    // Add API logic
    const apiImportRegex = /convertInternToEmployeeApi,/;
    profileContent = profileContent.replace(apiImportRegex, "convertInternToEmployeeApi, convertInternToTraineeApi,");

    const submitFuncRegex = /const handleConvertSubmit = async \(e\) => \{[\s\S]*?setIsConverting\(false\);\n  \};/;
    const submitMatch = profileContent.match(submitFuncRegex);
    if (submitMatch) {
        const handleTraineeSubmit = `
  const handleConvertTraineeSubmit = async () => {
    setIsConverting(true);
    try {
      const { data } = await convertInternToTraineeApi(id, {});
      if (data.success) {
        toast.success('Intern converted to Trainee successfully!');
        setConvertTraineeModalOpen(false);
        fetchIntern();
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to convert to trainee');
    } finally {
      setIsConverting(false);
    }
  };
`;
        profileContent = profileContent.replace(submitMatch[0], submitMatch[0] + "\n" + handleTraineeSubmit);
    }

    // Add Modal for Trainee Conversion
    const modalRegex = /<Modal\s+isOpen=\{convertModalOpen\}[\s\S]*?<\/Modal>/;
    const modalMatch = profileContent.match(modalRegex);
    if (modalMatch) {
        const convertTraineeModal = `
      {/* Convert to Trainee Modal */}
      <Modal 
        isOpen={convertTraineeModalOpen}
        onClose={() => setConvertTraineeModalOpen(false)}
        title="Convert to Trainee"
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center rounded-full mx-auto">
            <UserPlus size={32} />
          </div>
          <h3 className="text-lg font-black text-[var(--text-main)]">Confirm Conversion</h3>
          <p className="text-[13px] font-medium text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            Are you sure you want to convert {intern?.first_name} {intern?.last_name} to a Trainee? This will transfer their profile into the Trainee module.
          </p>
          <div className="flex gap-4 pt-4 mt-6">
            <button 
              type="button"
              onClick={() => setConvertTraineeModalOpen(false)}
              className="flex-1 px-4 py-3 bg-[var(--bg-workspace)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl font-bold uppercase tracking-widest text-[12px] hover:bg-[var(--bg-card)] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleConvertTraineeSubmit}
              disabled={isConverting}
              className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-xl font-bold uppercase tracking-widest text-[12px] shadow-[0_0_15px_var(--accent)] hover:shadow-[0_0_25px_var(--accent)] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isConverting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Converting...</>
              ) : (
                'Confirm Conversion'
              )}
            </button>
          </div>
        </div>
      </Modal>
`;
        profileContent = profileContent.replace(modalMatch[0], modalMatch[0] + "\n" + convertTraineeModal);
    }
    
    fs.writeFileSync(internProfilePath, profileContent);
    console.log('Created InternProfile.jsx');
}

// 5. Update router/index.jsx
const routerPath = path.join(__dirname, 'src', 'router', 'index.jsx');
if (fs.existsSync(routerPath)) {
    let routerContent = fs.readFileSync(routerPath, 'utf8');
    
    // add imports
    if (!routerContent.includes('InternList')) {
        const imports = `
import InternList from '../modules/hr/pages/InternList';
import AddInternWizard from '../modules/hr/pages/AddInternWizard';
import InternProfile from '../modules/hr/pages/InternProfile';
`;
        routerContent = routerContent.replace(/import TraineeProfile from '\.\.\/modules\/hr\/pages\/TraineeProfile';/, 
            "import TraineeProfile from '../modules/hr/pages/TraineeProfile';" + imports);
    }
    
    // add routes
    if (!routerContent.includes('path="/hr/intern"')) {
        const routes = `
          <Route path="/hr/intern" element={<InternList />} />
          <Route path="/hr/intern/new" element={<AddInternWizard />} />
          <Route path="/hr/intern/:id" element={<InternProfile />} />
`;
        routerContent = routerContent.replace(/<Route path="\/hr\/trainee\/:id" element=\{<TraineeProfile \/>\} \/>/, 
            "<Route path=\"/hr/trainee/:id\" element={<TraineeProfile />} />" + routes);
        fs.writeFileSync(routerPath, routerContent);
        console.log('Updated router/index.jsx');
    }
}

// 6. Update HRLayout.jsx Sidebar
const layoutPath = path.join(__dirname, 'src', 'modules', 'hr', 'layout', 'HRLayout.jsx');
if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (!layoutContent.includes('label="Intern"')) {
        // Need to find where Trainee is added.
        // {hasPermission('hr', 'view', 'trainee') && <NavItem to="/hr/trainee" label="Trainee" icon={GraduationCap} />}
        const navRegex = /\{hasPermission\('hr', 'view', 'trainee'\) && <NavItem to="\/hr\/trainee" label="Trainee" icon=\{GraduationCap\} \/>\}/;
        // Wait, for Intern we can check if they have permission for trainee for now, or assume intern permission. 
        // We'll use trainee permission or assume true since intern role doesn't have an explicit permission in DB right now unless we add it.
        // The instructions don't mention a new permission role, I will use trainee permission for intern visibility.
        const newNav = `
          {hasPermission('hr', 'view', 'trainee') && <NavItem to="/hr/intern" label="Intern" icon={GraduationCap} />}
          {hasPermission('hr', 'view', 'trainee') && <NavItem to="/hr/trainee" label="Trainee" icon={GraduationCap} />}`;
        layoutContent = layoutContent.replace(navRegex, newNav);
        fs.writeFileSync(layoutPath, layoutContent);
        console.log('Updated HRLayout.jsx');
    }
}
