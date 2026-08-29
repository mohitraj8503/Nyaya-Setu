const {
    pool
} = require("../config/db");


const createProblemTable = async () => {

    const query = `

        CREATE TABLE IF NOT EXISTS problems (

            id VARCHAR(255)
                PRIMARY KEY,

            title TEXT
                NOT NULL,

            category VARCHAR(255)
                NOT NULL,

            description TEXT
                DEFAULT '',

            keywords JSONB
                DEFAULT '[]'::jsonb,

            intro TEXT
                DEFAULT '',

            wizard_id VARCHAR(255)
                DEFAULT '',

            common_evidence JSONB
                DEFAULT '[]'::jsonb,

            route_ids JSONB
                DEFAULT '[]'::jsonb,

            created_at TIMESTAMPTZ
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMPTZ
                DEFAULT CURRENT_TIMESTAMP

        );

    `;


    await pool.query(
        query
    );


    console.log(
        "Problems table ready"
    );

};


module.exports = {
    createProblemTable
};