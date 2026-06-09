import pool from '../../lib/db';

export default async function handler(req, res) {
    try {
        const result = await pool.query('SELECT NOW() as time, version() as version');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
