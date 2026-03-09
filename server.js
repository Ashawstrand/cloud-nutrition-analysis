const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');

app.use(express.static(rootDir));
app.use(express.static(frontendDir));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nutritional Insights frontend running at http://localhost:${PORT}`);
});