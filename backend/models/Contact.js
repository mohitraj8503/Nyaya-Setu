const {
    pool
} = require("../config/db");


// ==========================================
// CREATE CONTACT MESSAGES TABLE
// ==========================================

const createContactTable =
    async () => {

        const query = `

            CREATE TABLE IF NOT EXISTS contact_messages (

                id SERIAL PRIMARY KEY,

                name VARCHAR(100)
                    NOT NULL,

                email VARCHAR(255)
                    NOT NULL,

                enquiry_type VARCHAR(100)
                    NOT NULL,

                message TEXT
                    NOT NULL,

                terms_accepted BOOLEAN
                    DEFAULT FALSE,

                source VARCHAR(100)
                    DEFAULT 'website',

                status VARCHAR(50)
                    DEFAULT 'New',

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `;


        await pool.query(
            query
        );


        await pool.query(`

            CREATE INDEX IF NOT EXISTS
            idx_contact_messages_created_at

            ON contact_messages (
                created_at DESC
            );

        `);

    };


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    createContactTable

};