const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
app.use(cors());

app.get('/theme', (req, res) => {
  const storeUrl = req.query.url;
  if (!storeUrl) return res.status(400).json({ error: 'URL is required' });

  try {
    const parsedUrl = new URL(storeUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    client.get(storeUrl, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        const match = data.match(/Shopify\.theme\s*=\s*({[^;]+});/);
        if (match) {
          const json = JSON.parse(match[1].replace(/\\\//g, '/'));
          res.json({
            name: json.name,
            id: json.id,
            version: json.schema_version,
            schema: json.schema_name
          });
        } else {
          res.status(404).json({ error: 'Theme not found' });
        }
      });
    }).on('error', () => {
      res.status(500).json({ error: 'Fetch failed' });
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
