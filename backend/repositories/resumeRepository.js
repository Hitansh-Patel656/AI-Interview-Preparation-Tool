"use strict";

const { pool } = require("../config/postgres");

const findByUserId = async (userId) => {
    const query = `
        SELECT user_id, file_name as "fileName", file_path as "filePath", parsed_data as "parsedData", uploaded_at as "uploadedAt"
        FROM user_resumes
        WHERE user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
};

const upsert = async (userId, fileName, filePath, parsedData) => {
    const query = `
        INSERT INTO user_resumes (user_id, file_name, file_path, parsed_data, uploaded_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE 
        SET file_name = EXCLUDED.file_name,
            file_path = EXCLUDED.file_path,
            parsed_data = EXCLUDED.parsed_data,
            uploaded_at = EXCLUDED.uploaded_at,
            updated_at = NOW()
        RETURNING user_id, file_name as "fileName", file_path as "filePath", parsed_data as "parsedData", uploaded_at as "uploadedAt"
    `;
    const { rows } = await pool.query(query, [
        userId,
        fileName,
        filePath,
        parsedData ? JSON.stringify(parsedData) : null
    ]);
    return rows[0];
};

const deleteByUserId = async (userId) => {
    const query = `
        DELETE FROM user_resumes
        WHERE user_id = $1
        RETURNING user_id
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows.length > 0;
};

module.exports = {
    findByUserId,
    upsert,
    deleteByUserId
};
