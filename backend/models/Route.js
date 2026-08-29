const {
    pool
} = require("../config/db");


const createRouteTable = async () => {

    const query = `

        CREATE TABLE IF NOT EXISTS routes (

            id VARCHAR(255)
                PRIMARY KEY,

            authority_name TEXT
                NOT NULL,

            authority_type VARCHAR(255)
                NOT NULL,

            purpose TEXT
                NOT NULL,

            official_url TEXT
                NOT NULL,

            source_name TEXT
                NOT NULL,

            verified_on TIMESTAMPTZ
                NOT NULL,

            steps JSONB
                DEFAULT '[]'::jsonb,

            exclusions JSONB
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
        "Routes table ready"
    );

};


module.exports = {
    createRouteTable
};