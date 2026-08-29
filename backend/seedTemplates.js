require("dotenv").config();

const {
    connectDB,
    pool
} = require("./config/db");


const templates = [

    // ==========================================
    // 1. CONSUMER REFUND
    // ==========================================

    {
        id: "consumer-refund-template",

        problemId: "consumer-refund",

        subjectTemplate:
            "Request for Resolution of Consumer Refund Issue",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I am writing regarding an unresolved refund issue related to an online purchase.\n\n" +
            "Order ID: {{orderId}}\n" +
            "Purchase Date: {{purchaseDate}}\n" +
            "Refund Amount: {{refundAmount}}\n" +
            "Seller/Platform: {{sellerName}}\n\n" +
            "I have contacted the seller/platform regarding this issue, but the matter remains unresolved.\n\n" +
            "I request that the matter be reviewed and appropriate action be taken.\n\n" +
            "Thank you.",

        fields: [
            "orderId",
            "purchaseDate",
            "refundAmount",
            "sellerName"
        ]

    },


    // ==========================================
    // 2. DAMAGED ROAD
    // ==========================================

    {
        id: "road-problem-template",

        problemId: "road-problem",

        subjectTemplate:
            "Complaint Regarding Damaged Road",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I would like to report a damaged or unsafe road in my area.\n\n" +
            "Location: {{location}}\n" +
            "Problem Description: {{description}}\n" +
            "Date Observed: {{dateObserved}}\n\n" +
            "The condition of the road may create inconvenience and safety concerns for residents and commuters.\n\n" +
            "I request that the concerned authority inspect the location and take appropriate action.\n\n" +
            "Thank you.",

        fields: [
            "location",
            "description",
            "dateObserved"
        ]

    },


    // ==========================================
    // 3. ELECTRICITY
    // ==========================================

    {
        id: "electricity-template",

        problemId: "electricity",

        subjectTemplate:
            "Complaint Regarding Electricity Service",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I am facing an electricity service issue and request assistance from the concerned authority.\n\n" +
            "Consumer/Service Number: {{consumerNumber}}\n" +
            "Issue Type: {{issueType}}\n" +
            "Issue Description: {{description}}\n" +
            "Previous Complaint Reference: {{complaintReference}}\n\n" +
            "I request that the issue be examined and resolved at the earliest possible opportunity.\n\n" +
            "Thank you.",

        fields: [
            "consumerNumber",
            "issueType",
            "description",
            "complaintReference"
        ]

    },


    // ==========================================
    // 4. WATER SUPPLY
    // ==========================================

    {
        id: "water-supply-template",

        problemId: "water-supply",

        subjectTemplate:
            "Complaint Regarding Water Supply",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I would like to report a problem with the water supply in my area.\n\n" +
            "Location: {{location}}\n" +
            "Problem Type: {{problemType}}\n" +
            "Problem Description: {{description}}\n" +
            "Previous Complaint Reference: {{complaintReference}}\n\n" +
            "I request the concerned authority to investigate the issue and take appropriate action.\n\n" +
            "Thank you.",

        fields: [
            "location",
            "problemType",
            "description",
            "complaintReference"
        ]

    },


    // ==========================================
    // 5. EDUCATION SERVICE
    // ==========================================

    {
        id: "education-service-template",

        problemId: "education-service",

        subjectTemplate:
            "Request Regarding Government Education Service",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I am seeking assistance regarding a government education service.\n\n" +
            "Education Service: {{educationService}}\n" +
            "Institution: {{institutionName}}\n" +
            "Application/Reference Number: {{referenceNumber}}\n" +
            "Issue Description: {{description}}\n\n" +
            "I request that the concerned authority review the matter and provide appropriate assistance.\n\n" +
            "Thank you.",

        fields: [
            "educationService",
            "institutionName",
            "referenceNumber",
            "description"
        ]

    },


    // ==========================================
    // 6. UPI / DIGITAL PAYMENT
    // ==========================================

    {
        id: "upi-payment-template",

        problemId: "upi-payment",

        subjectTemplate:
            "Complaint Regarding UPI / Digital Payment Issue",

        bodyTemplate:
            "Dear Sir/Madam,\n\n" +
            "I am writing regarding an unresolved UPI/digital payment issue.\n\n" +
            "Transaction ID: {{transactionId}}\n" +
            "Payment Date: {{paymentDate}}\n" +
            "Payment Amount: {{paymentAmount}}\n" +
            "Issue Type: {{issueType}}\n" +
            "Bank/Payment App: {{bankOrApp}}\n\n" +
            "I request that the transaction be reviewed and the appropriate resolution be provided.\n\n" +
            "Thank you.",

        fields: [
            "transactionId",
            "paymentDate",
            "paymentAmount",
            "issueType",
            "bankOrApp"
        ]

    }

];


// ==========================================
// SEED TEMPLATES
// ==========================================

const seedTemplates = async () => {

    try {

        // --------------------------------------
        // CONNECT DATABASE
        // --------------------------------------

        await connectDB();


        // --------------------------------------
        // REMOVE EXISTING TEMPLATES
        // --------------------------------------

        await pool.query(
            `DELETE FROM templates`
        );


        // --------------------------------------
        // INSERT TEMPLATES
        // --------------------------------------

        for (
            const template
            of templates
        ) {

            await pool.query(

                `
                    INSERT INTO templates (

                        id,
                        problem_id,
                        subject_template,
                        body_template,
                        fields

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,
                        $5

                    )
                `,

                [

                    template.id,

                    template.problemId,

                    template.subjectTemplate,

                    template.bodyTemplate,

                    JSON.stringify(
                        template.fields
                    )

                ]

            );

        }


        // --------------------------------------
        // SUCCESS
        // --------------------------------------

        console.log(
            "======================================"
        );

        console.log(
            `Templates seeded successfully: ${templates.length} inserted`
        );

        console.log(
            "======================================"
        );


        await pool.end();

        process.exit(0);

    }
    catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "Template seeding failed ❌"
        );

        console.error(
            error.message
        );

        console.error(
            "======================================"
        );


        process.exit(1);

    }

};


seedTemplates();