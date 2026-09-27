"use strict";

const { pool } = require("../config/postgres");

const findAllByUserId = async (userId) => {
    const query = `
        SELECT id, user_id, raw_text, parsed_keywords, created_at, updated_at
        FROM job_descriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
};

const findByIdAndUserId = async (id, userId) => {
    const query = `
        SELECT id, user_id, raw_text, parsed_keywords, created_at, updated_at
        FROM job_descriptions
        WHERE id = $1 AND user_id = $2
    `;
    const { rows } = await pool.query(query, [id, userId]);
    return rows[0] || null;
};

const create = async (userId, rawText, parsedKeywords = []) => {
    const query = `
        INSERT INTO job_descriptions (user_id, raw_text, parsed_keywords)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, raw_text, parsed_keywords, created_at, updated_at
    `;
    const { rows } = await pool.query(query, [userId, rawText, JSON.stringify(parsedKeywords)]);
    return rows[0];
};

const updateByIdAndUserId = async (id, userId, rawText) => {
    const query = `
        UPDATE job_descriptions
        SET raw_text = $1
        WHERE id = $2 AND user_id = $3
        RETURNING id, user_id, raw_text, parsed_keywords, created_at, updated_at
    `;
    const { rows } = await pool.query(query, [rawText, id, userId]);
    return rows[0] || null;
};

const deleteByIdAndUserId = async (id, userId) => {
    const query = `
        DELETE FROM job_descriptions
        WHERE id = $1 AND user_id = $2
        RETURNING id
    `;
    const { rows } = await pool.query(query, [id, userId]);
    return rows.length > 0;
};

module.exports = {
    findAllByUserId,
    findByIdAndUserId,
    create,
    updateByIdAndUserId,
    deleteByIdAndUserId
};
