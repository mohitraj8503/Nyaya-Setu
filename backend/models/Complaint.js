const {
    pool
} = require("../config/db");


const createComplaintTable = async () => {

    const query = `

        CREATE TABLE IF NOT EXISTS complaints (

            id SERIAL PRIMARY KEY,

            tracking_id VARCHAR(50)
                UNIQUE
                NOT NULL,

            problem_id TEXT
                NOT NULL,

            problem_title TEXT
                NOT NULL,

            category TEXT
                DEFAULT 'General',

            subject TEXT
                NOT NULL,

            body TEXT
                NOT NULL,

            answers JSONB
                DEFAULT '{}'::jsonb,

            status TEXT
                DEFAULT 'Prepared',

            official_portal_url TEXT
                DEFAULT '',

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `;


    await pool.query(query);

};


module.exports = {
    createComplaintTable
};