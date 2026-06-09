(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/inventory/structural/19', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || ''}` // if it requires token, we might fail. Let's see.
      }
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
