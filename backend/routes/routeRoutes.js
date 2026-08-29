const express = require("express");

const {
    pool
} = require("../config/db");


const router =
    express.Router();


// ==========================================
// GET ALL ROUTES
// ==========================================

router.get(
    "/",
    async (req, res) => {

        try {

            const result =
                await pool.query(`

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

                    ORDER BY
                        authority_name ASC

                `);


            res.json({

                success: true,

                count:
                    result.rows.length,

                routes:
                    result.rows

            });

        }
        catch (error) {

            console.error(
                "Error fetching routes:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch routes"

            });

        }

    }
);


// ==========================================
// GET ONE ROUTE
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
                        "Route not found"

                });

            }


            res.json({

                success: true,

                route:
                    result.rows[0]

            });

        }
        catch (error) {

            console.error(
                "Error fetching route:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch route"

            });

        }

    }
);


module.exports =
    router;