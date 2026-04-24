const express = require('express');
const router = express.Router();
// const admin = require('firebase-admin');

// Example: Get basic stats
router.get('/stats', (req, res) => {
  res.json({
    status: 'success',
    data: {
      totalSocieties: 10,
      activeUsers: 150
    }
  });
});

// Example: Trigger an action (like sending notifications)
router.post('/notify', async (req, res) => {
  const { title, body, societyId } = req.body;
  
  if(!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  // TODO: Use Firebase Admin SDK to push notifications or write secured DB edits
  // await admin.messaging().sendToTopic(societyId, { notification: { title, body } });

  res.json({ message: 'Notification sent successfully', title, body });
});

module.exports = router;
