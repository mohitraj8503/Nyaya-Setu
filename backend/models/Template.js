const {
    pool
} = require("../config/db");


// ==========================================
// CREATE TEMPLATES TABLE
// ==========================================

const createTemplateTable = async () => {

    const query = `

        CREATE TABLE IF NOT EXISTS templates (

            id TEXT PRIMARY KEY,

            problem_id TEXT NOT NULL,

            subject_template TEXT NOT NULL,

            body_template TEXT NOT NULL,

            fields JSONB DEFAULT '[]'::jsonb,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

        );

    `;


    await pool.query(
        query
    );


    console.log(
        "Templates table ready"
    );

};


// ==========================================
// GET ALL TEMPLATES
// ==========================================

const getAllTemplates = async () => {

    const result =
        await pool.query(

            `
            SELECT
                id,

                problem_id AS "problemId",

                subject_template AS "subjectTemplate",

                body_template AS "bodyTemplate",

                fields,

                created_at AS "createdAt",

                updated_at AS "updatedAt"

            FROM templates

            ORDER BY
                problem_id ASC,
                id ASC
            `

        );


    return result.rows;

};


// ==========================================
// GET TEMPLATES BY PROBLEM ID
// ==========================================

const getTemplatesByProblemId =
    async (problemId) => {

        const result =
            await pool.query(

                `
                SELECT
                    id,

                    problem_id AS "problemId",

                    subject_template AS "subjectTemplate",

                    body_template AS "bodyTemplate",

                    fields,

                    created_at AS "createdAt",

                    updated_at AS "updatedAt"

                FROM templates

                WHERE problem_id = $1

                ORDER BY id ASC
                `,

                [
                    problemId
                ]

            );


        return result.rows;

    };


// ==========================================
// GET ONE TEMPLATE
// ==========================================

const getTemplateById =
    async (id) => {

        const result =
            await pool.query(

                `
                SELECT
                    id,

                    problem_id AS "problemId",

                    subject_template AS "subjectTemplate",

                    body_template AS "bodyTemplate",

                    fields,

                    created_at AS "createdAt",

                    updated_at AS "updatedAt"

                FROM templates

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

    createTemplateTable,

    getAllTemplates,

    getTemplatesByProblemId,

    getTemplateById

};