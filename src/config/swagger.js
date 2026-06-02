const swaggerJsdoc = require("swagger-jsdoc");

// Build servers list dynamically based on environment
const servers = [];
if (process.env.BASE_URL) {
  servers.push({
    url: process.env.BASE_URL,
    description: "Production server"
  });
}
// Dynamic relative server (enables Swagger to auto-detect domain/scheme/port of current host)
servers.push({
  url: "/",
  description: "Current host (Relative)"
});
servers.push({
  url: `http://localhost:${process.env.PORT || 5000}`,
  description: "Local development server"
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SKINNER API",
      version: "1.0.0",
      description: "API documentation for SKINNER - AI Skin Disease Detection System"
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;