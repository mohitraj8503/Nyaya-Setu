const express = require("express");
const crypto = require("crypto");

const {
    pool
} = require("../config/db");


const router = express.Router();


// ==========================================
// CREATE COMPLAINT
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            problemId,
            problemTitle,
            category,
            subject,
            body,
            answers,
            officialPortalUrl
        } = req.body;


        // VALIDATION

        if (
            !problemId ||
            !problemTitle ||
            !subject ||
            !body
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Required complaint information is missing"

            });

        }


        // GENERATE TRACKING ID

        const randomPart =
            crypto
                .randomBytes(5)
                .toString("hex")
                .toUpperCase();


        const trackingId =
            `NYSETU-${randomPart}`;


        // INSERT INTO SUPABASE

        const query = `

            INSERT INTO complaints (

                tracking_id,
                problem_id,
                problem_title,
                category,
                subject,
                body,
                answers,
                status,
                official_portal_url

            )

            VALUES (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9

            )

            RETURNING *;

        `;


        const values = [

            trackingId,

            problemId,

            problemTitle,

            category || "General",

            subject,

            body,

            JSON.stringify(
                answers || {}
            ),

            "Prepared",

            officialPortalUrl || ""

        ];


        const result =
            await pool.query(
                query,
                values
            );


        const complaint =
            result.rows[0];


        res.status(201).json({

            success: true,

            message:
                "Complaint created successfully",

            trackingId:
                complaint.tracking_id,

            complaint

        });

    }
    catch (error) {

        console.error(
            "Error creating complaint:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to create complaint"

        });

    }

});


// ==========================================
// GET ALL COMPLAINTS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const result =
            await pool.query(`

                SELECT *

                FROM complaints

                ORDER BY
                    created_at DESC

            `);


        const complaints =
            result.rows;


        res.json({

            success: true,

            count:
                complaints.length,

            complaints

        });

    }
    catch (error) {

        console.error(
            "Error fetching complaints:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch complaints"

        });

    }

});


// ==========================================
// GET ONE COMPLAINT
// ==========================================

router.get(
    "/:trackingId",
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `

                    SELECT *

                    FROM complaints

                    WHERE tracking_id = $1

                    `,

                    [
                        req.params.trackingId
                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Complaint not found"

                });

            }


            const complaint =
                result.rows[0];


            res.json({

                success: true,

                complaint

            });

        }
        catch (error) {

            console.error(
                "Error fetching complaint:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch complaint"

            });

        }

    }
);


module.exports = router;