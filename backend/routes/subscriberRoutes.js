const express =
    require("express");


const {
    pool
} = require("../config/db");


const router =
    express.Router();


// ==========================================
// EMAIL VALIDATION
// ==========================================

const isValidEmail =
    (email) => {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        return emailPattern.test(
            email
        );

    };


// ==========================================
// CREATE / UPDATE SUBSCRIBER
// ==========================================

router.post(
    "/",
    async (req, res) => {

        try {

            const {

                email,

                source

            } = req.body;


            // ----------------------------------
            // NORMALIZE EMAIL
            // ----------------------------------

            const cleanEmail =
                typeof email === "string"

                    ? email
                        .trim()
                        .toLowerCase()

                    : "";


            // ----------------------------------
            // REQUIRED VALIDATION
            // ----------------------------------

            if (
                !cleanEmail
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email address is required."

                });

            }


            // ----------------------------------
            // EMAIL FORMAT VALIDATION
            // ----------------------------------

            if (
                !isValidEmail(
                    cleanEmail
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter a valid email address."

                });

            }


            // ----------------------------------
            // EMAIL LENGTH VALIDATION
            // ----------------------------------

            if (
                cleanEmail.length > 255
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid email address."

                });

            }


            // ----------------------------------
            // INSERT / REACTIVATE SUBSCRIBER
            // ----------------------------------

            const query = `

                INSERT INTO subscribers (

                    email,

                    is_subscribed,

                    source

                )

                VALUES (

                    $1,

                    TRUE,

                    $2

                )

                ON CONFLICT (email)

                DO UPDATE SET

                    is_subscribed = TRUE,

                    source = EXCLUDED.source,

                    updated_at = CURRENT_TIMESTAMP

                RETURNING

                    id,

                    email,

                    is_subscribed,

                    created_at,

                    updated_at;

            `;


            const values = [

                cleanEmail,

                source || "website"

            ];


            const result =
                await pool.query(
                    query,
                    values
                );


            const subscriber =
                result.rows[0];


            // ----------------------------------
            // SUCCESS RESPONSE
            // ----------------------------------

            return res.status(201).json({

                success:
                    true,

                message:
                    "You have been subscribed successfully.",

                subscriber

            });

        }
        catch (error) {

            console.error(
                "Error subscribing email:",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to subscribe right now. Please try again later."

            });

        }

    }
);


// ==========================================
// SUBSCRIBER API HEALTH CHECK
// ==========================================

router.get(
    "/health",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "Subscriber API is running"

        });

    }
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports =
    router;