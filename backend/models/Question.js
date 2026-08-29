const {
    pool
} = require("../config/db");


// ==========================================
// CREATE QUESTIONS TABLE
// ==========================================

const createQuestionTable = async () => {

    const query = `

        CREATE TABLE IF NOT EXISTS questions (

            id TEXT PRIMARY KEY,

            wizard_id TEXT NOT NULL,

            label TEXT NOT NULL,

            type TEXT NOT NULL,

            options JSONB DEFAULT '[]'::jsonb,

            required BOOLEAN DEFAULT FALSE,

            next_rule JSONB DEFAULT NULL,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

        );

    `;


    await pool.query(
        query
    );


    console.log(
        "Questions table ready"
    );

};


// ==========================================
// GET ALL QUESTIONS
// ==========================================

const getAllQuestions = async () => {

    const result =
        await pool.query(

            `
            SELECT
                id,
                wizard_id AS "wizardId",
                label,
                type,
                options,
                required,
                next_rule AS "nextRule",
                created_at AS "createdAt",
                updated_at AS "updatedAt"

            FROM questions

            ORDER BY
                wizard_id ASC,
                id ASC
            `

        );


    return result.rows;

};


// ==========================================
// GET QUESTIONS BY WIZARD
// ==========================================

const getQuestionsByWizardId =
    async (wizardId) => {

        const result =
            await pool.query(

                `
                SELECT
                    id,
                    wizard_id AS "wizardId",
                    label,
                    type,
                    options,
                    required,
                    next_rule AS "nextRule",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"

                FROM questions

                WHERE wizard_id = $1

                ORDER BY id ASC
                `,

                [
                    wizardId
                ]

            );


        return result.rows;

    };


// ==========================================
// GET ONE QUESTION
// ==========================================

const getQuestionById =
    async (id) => {

        const result =
            await pool.query(

                `
                SELECT
                    id,
                    wizard_id AS "wizardId",
                    label,
                    type,
                    options,
                    required,
                    next_rule AS "nextRule",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"

                FROM questions

                WHERE id = $1
                `,

                [
                    id
                ]

            );


        return result.rows[0];

    };


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    createQuestionTable,

    getAllQuestions,

    getQuestionsByWizardId,

    getQuestionById

};