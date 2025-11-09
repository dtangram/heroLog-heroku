const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const log = require('debug')('reactjs:logging');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Heroku Staging
// Serve any static files
app.use(express.static(path.join(__dirname, 'reactjs/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'reactjs/build', 'index.html'));
});

// Heroku Production
// if (process.env.NODE_ENV === 'production') {
//   // Serve any static files
//   app.use(express.static(path.join(__dirname, 'reactjs/build')));
//
//   // Handle React routing, return all requests to React app
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'reactjs/build', 'index.html'));
//   });
// }

app.listen(port, () => log(`Listening on port ${port}`));
