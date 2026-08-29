const express =
    require("express");


const {

    getAllQuestions,

    getQuestionsByWizardId,

    getQuestionById

} = require(
    "../models/Question"
);


const router =
    express.Router();


// ==========================================
// GET ALL QUESTIONS
// ==========================================

router.get(
    "/",

    async (req, res) => {

        try {

            const questions =
                await getAllQuestions();


            res.json({

                success:
                    true,

                count:
                    questions.length,

                questions

            });

        }
        catch (error) {

            console.error(
                "Error fetching questions:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch questions"

            });

        }

    }
);


// ==========================================
// GET QUESTIONS FOR ONE WIZARD
// ==========================================

router.get(
    "/wizard/:wizardId",

    async (req, res) => {

        try {

            const questions =
                await getQuestionsByWizardId(
                    req.params.wizardId
                );


            res.json({

                success:
                    true,

                count:
                    questions.length,

                wizardId:
                    req.params.wizardId,

                questions

            });

        }
        catch (error) {

            console.error(
                "Error fetching wizard questions:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch wizard questions"

            });

        }

    }
);


// ==========================================
// GET ONE QUESTION
// ==========================================

router.get(
    "/:id",

    async (req, res) => {

        try {

            const question =
                await getQuestionById(
                    req.params.id
                );


            if (!question) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Question not found"

                });

            }


            res.json({

                success:
                    true,

                question

            });

        }
        catch (error) {

            console.error(
                "Error fetching question:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch question"

            });

        }

    }
);


module.exports =
    router;