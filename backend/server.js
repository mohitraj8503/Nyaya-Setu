const express =
    require("express");


const cors =
    require("cors");


const dotenv =
    require("dotenv");


const path =
    require("path");


// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config({

    path:
        path.join(
            __dirname,
            ".env"
        )

});


// ==========================================
// DATABASE CONNECTION
// ==========================================

const {

    connectDB

} = require(
    "./config/db"
);


// ==========================================
// DATABASE TABLES
// ==========================================

const {

    createProblemTable

} = require(
    "./models/Problem"
);


const {

    createRouteTable

} = require(
    "./models/Route"
);


const {

    createQuestionTable

} = require(
    "./models/Question"
);


const {

    createTemplateTable

} = require(
    "./models/Template"
);


const {

    createComplaintTable

} = require(
    "./models/Complaint"
);


const {

    createContactTable

} = require(
    "./models/Contact"
);


const {

    createSubscriberTable

} = require(
    "./models/Subscriber"
);


// ==========================================
// ROUTES
// ==========================================

const problemRoutes =
    require(
        "./routes/problemRoutes"
    );


const routeRoutes =
    require(
        "./routes/routeRoutes"
    );


const questionRoutes =
    require(
        "./routes/questionRoutes"
    );


const templateRoutes =
    require(
        "./routes/templateRoutes"
    );


const complaintRoutes =
    require(
        "./routes/complaintRoutes"
    );


const contactRoutes =
    require(
        "./routes/contactRoutes"
    );


const subscriberRoutes =
    require(
        "./routes/subscriberRoutes"
    );


// ==========================================
// CREATE EXPRESS APP
// ==========================================

const app =
    express();


// ==========================================
// CORS CONFIGURATION
// ==========================================

const defaultOrigins = [

    "http://localhost:8080",

    "http://127.0.0.1:8080"

];


const configuredOrigins =
    process.env.CORS_ORIGIN

        ? process.env.CORS_ORIGIN
            .split(",")
            .map(
                origin =>
                    origin.trim()
            )
            .filter(
                Boolean
            )

        : [];


const allowedOrigins = [

    ...defaultOrigins,

    ...configuredOrigins

];


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(

    cors({

        origin:
            (
                origin,
                callback
            ) => {

                // Allow requests without Origin
                // such as Postman or server-to-server.

                if (
                    !origin
                ) {

                    return callback(
                        null,
                        true
                    );

                }


                if (
                    allowedOrigins.includes(
                        origin
                    )
                ) {

                    return callback(
                        null,
                        true
                    );

                }


                return callback(

                    new Error(
                        `CORS blocked for origin: ${origin}`
                    )

                );

            },


        methods: [

            "GET",

            "POST",

            "PUT",

            "PATCH",

            "DELETE",

            "OPTIONS"

        ],


        allowedHeaders: [

            "Content-Type",

            "Authorization"

        ]

    })

);


app.use(
    express.json({

        limit:
            "1mb"

    })
);


app.use(

    express.urlencoded({

        extended:
            true,

        limit:
            "1mb"

    })

);


// ==========================================
// API ROUTES
// ==========================================

app.use(

    "/api/problems",

    problemRoutes

);


app.use(

    "/api/routes",

    routeRoutes

);


app.use(

    "/api/questions",

    questionRoutes

);


app.use(

    "/api/templates",

    templateRoutes

);


app.use(

    "/api/complaints",

    complaintRoutes

);


app.use(

    "/api/contact",

    contactRoutes

);


app.use(

    "/api/subscribers",

    subscriberRoutes

);


// ==========================================
// ROOT / BACKEND INFORMATION
// ==========================================

app.get(

    "/",

    (
        req,
        res
    ) => {

        res.json({

            success:
                true,


            message:
                "NyayaSetu Backend is running 🚀",


            version:
                "1.0.0",


            database:
                "Supabase PostgreSQL",


            services: {

                problems:
                    "/api/problems",

                routes:
                    "/api/routes",

                questions:
                    "/api/questions",

                templates:
                    "/api/templates",

                complaints:
                    "/api/complaints",

                contact:
                    "/api/contact",

                subscribers:
                    "/api/subscribers"

            }

        });

    }

);


// ==========================================
// API HEALTH CHECK
// ==========================================

app.get(

    "/api/health",

    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "NyayaSetu API is healthy",

            timestamp:
                new Date()
                    .toISOString()

        });

    }

);


// ==========================================
// 404 HANDLER
// ==========================================

app.use(

    (
        req,
        res
    ) => {

        res.status(404).json({

            success:
                false,

            message:
                "API endpoint not found",

            path:
                req.originalUrl

        });

    }

);


// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(

    (

        error,

        req,

        res,

        next

    ) => {

        console.error(

            "Server error:",

            error.message

        );


        if (
            error.message &&
            error.message.startsWith(
                "CORS blocked"
            )
        ) {

            return res.status(403).json({

                success:
                    false,

                message:
                    "Request blocked by CORS policy"

            });

        }


        res.status(500).json({

            success:
                false,

            message:
                "Internal server error"

        });

    }

);


// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT =
    process.env.PORT || 5000;


// ==========================================
// START SERVER
// ==========================================

const startServer =
    async () => {

        try {

            // ----------------------------------
            // CONNECT DATABASE
            // ----------------------------------

            await connectDB();


            // ----------------------------------
            // CREATE DATABASE TABLES
            // ----------------------------------

            await createProblemTable();

            console.log(
                "Problems table ready"
            );


            await createRouteTable();

            console.log(
                "Routes table ready"
            );


            await createQuestionTable();

            console.log(
                "Questions table ready"
            );


            await createTemplateTable();

            console.log(
                "Templates table ready"
            );


            await createComplaintTable();

            console.log(
                "Complaints table ready"
            );


            await createContactTable();

            console.log(
                "Contact messages table ready"
            );


            await createSubscriberTable();

            console.log(
                "Subscribers table ready"
            );


            // ----------------------------------
            // START SERVER
            // ----------------------------------

            app.listen(

                PORT,

                () => {

                    console.log(
                        "======================================"
                    );


                    console.log(
                        "NyayaSetu Backend running successfully 🚀"
                    );


                    console.log(
                        `Server: http://localhost:${PORT}`
                    );


                    console.log(
                        "Database: Supabase PostgreSQL"
                    );


                    console.log(
                        "======================================"
                    );

                }

            );

        }
        catch (
            error
        ) {

            console.error(
                "======================================"
            );


            console.error(
                "SERVER STARTUP FAILED"
            );


            console.error(
                error.message
            );


            console.error(
                "======================================"
            );


            process.exit(
                1
            );

        }

    };


// ==========================================
// INITIALIZE SERVER
// ==========================================

startServer();