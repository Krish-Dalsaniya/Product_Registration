const { pool } = require('../../../../config/db');

exports.getHolidays = async (req, res) => {
    try {
        const { year } = req.query;
        let query = 'SELECT * FROM hr_holidays';
        let params = [];

        if (year) {
            query += ' WHERE EXTRACT(YEAR FROM date) = $1';
            params.push(year);
        }

        query += ' ORDER BY date ASC';

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.createHoliday = async (req, res) => {
    try {
        const { name, date, type } = req.body;
        
        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Name and date are required' });
        }

        const holidayType = type || 'NATIONAL';

        const result = await pool.query(
            'INSERT INTO hr_holidays (name, date, type) VALUES ($1, $2, $3) RETURNING *',
            [name, date, holidayType]
        );

        res.status(201).json({ success: true, data: result.rows[0], message: 'Holiday created successfully' });
    } catch (error) {
        console.error('Error creating holiday:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'A holiday already exists for this date' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM hr_holidays WHERE holiday_id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        res.json({ success: true, message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
