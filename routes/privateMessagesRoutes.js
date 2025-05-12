const fastify = require("fastify")();
const db = require("../db"); // F�r databaskoppling
const verifyToken = require("../authMiddleware"); // F�r tokenvalidering

async function privateMessageRoutes(fastify, options) {
  // Skicka ett privat meddelande
  fastify.post('/private-messages', { preHandler: verifyToken }, async (request, reply) => {
    const { receiverId, body, subject } = request.body;
    const senderId = request.user.id;
  
    if (!receiverId || !body || !subject) {
      return reply.code(400).send({ error: 'Mottagare, ämne och innehåll krävs.' });
    }
  
    try {
      const [result] = await db.query(
        'INSERT INTO private_messages (sender_id, receiver_id, body, subject) VALUES (?, ?, ?, ?)',
        [senderId, receiverId, body, subject]
      );
  
      const [newMessage] = await db.query(
        `SELECT private_messages.id, private_messages.subject, private_messages.body AS content, private_messages.sent_at, 
                sender.username AS sender_username, receiver.username AS receiver_username
         FROM private_messages
         JOIN users AS sender ON private_messages.sender_id = sender.id
         JOIN users AS receiver ON private_messages.receiver_id = receiver.id
         WHERE private_messages.id = ?`,
        [result.insertId]
      );
  
      reply.code(201).send(newMessage[0]);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte skicka meddelande.' });
    }
  });
  fastify.delete('/private-messages/:id', { preHandler: verifyToken }, async (request, reply) => {
    const messageId = request.params.id;
    const userId = request.user.id;
  
    try {
      const [message] = await db.query(
        'SELECT * FROM private_messages WHERE id = ?',
        [messageId]
      );
  
      if (!message.length) {
        return reply.code(404).send({ error: 'Meddelandet finns inte.' });
      }
  
      // Endast avsändare eller mottagare får ta bort
      if (message[0].sender_id !== userId && message[0].receiver_id !== userId) {
        return reply.code(403).send({ error: 'Du får inte ta bort detta meddelande.' });
      }
  
      await db.query('DELETE FROM private_messages WHERE id = ?', [messageId]);
  
      reply.send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Kunde inte ta bort meddelandet.' });
    }
  });
// Markera ett meddelande som läst
fastify.post('/private-messages/:id/read', { preHandler: verifyToken }, async (request, reply) => {
  const messageId = request.params.id;
  const userId = request.user.id;

  try {
    // Kontrollera att meddelandet finns och att det tillhör den inloggade användaren
    const [rows] = await db.query(
      'SELECT * FROM private_messages WHERE id = ? AND receiver_id = ?',
      [messageId, userId]
    );

    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Meddelandet hittades inte eller tillhör inte användaren.' });
    }

    // Uppdatera till läst
    await db.query('UPDATE private_messages SET is_read = 1 WHERE id = ?', [messageId]);

    reply.send({ message: 'Meddelandet markerades som läst.' });
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Ett fel uppstod vid uppdatering.' });
  }
});


 fastify.get('/private-messages/unread/count', { preHandler: verifyToken }, async (request, reply) => {
  const userId = request.user.id;

  try {
    const [result] = await db.query(
      'SELECT COUNT(*) AS unreadCount FROM private_messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );
    reply.send({ unreadCount: result[0].unreadCount });
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Kunde inte hämta antal olästa meddelanden.' });
  }
});

  fastify.get(
    "/private-messages",
    { preHandler: verifyToken },
    async (request, reply) => {
      const userId = request.user.id;

      try {
        const [messages] = await db.query(
            `SELECT private_messages.id,
                    private_messages.sender_id,
                    private_messages.receiver_id,
                    private_messages.subject,
                    private_messages.body AS content,
                    private_messages.sent_at, 
                    sender.username AS sender_username,
                    receiver.username AS receiver_username
             FROM private_messages
             JOIN users AS sender ON private_messages.sender_id = sender.id
             JOIN users AS receiver ON private_messages.receiver_id = receiver.id
             WHERE private_messages.receiver_id = ? OR private_messages.sender_id = ?
             ORDER BY private_messages.sent_at DESC`,
            [userId, userId]
                    
          );

        reply.send(messages);
      } catch (err) {
        fastify.log.error(err);
        reply.code(500).send({ error: "Kunde inte hämta meddelanden." });
      }
    }
  );
}

module.exports = privateMessageRoutes;
