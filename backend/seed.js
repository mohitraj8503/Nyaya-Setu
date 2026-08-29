require("dotenv").config();

const {
    pool,
    connectDB
} = require("./config/db");


const problems = [
    {
        id: "consumer-refund",
        title: "Online Shopping Refund",
        category: "Consumer",
        description: "Help with an unresolved online purchase refund.",
        keywords: [
            "refund",
            "shopping",
            "online order",
            "consumer"
        ],
        intro: "Guidance for an unresolved online purchase refund.",
        wizardId: "consumer-refund-wizard",
        commonEvidence: [
            "Order ID",
            "Invoice",
            "Payment proof",
            "Seller communication"
        ],
        routeIds: [
            "national-consumer-helpline"
        ]
    },

    {
        id: "road-problem",
        title: "Damaged Road",
        category: "Roads",
        description: "Guidance for reporting a damaged or unsafe road.",
        keywords: [
            "road",
            "pothole",
            "damaged road"
        ],
        intro: "Guidance for reporting a damaged or unsafe road.",
        wizardId: "road-problem-wizard",
        commonEvidence: [
            "Photo of the road",
            "Location",
            "Description of the problem"
        ],
        routeIds: [
            "cpgrams-public-grievance"
        ]
    },

    {
        id: "electricity",
        title: "Electricity Service Issue",
        category: "Electricity",
        description: "Guidance for an unresolved electricity service problem.",
        keywords: [
            "electricity",
            "power",
            "connection"
        ],
        intro: "Guidance for an unresolved electricity service issue.",
        wizardId: "electricity-wizard",
        commonEvidence: [
            "Electricity bill",
            "Consumer/service number",
            "Previous complaint reference"
        ],
        routeIds: [
            "uppcl-electricity-service"
        ]
    },

    {
        id: "water-supply",
        title: "Water Supply Problem",
        category: "Water",
        description: "Guidance for a local water supply problem.",
        keywords: [
            "water",
            "supply",
            "pipeline"
        ],
        intro: "Guidance for a local water supply problem.",
        wizardId: "water-supply-wizard",
        commonEvidence: [
            "Location",
            "Photo if relevant",
            "Previous complaint details"
        ],
        routeIds: [
            "up-water-authority"
        ]
    },

    {
        id: "education-service",
        title: "Government Education Service",
        category: "Education",
        description: "Find guidance for a government education service.",
        keywords: [
            "education",
            "school",
            "college",
            "scheme"
        ],
        intro: "Find the appropriate government education service.",
        wizardId: "education-service-wizard",
        commonEvidence: [
            "Relevant application details",
            "Institution details",
            "Supporting documents if required"
        ],
        routeIds: [
            "education-service"
        ]
    },

    {
        id: "upi-payment",
        title: "UPI / Digital Payment Issue",
        category: "Banking/UPI",
        description: "Guidance for an unresolved digital payment issue.",
        keywords: [
            "UPI",
            "payment",
            "banking",
            "transaction"
        ],
        intro: "Guidance for an unresolved digital payment issue.",
        wizardId: "upi-payment-wizard",
        commonEvidence: [
            "Transaction ID",
            "Payment date",
            "Payment amount",
            "Bank/app communication"
        ],
        routeIds: [
            "upi-complaint"
        ]
    }
];


const seedDatabase = async () => {

    try {

        // ==========================================
        // CONNECT TO SUPABASE POSTGRESQL
        // ==========================================

        await connectDB();


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await pool.query(
            "BEGIN"
        );


        // ==========================================
        // REMOVE EXISTING PROBLEMS
        // ==========================================

        await pool.query(
            "DELETE FROM problems"
        );


        // ==========================================
        // INSERT PROBLEMS
        // ==========================================

        for (
            const problem of problems
        ) {

            await pool.query(
                `

                    INSERT INTO problems (

                        id,
                        title,
                        category,
                        description,
                        keywords,
                        intro,
                        wizard_id,
                        common_evidence,
                        route_ids

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,
                        $5::jsonb,
                        $6,
                        $7,
                        $8::jsonb,
                        $9::jsonb

                    )

                `,
                [

                    problem.id,

                    problem.title,

                    problem.category,

                    problem.description,

                    JSON.stringify(
                        problem.keywords
                    ),

                    problem.intro,

                    problem.wizardId,

                    JSON.stringify(
                        problem.commonEvidence
                    ),

                    JSON.stringify(
                        problem.routeIds
                    )

                ]
            );

        }


        // ==========================================
        // COMMIT TRANSACTION
        // ==========================================

        await pool.query(
            "COMMIT"
        );


        console.log(
            "======================================"
        );

        console.log(
            `Problems seeded successfully: ${problems.length} inserted`
        );

        console.log(
            "======================================"
        );


        process.exit(0);

    }
    catch (error) {

        await pool.query(
            "ROLLBACK"
        ).catch(
            () => {}
        );


        console.error(
            "======================================"
        );

        console.error(
            "PROBLEM SEEDING FAILED"
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


seedDatabase();