
// routes/threads.js
const db = require('../db');
const verifyToken = require('../authMiddleware');

async function threadRoutes(fastify, options) {
  // H�mta alla tr�dar
  fastify.get('/threads', async (request, reply) => {
    try {
      const [threads] = await db.query(`
        SELECT 
          threads.id,
          threads.title,
          threads.content,
          threads.created_at,
          threads.user_id, -- 🔥 detta behövs för att veta vem som äger tråden
          categories.name AS category,
          users.username AS author,
          COUNT(comments.id) AS comment_count
        FROM threads
        JOIN users ON threads.user_id = users.id
        LEFT JOIN categories ON threads.category_id = categories.id
        LEFT JOIN comments ON comments.thread_id = threads.id
        GROUP BY threads.id
        ORDER BY threads.created_at DESC
      `);
  
      reply.send(threads);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte hämta trådar' });
    }
  });
  
  fastify.get('/threads/:id', async (request, reply) => {
    const threadId = request.params.id;  // H�mta tr�d-ID fr�n URL-parametern
    try {
      const [thread] = await db.query(`
        SELECT 
          threads.id,
          threads.title,
          threads.content,
          threads.created_at,
          categories.name AS category,
          users.username AS author,
          COUNT(comments.id) AS comment_count
        FROM threads
        JOIN users ON threads.user_id = users.id
        LEFT JOIN categories ON threads.category_id = categories.id
        LEFT JOIN comments ON comments.thread_id = threads.id
        WHERE threads.id = ?
        GROUP BY threads.id
      `, [threadId]);

      if (thread.length === 0) {
        return reply.code(404).send({ error: 'Tr�den finns inte' });
      }

      reply.send(thread[0]);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte h�mta tr�den' });
    }
  });
  // Skapa ny tr�d (med kategori)
  fastify.post('/threads', { preHandler: verifyToken }, async (request, reply) => {
    const { title, content, category } = request.body;
    const userId = request.user.id;

    try {
      // Kontrollera om kategorin finns
      let [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [category]);
      let categoryId;

      if (existing.length === 0) {
        const [insertResult] = await db.query('INSERT INTO categories (name) VALUES (?)', [category]);
        categoryId = insertResult.insertId;
      } else {
        categoryId = existing[0].id;
      }

      const [result] = await db.query(
        'INSERT INTO threads (title, content, user_id, category_id) VALUES (?, ?, ?, ?)',
        [title, content, userId, categoryId]
      );

      reply.code(201).send({ message: 'Tr�d skapad', threadId: result.insertId });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte skapa tr�d' });
    }
  });
  fastify.delete('/comments/:id', { preHandler: verifyToken }, async (request, reply) => {
    const commentId = request.params.id;
    const userId = request.user.id;
  
    try {
      const [rows] = await db.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [commentId, userId]);
  
      if (rows.length === 0) {
        return reply.code(403).send({ error: 'Du har inte beh�righet att ta bort denna kommentar' });
      }
  
      await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
      reply.send({ message: 'Kommentar borttagen' });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte ta bort kommentar' });
    }
  });
  // Ta bort en tr�d
  fastify.delete('/threads/:id', { preHandler: verifyToken }, async (request, reply) => {
    const threadId = request.params.id;
    const userId = request.user.id; // Kommer från verifyToken-middleware
  
    try {
      // Kontrollera att tråden finns
      const [threads] = await db.query('SELECT * FROM threads WHERE id = ?', [threadId]);
      if (threads.length === 0) {
        return reply.code(404).send({ error: 'Tråden hittades inte' });
      }
  
      // Kontrollera att användaren äger tråden
      if (threads[0].user_id !== userId) {
        return reply.code(403).send({ error: 'Du får inte ta bort denna tråd' });
      }
  
      // Ta bort kommentarer om det behövs (för att undvika foreign key error)
      await db.query('DELETE FROM comments WHERE thread_id = ?', [threadId]);
  
      // Ta bort tråden
      await db.query('DELETE FROM threads WHERE id = ?', [threadId]);
  
      reply.send({ success: true });
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Internt serverfel vid borttagning' });
    }
  });
  
  
}

module.exports = threadRoutes;
