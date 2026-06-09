const fs = require('fs');

const files = [
    'd:/Product_Registration/frontend/src/features/admin/ElectricalPartsPage.jsx',
    'd:/Product_Registration/frontend/src/features/admin/ElectronicsPartsPage.jsx',
    'd:/Product_Registration/frontend/src/features/admin/StructuralPartsPage.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');

    // 1. Add useRef to react import
    content = content.replace(
        /import React, \{ useState, useEffect, useMemo \} from 'react';/g,
        "import React, { useState, useEffect, useMemo, useRef } from 'react';"
    );

    // 2. Add isLoadingDetails state
    content = content.replace(
        /const \[selectedItem, setSelectedItem\] = useState\(null\);/g,
        "const [selectedItem, setSelectedItem] = useState(null);\n  const [isLoadingDetails, setIsLoadingDetails] = useState(false);"
    );

    // 3. Add editProcessedRef
    content = content.replace(
        /\/\/ Handle redirect from Inventory Overview for editing/g,
        "const editProcessedRef = useRef(false);\n\n  // Handle redirect from Inventory Overview for editing"
    );

    // 4. Fix useEffect to use editProcessedRef and window.history.replaceState
    content = content.replace(
        /\/\/ Handle redirect from Inventory Overview for editing\s+useEffect\(\(\) => \{\s+if \(location\.state\?\.editId\) \{\s+loadPartDetails\(location\.state\.editId, 'edit'\);\s+(?:\/\/.*?\s+)?(?:navigate\(location\.pathname, \{ replace: true, state: \{\} \}\);|window\.history\.replaceState\(\{\}, document\.title\);)\s+\}\s+\}, \[location\.state(?:, navigate)?\]\);/g,
        `// Handle redirect from Inventory Overview for editing
  useEffect(() => {
    if (location.state?.editId && !editProcessedRef.current) {
        editProcessedRef.current = true;
        loadPartDetails(location.state.editId, 'edit');
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);
    );

    // 5. Fix loadPartDetails to set isLoadingDetails
    content = content.replace(
        /setIsModalOpen\(true\);\s+try \{/g,
        "setIsModalOpen(true);\n    setIsLoadingDetails(true);\n    try {"
    );

    content = content.replace(
        /\} catch \(error\) \{ toast\.error\('Failed to load details'\); \}/g,
        "} catch (error) { toast.error('Failed to load details'); } finally { setIsLoadingDetails(false); }"
    );

    content = content.replace(
        /\} catch \(error\) \{\s+toast\.error\('Failed to load details'\);\s+\}/g,
        "} catch (error) {\n        toast.error('Failed to load details');\n      } finally {\n        setIsLoadingDetails(false);\n      }"
    );

    // 6. Wrap Modal content
    content = content.replace(
        /\) : \(\s+<div className="flex flex-col h-full max-h-\[85vh\]">/g,
        `) : isLoadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
              <Loader2 size={40} className="text-[var(--accent)] animate-spin mb-4" />
              <p className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Loading details...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[85vh]">`
    );

    fs.writeFileSync(file, content, 'utf-8');
});

console.log('Done');
