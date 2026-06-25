const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/hr/lms/module', {
            title: 'Test',
            duration_hours: '2.5'
        }, {
            headers: {
                Authorization: 'Bearer ' + (await require('fs/promises').readFile('/tmp/token.txt', 'utf8')).trim().replace('"', '').replace('"', '') // wait, I don't have a token.
            }
        });
        console.log(res.data);
    } catch(e) {
        console.log(e.response?.data || e.message);
    }
}
// wait, I don't have a token.
