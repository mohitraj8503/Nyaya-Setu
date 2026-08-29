const express =
    require("express");


const {

    getAllTemplates,

    getTemplatesByProblemId,

    getTemplateById

} = require(
    "../models/Template"
);


const router =
    express.Router();


// ==========================================
// GET ALL TEMPLATES
// ==========================================

router.get(
    "/",

    async (req, res) => {

        try {

            const templates =
                await getAllTemplates();


            res.json({

                success:
                    true,

                count:
                    templates.length,

                templates

            });

        }
        catch (error) {

            console.error(
                "Error fetching templates:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch templates"

            });

        }

    }
);


// ==========================================
// GET TEMPLATES FOR ONE PROBLEM
// ==========================================

router.get(
    "/problem/:problemId",

    async (req, res) => {

        try {

            const templates =
                await getTemplatesByProblemId(
                    req.params.problemId
                );


            res.json({

                success:
                    true,

                count:
                    templates.length,

                problemId:
                    req.params.problemId,

                templates

            });

        }
        catch (error) {

            console.error(
                "Error fetching problem templates:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch problem templates"

            });

        }

    }
);


// ==========================================
// GET TEMPLATE BY ID
// ==========================================

router.get(
    "/:id",

    async (req, res) => {

        try {

            const template =
                await getTemplateById(
                    req.params.id
                );


            if (!template) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Template not found"

                });

            }


            res.json({

                success:
                    true,

                template

            });

        }
        catch (error) {

            console.error(
                "Error fetching template:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch template"

            });

        }

    }
);


module.exports =
    router;