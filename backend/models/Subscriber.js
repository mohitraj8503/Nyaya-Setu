const {
    pool
} = require("../config/db");


// ==========================================
// CREATE SUBSCRIBERS TABLE
// ==========================================

const createSubscriberTable =
    async () => {

        const query = `

            CREATE TABLE IF NOT EXISTS subscribers (

                id SERIAL PRIMARY KEY,

                email VARCHAR(255)
                    UNIQUE
                    NOT NULL,

                is_subscribed BOOLEAN
                    DEFAULT TRUE,

                source VARCHAR(100)
                    DEFAULT 'website',

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `;


        await pool.query(
            query
        );


        await pool.query(`

            CREATE INDEX IF NOT EXISTS
            idx_subscribers_email

            ON subscribers (
                email
            );

        `);

    };


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    createSubscriberTable

};