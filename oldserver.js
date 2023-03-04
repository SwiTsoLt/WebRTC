const ws = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000
const WS_PORT = process.env.WS_PORT || 8000

// Http Server

http.createServer((req, res) => {
    let filePath = ""

    if (req.url === "/") {
        filePath = path.join(__dirname, "src", "index.html")
    } else {
        filePath = path.join(__dirname, "src", req.url)
    }

    const fileExists = fs.existsSync(filePath)

    if (fileExists) {
        const file = fs.readFileSync(filePath)
        res.end(file)
    }
    res.end()
}).listen(PORT)

// WS

const clients = {}
const rooms = {}

const wss = new ws.Server({ port: WS_PORT })

wss.on("connection", socket => {
    try {
        const id = Date.now()
        clients[id] = socket
        console.log(`Connected ${id}`);

        sendMessage(id, { type: "rooms", rooms }, true)

        socket.on("message", rawMessage => {
            try {
                const data = JSON.parse(rawMessage)

                switch (data.type) {
                    case "create":
                        if (!rooms[id]) {
                            rooms[id] = {
                                name: data.roomName || `Room #${Object.keys(rooms).length + 1}`,
                                clients: [id]
                            }

                            sendMessageFromObject(clients, { type: "rooms", rooms }, true)
                            sendMessage(id, { type: "successCreate" }, true)
                        }
                        break;

                    case "join":
                        if (data.roomId !== id && !rooms[data.roomId].clients.includes(id)) {
                            rooms[data.roomId].clients.push(id)
                            sendMessageFromArray(rooms[data.roomId].clients, { type: "join", clientId: id })
                            sendMessage(id, { type: "successJoin" }, true)
                        }
                        break;

                    case "offer":
                        sendMessage(data.clientId, { type: data.type, clientId: id, offer: data.offer })
                        break;

                    case "answer":
                        sendMessage(data.clientId, { type: data.type, clientId: id, answer: data.answer })
                        break;

                    case "candidate":
                        sendMessage(data.clientId, { type: data.type, clientId: id, candidate: data.candidate })
                        break;

                    default:
                        break;
                }
            } catch (e) {
                console.log(e);
            }
        })

        socket.on("close", () => {
            try {
                if (clients[id].roomId) {
                    rooms[clients[id].roomId].clients = rooms[clients[id].roomId].clients.filter(clientId => clientId !== id)
                }

                delete clients[id]
                delete rooms[id]
                sendMessageFromObject(clients, { type: "rooms", rooms })
            } catch (e) {
                console.log(e);
            }
        })

        function sendMessage(clientId, message, all = false) {
            try {
                if (all) {
                    clients[clientId].send(JSON.stringify(message))
                } else {
                    clientId !== id && clients[clientId].send(JSON.stringify(message))
                }
            } catch (e) {
                console.log(e);
            }
        }

        function sendMessageFromObject(obj, message, all) {
            try {
                for (key in obj) {
                    sendMessage(key, message, all)
                }
            } catch (e) {
                console.log(e);
            }
        }

        function sendMessageFromArray(arr, message, all) {
            try {
                arr.forEach(clientId => {
                    sendMessage(clientId, message, all)
                })
            } catch (e) {
                console.log(e);
            }
        }
    } catch (e) {
        console.log(e);
    }
})