require("dotenv").config();


const {
    pool,
    connectDB
} = require("./config/db");


// ==========================================
// QUESTIONS DATA
// ==========================================

const questions = [

    // ==========================================
    // 1. CONSUMER REFUND
    // ==========================================

    {
        id: "consumer-refund-q1",
        wizardId: "consumer-refund-wizard",
        label: "Did you contact the seller or platform about the refund?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "consumer-refund-q2",
        wizardId: "consumer-refund-wizard",
        label: "Do you have the order ID or invoice?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "consumer-refund-q3",
        wizardId: "consumer-refund-wizard",
        label: "What is the approximate refund amount?",
        type: "text",
        options: [],
        required: true,
        nextRule: null
    },


    // ==========================================
    // 2. DAMAGED ROAD
    // ==========================================

    {
        id: "road-problem-q1",
        wizardId: "road-problem-wizard",
        label: "Is the road damaged, unsafe, or affected by potholes?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "road-problem-q2",
        wizardId: "road-problem-wizard",
        label: "Do you have a photo of the damaged road?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "road-problem-q3",
        wizardId: "road-problem-wizard",
        label: "Where is the damaged road located?",
        type: "text",
        options: [],
        required: true,
        nextRule: null
    },


    // ==========================================
    // 3. ELECTRICITY
    // ==========================================

    {
        id: "electricity-q1",
        wizardId: "electricity-wizard",
        label: "What type of electricity problem are you facing?",
        type: "select",
        options: [
            "Power outage",
            "Electricity connection",
            "Billing issue",
            "Other"
        ],
        required: true,
        nextRule: null
    },

    {
        id: "electricity-q2",
        wizardId: "electricity-wizard",
        label: "Do you have your electricity consumer/service number?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "electricity-q3",
        wizardId: "electricity-wizard",
        label: "Have you already complained to the electricity provider?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },


    // ==========================================
    // 4. WATER SUPPLY
    // ==========================================

    {
        id: "water-supply-q1",
        wizardId: "water-supply-wizard",
        label: "What type of water problem are you facing?",
        type: "select",
        options: [
            "No water supply",
            "Low water supply",
            "Pipeline problem",
            "Other"
        ],
        required: true,
        nextRule: null
    },

    {
        id: "water-supply-q2",
        wizardId: "water-supply-wizard",
        label: "Do you have the location details of the affected area?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "water-supply-q3",
        wizardId: "water-supply-wizard",
        label: "Have you previously reported this problem?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },


    // ==========================================
    // 5. EDUCATION SERVICE
    // ==========================================

    {
        id: "education-service-q1",
        wizardId: "education-service-wizard",
        label: "Which education service is related to your problem?",
        type: "select",
        options: [
            "School",
            "College",
            "Scholarship or scheme",
            "Other"
        ],
        required: true,
        nextRule: null
    },

    {
        id: "education-service-q2",
        wizardId: "education-service-wizard",
        label: "Do you have the relevant application or institution details?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "education-service-q3",
        wizardId: "education-service-wizard",
        label: "Do you have supporting documents if required?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },


    // ==========================================
    // 6. UPI / DIGITAL PAYMENT
    // ==========================================

    {
        id: "upi-payment-q1",
        wizardId: "upi-payment-wizard",
        label: "What type of digital payment issue are you facing?",
        type: "select",
        options: [
            "Failed transaction",
            "Pending transaction",
            "Money debited but not received",
            "Other"
        ],
        required: true,
        nextRule: null
    },

    {
        id: "upi-payment-q2",
        wizardId: "upi-payment-wizard",
        label: "Do you have the transaction ID?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    },

    {
        id: "upi-payment-q3",
        wizardId: "upi-payment-wizard",
        label: "Do you have the payment date and amount?",
        type: "yesno",
        options: ["Yes", "No"],
        required: true,
        nextRule: null
    }

];


// ==========================================
// SEED QUESTIONS
// ==========================================

const seedQuestions = async () => {

    try {

        // --------------------------------------
        // CONNECT DATABASE
        // --------------------------------------

        await connectDB();


        // --------------------------------------
        // REMOVE EXISTING QUESTIONS
        // --------------------------------------

        await pool.query(
            "DELETE FROM questions"
        );


        // --------------------------------------
        // INSERT QUESTIONS
        // --------------------------------------

        for (
            const question of questions
        ) {

            await pool.query(

                `

                INSERT INTO questions (

                    id,
                    wizard_id,
                    label,
                    type,
                    options,
                    required,
                    next_rule

                )

                VALUES (

                    $1,
                    $2,
                    $3,
                    $4,
                    $5::jsonb,
                    $6,
                    $7::jsonb

                )

                `,

                [

                    question.id,

                    question.wizardId,

                    question.label,

                    question.type,

                    JSON.stringify(
                        question.options
                    ),

                    question.required,

                    JSON.stringify(
                        question.nextRule
                    )

                ]

            );

        }


        console.log(
            "======================================"
        );

        console.log(
            `Questions seeded successfully: ${questions.length} inserted`
        );

        console.log(
            "======================================"
        );


        await pool.end();

        process.exit(0);

    }
    catch (error) {

        console.error(
            "Question seeding failed ❌"
        );

        console.error(
            error.message
        );


        await pool.end();

        process.exit(1);

    }

};


seedQuestions();