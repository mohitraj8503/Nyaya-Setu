const express = require("express");

const {
    pool
} = require("../config/db");


const router =
    express.Router();


// ==========================================
// GET ALL PROBLEMS
// ==========================================

router.get(
    "/",
    async (req, res) => {

        try {

            const result =
                await pool.query(`

                    SELECT
                        id,
                        title,
                        category,
                        description,
                        keywords,
                        intro,
                        wizard_id AS "wizardId",
                        common_evidence AS "commonEvidence",
                        route_ids AS "routeIds",
                        created_at AS "createdAt",
                        updated_at AS "updatedAt"

                    FROM problems

                    ORDER BY
                        category ASC,
                        title ASC

                `);


            res.json({

                success: true,

                count:
                    result.rows.length,

                problems:
                    result.rows

            });

        }
        catch (error) {

            console.error(
                "Error fetching problems:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch problems"

            });

        }

    }
);


// ==========================================
// GET PROBLEM DETAILS
// ==========================================
// IMPORTANT:
// This route must come BEFORE "/:id"
// ==========================================

router.get(
    "/:id/details",
    async (req, res) => {

        try {

            // ----------------------------------
            // FIND PROBLEM
            // ----------------------------------

            const problemResult =
                await pool.query(
                    `

                        SELECT
                            id,
                            title,
                            category,
                            description,
                            keywords,
                            intro,
                            wizard_id AS "wizardId",
                            common_evidence AS "commonEvidence",
                            route_ids AS "routeIds"

                        FROM problems

                        WHERE id = $1

                    `,
                    [
                        req.params.id
                    ]
                );


            if (
                problemResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Problem not found"

                });

            }


            const problem =
                problemResult.rows[0];


            // ----------------------------------
            // FIND MATCHING ROUTES
            // ----------------------------------

            let routes = [];


            if (
                Array.isArray(
                    problem.routeIds
                )
                &&
                problem.routeIds.length > 0
            ) {

                const routesResult =
                    await pool.query(
                        `

                            SELECT
                                id,
                                authority_name AS "authorityName",
                                authority_type AS "authorityType",
                                purpose,
                                official_url AS "officialUrl",
                                source_name AS "sourceName",
                                verified_on AS "verifiedOn",
                                steps,
                                exclusions,
                                created_at AS "createdAt",
                                updated_at AS "updatedAt"

                            FROM routes

                            WHERE id = ANY($1::text[])

                        `,
                        [
                            problem.routeIds
                        ]
                    );


                routes =
                    routesResult.rows;

            }


            // ----------------------------------
            // RESPONSE
            // ----------------------------------

            res.json({

                success: true,

                problem: {

                    id:
                        problem.id,

                    title:
                        problem.title,

                    category:
                        problem.category,

                    description:
                        problem.description,

                    keywords:
                        problem.keywords,

                    intro:
                        problem.intro,

                    wizardId:
                        problem.wizardId,

                    commonEvidence:
                        problem.commonEvidence

                },

                routes

            });

        }
        catch (error) {

            console.error(
                "Error fetching problem details:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch problem details"

            });

        }

    }
);


// ==========================================
// GET ONE PROBLEM
// ==========================================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `

                        SELECT
                            id,
                            title,
                            category,
                            description,
                            keywords,
                            intro,
                            wizard_id AS "wizardId",
                            common_evidence AS "commonEvidence",
                            route_ids AS "routeIds",
                            created_at AS "createdAt",
                            updated_at AS "updatedAt"

                        FROM problems

                        WHERE id = $1

                    `,
                    [
                        req.params.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Problem not found"

                });

            }


            res.json({

                success: true,

                problem:
                    result.rows[0]

            });

        }
        catch (error) {

            console.error(
                "Error fetching problem:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch problem"

            });

        }

    }
);


module.exports =
    router;