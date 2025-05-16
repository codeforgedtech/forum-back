const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const swagger = require('@fastify/swagger');
const swaggerUI = require('@fastify/swagger-ui');

require('dotenv').config();
fastify.register(cors, {
  origin: 'http://localhost:5174', // eller true f�r alla
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});


// Swagger + Swagger UI
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'Forum API',
      description: 'API för att hantera trådar och användare',
      version: '1.0.0'
    },
    consumes: ['application/json'],
    produces: ['application/json'],
  },
  exposeRoute: true,
  routePrefix: '/docs'
});

fastify.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  exposeRoute: true
});

// Register routes
fastify.register(require('./routes/auth'));
fastify.register(require('./routes/threads'));
fastify.register(require('./routes/comments'));
fastify.register(require('./routes/categories'))
fastify.register(require('./routes/privateMessagesRoutes'));
fastify.register(require('./routes/usersRoutes'));

// Start server
fastify.listen({ port: 8001 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});

