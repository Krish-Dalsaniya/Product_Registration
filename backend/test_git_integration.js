const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

async function testGitIntegration() {
  const token = jwt.sign(
    { user_id: '123e4567-e89b-12d3-a456-426614174000', role_name: 'Admin', email: 'test@admin.com' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const baseURL = 'http://localhost:5000/api';

  try {
    console.log('--- Testing Git Engine /repos Endpoint ---');
    const reposRes = await fetch(`${baseURL}/integrations/git/repos`, { headers });
    if (!reposRes.ok) throw new Error(`HTTP ${reposRes.status}: ${await reposRes.text()}`);
    const reposData = await reposRes.json();
    console.log('✅ Repositories:', reposData.data.slice(0, 2).map(r => r.name));
  } catch (error) {
    console.log('⚠️ Failed to fetch repos (Git engine offline?):', error.message);
  }

  try {
    console.log('\n--- Testing Git Engine /issues Endpoint (mihir/git-tool) ---');
    const issuesRes = await fetch(`${baseURL}/integrations/git/repos/mihir/git-tool/issues`, { headers });
    if (!issuesRes.ok) throw new Error(`HTTP ${issuesRes.status}: ${await issuesRes.text()}`);
    const issuesData = await issuesRes.json();
    console.log('✅ Issues (first 2):', issuesData.data.slice(0, 2).map(i => i.title));
  } catch (error) {
    console.log('⚠️ Failed to fetch issues (Git engine offline?):', error.message);
  }
    
  try {
    console.log('\n--- Testing Finished Goods Traceability Creation ---');
    // Fetch a product first to associate the finished good with
    const prodRes = await fetch(`${baseURL}/products`, { headers });
    if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}: ${await prodRes.text()}`);
    const prodData = await prodRes.json();
    const productId = prodData.data[0]?.product_id;
    
    if (productId) {
      const fgPayload = {
        product_id: productId,
        serial_number: `TEST-IOT-${Date.now()}`,
        status: 'In Stock',
        is_iot_device: true,
        repository_owner: 'mihir',
        repository_name: 'git-tool',
        branch: 'main',
        commit_sha: 'a1b2c3d4e5f6g7h8',
        tag: 'v1.0.0',
        firmware_binary_url: 'https://example.com/fw.bin',
        version: `1.0.${Date.now()}`
      };
      
      const fgRes = await fetch(`${baseURL}/finished-goods`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fgPayload)
      });
      if (!fgRes.ok) throw new Error(`HTTP ${fgRes.status}: ${await fgRes.text()}`);
      const fgData = await fgRes.json();
      console.log('✅ Created Finished Good with Traceability!');
    } else {
      console.log('⚠️ No products found to attach finished good to.');
    }
  } catch (error) {
    console.log('❌ Failed Finished Goods logic:', error.message);
    console.log('   (Note: This is expected due to the Postgres ownership error on finished_goods table)');
  }
  
  try {
    console.log('\n--- Testing PMS Projects Codebase Tracking ---');
    const existingProjectsRes = await fetch(`${baseURL}/pms/projects`, { headers });
    const existingProjectsData = await existingProjectsRes.json();
    const project = existingProjectsData.data[0];

    if (project) {
        const projectId = project.project_id;
        const projectPayload = {
            ...project,
            repository_owner: 'mihir',
            repository_name: 'git-tool'
        };
        
        const prjRes = await fetch(`${baseURL}/pms/projects/${projectId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(projectPayload)
        });
        if (!prjRes.ok) throw new Error(`HTTP ${prjRes.status}: ${await prjRes.text()}`);
        const prjData = await prjRes.json();
        console.log('✅ Updated PMS Project with Git Repo linked!');
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Repo linked: mihir/git-tool`);
    } else {
        console.log('⚠️ No projects found to attach repository to.');
    }
  } catch (error) {
    console.log('❌ Failed PMS Projects logic:', error.message);
  }

  console.log('\n🎉 SCRIPT EXECUTION COMPLETE!');
}

testGitIntegration();
