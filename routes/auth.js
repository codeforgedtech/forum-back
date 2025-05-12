const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');  
const db = require('../db');

async function authRoutes(fastify, options) {
  // Registrera användare
  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            userId: { type: 'integer' }
          }
        }
      },
      tags: ['Auth'],
      summary: 'Registrera ny användare'
    }
  }, async (request, reply) => {
    const { username, email, password } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const [result] = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      reply.code(201).send({ message: 'Användare skapad', userId: result.insertId });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte skapa användare' });
    }
  });

  // Logga in användare
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        }
      },
      tags: ['Auth'],
      summary: 'Logga in användare'
    }
  }, async (request, reply) => {
    const { username, password } = request.body;

    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Ogiltigt användarnamn eller lösenord' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {

      expiresIn: '1h'
    });

    reply.send({ token });
  });
}

module.exports = authRoutes;



