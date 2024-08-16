const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

let dbPromise; // Store the MongoDB connection promise

// Middleware to parse the request body
app.use(bodyParser.urlencoded({ extended: true }));



app.use(express.static(path.join(__dirname, 'public')));

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Serve the login form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
  
    // Form a connection string using the provided credentials
    const mongoURI = `mongodb://${username}:${password}@${config.mongoHost}:${config.mongoPort}/admin`;

    try {
        // Try to connect to MongoDB with the provided credentials
        dbPromise = MongoClient.connect(mongoURI, { family: 4, useNewUrlParser: true, useUnifiedTopology: false })
            .then((client) => client.db('admin')); // Resolve to the connected database

        await dbPromise; // Wait for the connection promise to resolve

        console.log('Connected to MongoDB');
        res.redirect('/options'); // Redirect to the options page upon successful login

    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(401).send('Invalid credentials or unable to connect to MongoDB');
    }
});

// Options route
app.get('/options', (req, res) => {
    const formattedData = `
     <html>
      <head>
      <title>Options</title>
      <link rel="icon" href="icons8-book-94.png" type="image/x-icon">
      <link rel="shortcut icon" href="icons8-book-94.png" type="image/x-icon">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }

          h1 {
            color: #333;
          }

          .button-container {
            display: flex;
            justify-content: space-evenly;
            margin-top: 235px;
          }

          .button {
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 100px; /* Increased padding for larger buttons */
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 20px; /* Increased font size for larger buttons */
            cursor: pointer;
            border-radius: 10px;
            transition: background-color 0.3s;
          }

          .button:hover {
            background-color: #000500;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: #333;
            color: white;
          }
        
          .logout-container,
          .back-container {
            margin-top: 20px;
          }
        
          .logout-button,
          .back-button {
            background-color: #d9534f;
            border: none;
            color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            cursor: pointer;
            border-radius: 100px;
            transition: background-color 0.3s;
          }
        
          .logout-button:hover,
          .back-button:hover {
            background-color: #c9302c;
          } 

        </style>
      </head>
      <body>
      <div class="logout-container">
      <button class="logout-button"   onclick="goBack()">Back</button>
      <button class="logout-button" onclick="logout()">Logout</button>
    </div>
        <div class="button-container">
          <button class="button" onclick="redirectToPage('/currops')">Current Ops</button>
        </div>
        
        <script>
          function redirectToPage(path) {
            window.location.href = path;
          }
          function logout() {
            window.location.href = '/'; // Redirect to the login page or any desired page
          }
          function goBack() {
            window.history.back();
          }
        </script>
      </body>
    </html>
    `;

    res.send(formattedData);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Your existing route
app.get('/currops', async (req, res) => {
  console.log('Handling request...');
  try {

      db = await dbPromise;
      if (!db) {
          throw new Error('MongoDB connection not established');
        }
    const data = await db.command({ currentOp: 1 });

    const tableRows = [];

    data.inprog.forEach(async function (doc) {
      if (typeof doc.ns === "undefined" || doc.op === "none" || doc.ns === "local.oplog.rs" || doc.ns === "admin.$cmd.aggregate" || doc.ns === "admin.$cmd") {
        // Do nothing
      } else {
        const formattedDoc = `
          <tr>
            <td>${doc.opid}</td>
            <td>${doc.ns}</td>
            <td class="command-column" onclick="toggleCommandRow.call(this)">
${truncateCommand(JSON.stringify(doc.command))}
</td>

            <td>${doc.secs_running}</td>
            <td>${doc.planSummary}</td>
            <td>${doc.appName}</td>
          </tr>
          <tr class="hidden-command-row">
            <td colspan="7"><strong>Full Command:</strong> 
            ${JSON.stringify(doc.command)}
            <button onclick="copyToClipboard(this)">Copy</button>
            </td>
          </tr>
        `;
        tableRows.push(formattedDoc);
      }
    });

    // Wait for all asynchronous operations in the loop to complete
    await Promise.all(tableRows);

    const formattedData = `
      <meta http-equiv="refresh" content="10"> <!-- Auto-refresh every 10 seconds -->
      <link rel="icon" href="icons8-book-94.png" type="image/x-icon">
      <link rel="shortcut icon" href="icons8-book-94.png" type="image/x-icon">
      <style>

      h1 {
        background: linear-gradient(45deg, #3498db, #e74c3c, #2ecc71, #e67e22);
        background-size: 400% 400%;
        color: white;
        display: inline-block;
        padding: 10px; /* Optional: Add padding for better visibility */
        border-radius: 5px;
        animation: dance 2s infinite;
      }
    
      @keyframes dance {
        0%, 100% {
          transform: translateX(0);
        }
        25% {
          transform: translateX(-5px);
        }
        50% {
          transform: translateX(5px);
        }
        75% {
          transform: translateX(-5px);
        }
      }

      body {
        font-family: 'Arial', sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100vh;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background-color: #f4f4f4;
        color: white;
        width: 100%;
      }

      .logout-container,
      .back-container {
        margin-top: 20px;
      }

      .logout-button,
      .back-button {
        background-color: #d9534f;
        border: none;
        color: white;
        padding: 15px 32px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.3s;
      }

      .logout-button:hover,
      .back-button:hover {
        background-color: #c9302c;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 20px;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #4CAF50;
        color: white;
      }

      tr:hover {
        background-color: #f5f5f5;
      }

      .hidden-command-row {
        display: none;
        background-color: #e0e0e0;
      }

      .command-column {
        cursor: pointer;
        color: #007BFF;
        font-weight: bold;
      }
    </style>
      <script>
function toggleCommandRow() {
  const commandRow = this.parentElement.nextElementSibling;
  commandRow.style.display = commandRow.style.display === 'none' ? 'table-row' : 'none';
}
function copyToClipboard(button) {
  const commandCell = button.parentElement; // Assuming the button is placed after the command cell
  const commandText = commandCell.innerText.trim();

  const textarea = document.createElement('textarea');
  textarea.value = commandText;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);

  alert('Command copied to clipboard!');
}






</script>
<body>
<div class="header">
        <div class="back-container">
          <button class="back-button" onclick="goBack()">Back</button>
        </div>
        <h1>Current Ops Page</h1>
        <div class="logout-container">
          <button class="logout-button" onclick="logout()">Logout</button>
        </div>
      </div>
      <table border="1">
        <tr>
          <th>Opid</th>
          <th>Namespace</th>
          <th>Command</th>
          <th>Seconds Running</th>
          <th>Plan Summary</th>
          <th>App Name</th>
        </tr>
        ${tableRows.join('')}
      </table>
  <script>
    // Your existing JavaScript code for toggling command rows and copying to clipboard
    function logout() {
      window.location.href = '/'; // Redirect to the login page or any desired page
    }
    function goBack() {
      window.history.back();
    }
  </script>
    `;

    res.send(formattedData);
  } catch (err) {
    console.error('Error querying MongoDB:', err);
    res.status(500).send('Internal Server Error');
  }
});

function truncateCommand(command) {
  const maxLength = 50; // Set your desired maximum length
  return command.length > maxLength ? `${command.substring(0, maxLength)}...` : command;
}
