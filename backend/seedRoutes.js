require("dotenv").config();


const {
    pool,
    connectDB
} = require("./config/db");


// ==========================================
// ROUTES DATA
// ==========================================

const routes = [

    {
        id: "national-consumer-helpline",

        authorityName:
            "National Consumer Helpline",

        authorityType:
            "Central Government",

        purpose:
            "Consumer complaints and refund disputes",

        officialUrl:
            "https://consumerhelpline.gov.in",

        sourceName:
            "Department of Consumer Affairs",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Register on the portal",
            "Submit complaint details",
            "Upload supporting documents",
            "Track complaint status"
        ],

        exclusions: [
            "Criminal matters",
            "Court pending cases"
        ]
    },


    {
        id:
            "cpgrams-public-grievance",

        authorityName:
            "CPGRAMS",

        authorityType:
            "Government Grievance Portal",

        purpose:
            "Public service and government grievance redressal",

        officialUrl:
            "https://pgportal.gov.in",

        sourceName:
            "DARPG",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Create account",
            "Lodge grievance",
            "Select department",
            "Track grievance status"
        ],

        exclusions: [
            "RTI matters",
            "Court cases",
            "Religious matters"
        ]
    },


    {
        id:
            "uppcl-electricity-service",

        authorityName:
            "UPPCL",

        authorityType:
            "State Utility",

        purpose:
            "Electricity complaint and service issues",

        officialUrl:
            "https://www.upenergy.in",

        sourceName:
            "UPPCL",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Open complaint portal",
            "Enter consumer number",
            "Register complaint",
            "Track complaint"
        ],

        exclusions: []
    },


    {
        id:
            "up-water-authority",

        authorityName:
            "UP Water Grievance",

        authorityType:
            "State Utility",

        purpose:
            "Water supply and pipeline complaints",

        officialUrl:
            "https://jjm.up.gov.in",

        sourceName:
            "Jal Jeevan Mission Uttar Pradesh",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Select grievance option",
            "Provide location",
            "Submit complaint",
            "Track status"
        ],

        exclusions: []
    },


    {
        id:
            "education-service",

        authorityName:
            "Ministry of Education",

        authorityType:
            "Government Department",

        purpose:
            "Education related grievances and services",

        officialUrl:
            "https://www.education.gov.in",

        sourceName:
            "Ministry of Education",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Identify issue",
            "Submit grievance",
            "Attach supporting documents",
            "Track resolution"
        ],

        exclusions: []
    },


    {
        id:
            "upi-complaint",

        authorityName:
            "NPCI UPI Complaint",

        authorityType:
            "Payment System",

        purpose:
            "UPI and digital payment issues",

        officialUrl:
            "https://www.npci.org.in/register-a-complaint",

        sourceName:
            "NPCI",

        verifiedOn:
            new Date("2026-08-24"),

        steps: [
            "Choose product",
            "Enter transaction details",
            "Submit complaint",
            "Track complaint status"
        ],

        exclusions: [
            "Unauthorized fraud cases should first be reported to the bank"
        ]
    }

];


// ==========================================
// SEED DATABASE
// ==========================================

const seedRoutes = async () => {

    try {

        // ----------------------------------
        // CONNECT TO SUPABASE POSTGRESQL
        // ----------------------------------

        await connectDB();


        // ----------------------------------
        // START TRANSACTION
        // ----------------------------------

        await pool.query(
            "BEGIN"
        );


        // ----------------------------------
        // REMOVE EXISTING ROUTES
        // ----------------------------------

        await pool.query(
            "DELETE FROM routes"
        );


        // ----------------------------------
        // INSERT ROUTES
        // ----------------------------------

        for (
            const route of routes
        ) {

            await pool.query(
                `

                    INSERT INTO routes (

                        id,
                        authority_name,
                        authority_type,
                        purpose,
                        official_url,
                        source_name,
                        verified_on,
                        steps,
                        exclusions

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8::jsonb,
                        $9::jsonb

                    )

                `,
                [

                    route.id,

                    route.authorityName,

                    route.authorityType,

                    route.purpose,

                    route.officialUrl,

                    route.sourceName,

                    route.verifiedOn,

                    JSON.stringify(
                        route.steps
                    ),

                    JSON.stringify(
                        route.exclusions
                    )

                ]
            );

        }


        // ----------------------------------
        // COMMIT TRANSACTION
        // ----------------------------------

        await pool.query(
            "COMMIT"
        );


        console.log(
            "======================================"
        );

        console.log(
            `Routes seeded successfully: ${routes.length} inserted`
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
            "ROUTE SEEDING FAILED"
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


// ==========================================
// RUN SEEDER
// ==========================================

seedRoutes();