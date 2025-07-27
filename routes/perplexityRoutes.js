const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/perplexity', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/v1/ask',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`, 
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Perplexity API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch summary from Perplexity API' });
  }
});

module.exports = router;
