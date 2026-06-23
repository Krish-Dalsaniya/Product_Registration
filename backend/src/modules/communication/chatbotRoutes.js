const express = require('express');
const router = express.Router();
const chatbotController = require('./chatbotController');
const { verifyToken } = require('../../middleware/auth');

router.use(verifyToken); // Ensure only authenticated users can use the chatbot

router.post('/chat', chatbotController.chat);

module.exports = router;
