const ws = require('ws');
// const express = require('express');
const config = require('config');
const uuid = require('uuid').v4;
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || config.get("PORT")
// const WS_PORT = process.env.WS_PORT || config.get("WS_PORT")
// const staticPath = path.join(__dirname, "src")

// Express

// const app = express()
// app.use(express.static(staticPath))

// app.get("/", (req, res) => {
//     res.status(200).end()
// })

// console.log('ws port: ', WS_PORT);

// app.listen(PORT, "0.0.0.0", () => console.log(`Server start on port ${PORT}`))

// Http Server

const server = http.createServer((req, res) => {
    let filePath = ""

    if (req.url === "/") {
        filePath = path.join(__dirname, "src", "index.html")
        res.setHeader('Content-Type', 'text/html')
    } else {
        filePath = path.join(__dirname, "src", req.url)

        if (req.url.includes("css")) {
            res.setHeader('Content-Type', 'text/css')
        } else if (req.url.includes("js")) {
            res.setHeader('Content-Type', 'text/javascript')
        }
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

const wss = new ws.Server({ server })

wss.on("connection", socket => {
    const id = uuid()
    clients[id] = socket
    console.log(`Connected ${id}`);

    sendMessage(id, { type: "rooms", rooms }, true)

    socket.on("message", rawMessage => {
        const data = JSON.parse(rawMessage)

        switch (data?.type) {
            case "create":
                if (!rooms[id]) {
                    rooms[id] = {
                        name: data?.roomName || `Room #${Object.keys(rooms).length + 1}`,
                        clients: [id]
                    }

                    sendMessageFromObject(clients, { type: "rooms", rooms }, true)
                    sendMessage(id, { type: "successCreate" }, true)
                }
                break;

            case "join":
                if (data?.roomId !== id && !rooms[data?.roomId]?.clients?.includes(id)) {
                    rooms[data?.roomId].clients.push(id)
                    sendMessageFromArray(rooms[data?.roomId].clients, { type: "join", clientId: id })
                    sendMessage(id, { type: "successJoin" }, true)
                }
                break;

            case "offer":
                sendMessage(data?.clientId, { type: data?.type, clientId: id, offer: data?.offer })
                break;

            case "answer":
                sendMessage(data?.clientId, { type: data?.type, clientId: id, answer: data?.answer })
                break;

            case "candidate":
                sendMessage(data?.clientId, { type: data?.type, clientId: id, candidate: data?.candidate })
                break;

            default:
                break;
        }
    })

    socket.on("close", () => {
        if (clients[id].roomId) {
            rooms[clients[id].roomId].clients = rooms[clients[id].roomId].clients.filter(clientId => clientId !== id)
        }

        delete clients[id]
        delete rooms[id]
        sendMessageFromObject(clients, { type: "rooms", rooms })
    })

    function sendMessage(clientId, message, all = false) {
        if (all) {
            clients[clientId].send(JSON.stringify(message))
        } else {
            clientId !== id && clients[clientId]?.send(JSON.stringify(message))
        }
    }

    function sendMessageFromObject(obj, message, all) {
        for (key in obj) {
            sendMessage(key, message, all)
        }
    }

    function sendMessageFromArray(arr, message, all) {
        arr.forEach(clientId => {
            sendMessage(clientId, message, all)
        })
    }
})