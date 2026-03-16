const WebSocket = require("ws");
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer(async (req, res) => {
  try {
    // Map paths to archives
    let filePath;
    
    // if the path is / o /index.html -> shows index.html
    if (req.url === '/' || req.url === '/index.html') {
      filePath = path.join(__dirname, 'index.html');
    } 
    // if the path is /prompt.html -> shows prompt.html
    else if (req.url === '/prompt.html') {
      filePath = path.join(__dirname, 'prompt.html');
    }
      else if (req.url === '/interval.html') {
      filePath = path.join(__dirname, 'interval.html');
    }
    // For any other file (CSS, JS, images)
    else {
      filePath = path.join(__dirname, req.url);
    }
    
    // Read and serve the file
    const data = await fs.readFile(filePath);
    
    //Content-Type
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
    
  } catch (error) {
 // If the file does not exist, return 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>404 - not found</h1>
      <p>couldn't find: ${req.url}</p>
      <a href="/">go back to start</a>
    `);
  }
});

// Attach WebSocket to the HTTP server
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on("connection", (ws) => {
  const id = uuidv4();
  const color = Math.floor(Math.random() * 360);
  const metadata = { id, color };

  clients.set(ws, metadata);
  
  // Opcional: Notificar a todos que un nuevo usuario se conectó
  const joinMessage = {
    type: "system",
    content: `User ${id.substring(0, 4)} joined the chat`,
    sender: "system",
    color: 0,
    timestamp: Date.now()
  };
  
  [...clients.keys()].forEach((client) => {
    if (client !== ws) { // No enviar al nuevo usuario
      client.send(JSON.stringify(joinMessage));
    }
  });

  ws.on("message", (messageAsString) => {
    const message = JSON.parse(messageAsString);
    const metadata = clients.get(ws);

    message.sender = metadata.id;
    message.color = metadata.color;
    const outbound = JSON.stringify(message);

    [...clients.keys()].forEach((client) => {
      client.send(outbound);
    });

    console.log(message);  
  });

  ws.on("close", () => {
    // 🔴 IMPORTANTE: Aquí capturamos la desconexión
    const disconnectedUser = clients.get(ws);
    
    // Crear mensaje de desconexión
    const leaveMessage = {
      type: "system",
      content: `User ${disconnectedUser.id.substring(0, 4)} left the chat`,
      sender: "system",
      color: 0,
      timestamp: Date.now()
    };
    
    // Eliminar al cliente del Map ANTES de notificar
    clients.delete(ws);
    
    // Notificar a todos los clientes restantes que alguien se fue
    console.log(`🔴 User ${disconnectedUser.id.substring(0, 4)} disconnected`);
    
    [...clients.keys()].forEach((client) => {
      client.send(JSON.stringify(leaveMessage));
    });
  });
});

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PORT = 7071;
server.listen(PORT, () => {
  console.log(`live server http://localhost:${PORT}`);
});