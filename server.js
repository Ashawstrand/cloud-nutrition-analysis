const express = require('express');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();
const PORT = process.env.PORT || 8000;

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');

app.use(express.static(rootDir));
app.use(express.static(frontendDir));

// API endpoint to serve CSV from blob storage
app.get('/api/nutrition-data', async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient('nutrition-data');
    const blobClient = containerClient.getBlobClient('All_Diets.csv');
    
    const downloadResponse = await blobClient.download();
    const csvData = await streamToString(downloadResponse.readableStreamBody);
    
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData);
  } catch (err) {
    console.error('Blob storage error:', err);
    res.status(500).send('Error loading data from Azure Blob Storage');
  }
});

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => chunks.push(data));
    readableStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    readableStream.on('error', reject);
  });
}

// Cleanup resources endpoint
app.post('/cleanup-resources', async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient('nutrition-data');
    
    const deleteResponse = await containerClient.deleteIfExists();
    
    if (deleteResponse.succeeded) {
      res.json({ status: 'success', message: 'Successfully deleted nutrition-data container and all contents' });
    } else {
      res.json({ status: 'info', message: 'Container did not exist or was already deleted' });
    }
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ status: 'error', message: `Failed to cleanup resources: ${err.message}` });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nutritional Insights frontend running at http://localhost:${PORT}`);
});