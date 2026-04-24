require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Ensure you download your serviceAccountKey.json from Firebase Console
// and place it in the backend folder for Admin privileges.
// const serviceAccount = require('./serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'Panchayat Backend Server is Running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
