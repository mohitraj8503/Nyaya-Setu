const {
    Pool
} = require("pg");


// ==========================================
// DATABASE URL VALIDATION
// ==========================================

if (
    !process.env.DATABASE_URL
) {

    throw new Error(
        "DATABASE_URL is not defined in environment variables"
    );

}


// ==========================================
// POSTGRESQL CONNECTION POOL
// ==========================================

const pool =
    new Pool({

        connectionString:
            process.env.DATABASE_URL,

        ssl:
            process.env.DB_SSL === "false"
                ? false
                : {
                    rejectUnauthorized:
                        false
                }

    });


// ==========================================
// CONNECT DATABASE
// ==========================================

const connectDB = async () => {

    try {

        const result =
            await pool.query(
                "SELECT NOW()"
            );


        console.log(
            "Supabase PostgreSQL connected successfully:",
            result.rows[0].now
        );

    }
    catch (error) {

        console.error(
            "Database connection failed:",
            error.message
        );


        throw error;

    }

};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    pool,

    connectDB

};