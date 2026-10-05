"use strict";

const { pool } = require("../config/postgres");

const create = async (userId, data) => {
    const query = `
        INSERT INTO outcomes (
            user_id, session_id, role, interview_type, overall_score,
            content_relevance_score, star_compliance_score, body_language_score,
            company_name, round, real_world_outcome, difficulty, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    `;
    const values = [
        userId,
        data.session_id,
        data.role,
        data.interview_type,
        data.overall_score,
        data.content_relevance_score,
        data.star_compliance_score,
        data.body_language_score,
        data.company_name || null,
        data.round || null,
        data.real_world_outcome || null,
        data.difficulty || null,
        data.completed_at
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const findAllByUserId = async (userId) => {
    const query = `
        SELECT *
        FROM outcomes
        WHERE user_id = $1
        ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
};

const getProgressByUserId = async (userId) => {
    const query = `
        SELECT 
            COUNT(*) as total_interviews,
            COALESCE(AVG(overall_score), 0) as average_score,
            COALESCE(MAX(overall_score), 0) as best_score,
            (SELECT overall_score FROM outcomes WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1) as latest_score
        FROM outcomes
        WHERE user_id = $1
    `;
    
    const historyQuery = `
        SELECT session_id, role, interview_type, overall_score, content_relevance_score, star_compliance_score, completed_at
        FROM outcomes
        WHERE user_id = $1
        ORDER BY completed_at ASC
    `;

    const statsResult = await pool.query(query, [userId]);
    const historyResult = await pool.query(historyQuery, [userId]);

    return {
        stats: statsResult.rows[0],
        history: historyResult.rows
    };
};

module.exports = {
    create,
    findAllByUserId,
    getProgressByUserId
};
