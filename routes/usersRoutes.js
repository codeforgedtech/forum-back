// usersRoutes.js
const db = require("../db");
const verifyToken = require("../authMiddleware");

async function usersRoutes(fastify, options) {
  fastify.get('/users', { preHandler: verifyToken }, async (request, reply) => {
    const userId = request.user.id;

    try {
      const [users] = await db.query(
        'SELECT id, username FROM users WHERE id != ?',  // Hämta alla användare utom den som gör förfrågan
        [userId]
      );
      reply.send(users);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte hämta användare.' });
    }
  });
}

module.exports = usersRoutes; // Här exporteras funktionen

