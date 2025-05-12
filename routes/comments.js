const db = require('../db');
const verifyToken = require('../authMiddleware');

async function commentRoutes(fastify, options) {
  // Hämta alla kommentarer (inkl. replies) för en viss tråd
  fastify.get('/threads/:id/comments', async (request, reply) => {
    const threadId = request.params.id;

    try {
      const [comments] = await db.query(
        `SELECT comments.id, comments.content, comments.created_at, comments.parent_id, users.username
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE comments.thread_id = ?
         ORDER BY comments.created_at ASC`,
        [threadId]
      );

      const rootComments = [];
      const repliesByParentId = {};

      for (const comment of comments) {
        if (comment.parent_id === null) {
          rootComments.push({ ...comment, replies: [] });
        } else {
          if (!repliesByParentId[comment.parent_id]) {
            repliesByParentId[comment.parent_id] = [];
          }
          repliesByParentId[comment.parent_id].push(comment);
        }
      }

      for (const comment of rootComments) {
        comment.replies = repliesByParentId[comment.id] || [];
      }

      reply.send(rootComments);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte hämta kommentarer' });
    }
  });

  // Skapa en ny kommentar till en tråd
  fastify.post('/threads/:id/comments', { preHandler: verifyToken }, async (request, reply) => {
    const threadId = request.params.id;
    const { content } = request.body;
    const userId = request.user.id;

    if (!content.trim()) {
      return reply.code(400).send({ error: 'Kommentarinnehåll kan inte vara tomt' });
    }

    try {
      const [result] = await db.query(
        'INSERT INTO comments (thread_id, user_id, content) VALUES (?, ?, ?)',
        [threadId, userId, content]
      );

      const [newComment] = await db.query(
        `SELECT comments.id, comments.content, comments.created_at, users.username
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE comments.id = ?`,
        [result.insertId]
      );

      reply.code(201).send(newComment[0]);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte skapa kommentar' });
    }
  });

  // Skapa ett svar (reply) på en kommentar
  fastify.post('/comments/:id/replies', { preHandler: verifyToken }, async (request, reply) => {
    const parentId = request.params.id;
    const { content } = request.body;
    const userId = request.user.id;

    if (!content.trim()) {
      return reply.code(400).send({ error: 'Kommentarinnehåll kan inte vara tomt' });
    }

    try {
      // För att sätta rätt thread_id även för reply – vi måste slå upp parent-kommentaren
      const [parentCommentRows] = await db.query(
        'SELECT thread_id FROM comments WHERE id = ?',
        [parentId]
      );

      if (parentCommentRows.length === 0) {
        return reply.code(404).send({ error: 'Överordnad kommentar hittades inte' });
      }

      const threadId = parentCommentRows[0].thread_id;

      const [result] = await db.query(
        'INSERT INTO comments (thread_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
        [threadId, userId, content, parentId]
      );

      const [newReply] = await db.query(
        `SELECT comments.id, comments.content, comments.created_at, users.username, comments.parent_id
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE comments.id = ?`,
        [result.insertId]
      );

      reply.code(201).send(newReply[0]);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte skapa svar på kommentar' });
    }
  });
}

module.exports = commentRoutes;
