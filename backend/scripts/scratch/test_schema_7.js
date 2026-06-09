const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/inventory/structural/19');
    console.log(res.data.data.images);
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.response?.data || e.message);
    process.exit(1);
  }
})();
