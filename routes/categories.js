const db = require('../db');

async function categoryRoutes(fastify, options) {
  fastify.get('/categories', async (request, reply) => {
    try {
      const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
      reply.send(categories);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte h�mta kategorier' });
    }
  });
}

module.exports = categoryRoutes;