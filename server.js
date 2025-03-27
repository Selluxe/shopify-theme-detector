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

    client.get(storeUrl, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          // Extract full Shopify object using regex
          const match = data.match(/Shopify\s*=\s*Shopify\s*\|\|\s*{};([\s\S]*?)Shopify\.routes\s*=\s*Shopify\.routes\s*\|\|/);
          if (!match) return res.status(404).json({ error: 'Shopify config not found in HTML.' });

          const block = match[0];

          // Extract individual values using regex
          const shop = block.match(/Shopify\.shop\s*=\s*"([^"]+)"/)?.[1];
          const themeName = block.match(/Shopify\.theme\s*=\s*{[^}]*"name"\s*:\s*"([^"]+)"/)?.[1];
          const schemaName = block.match(/"schema_name"\s*:\s*"([^"]+)"/)?.[1];
          const schemaVersion = block.match(/"schema_version"\s*:\s*"([^"]+)"/)?.[1];

          if (!shop && !themeName && !schemaName) {
            return res.status(404).json({ error: 'Shopify values not found.' });
          }

          res.json({
            shop,
            theme_name: themeName,
            schema_name: schemaName,
            schema_version: schemaVersion
          });
        } catch (err) {
          res.status(500).json({ error: 'Error parsing Shopify data.' });
        }
      });
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to fetch site.' });
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
