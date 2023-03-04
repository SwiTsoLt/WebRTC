
// WS

const origin = window.location.href.split("//")[1].split(":")[0]
const url = window.location.href.includes("https")
    ? `wss://${origin}`
    : `ws://${origin}:3000`
const ws = new WebSocket(url)

const mediaConfig = {
    video: {
        width: 1280,
        height: 720
    },
    audio: false
}

const pc_clients = {}

ws.addEventListener("open", () => {
    ws.addEventListener("message", async response => {
        const data = JSON.parse(response.data)

        console.log(data);

        switch (data?.type) {
            case "rooms":
                printRooms(data?.rooms)
                break;

            case "successCreate":
                navigator?.mediaDevices?.getUserMedia(mediaConfig)
                    .then(async stream => {
                        startStream(stream, true)

                        ws.addEventListener("message", async res => {
                            const d = JSON.parse(res.data)

                            switch (d.type) {
                                case "join":
                                    pc_clients[d.clientId] = new RTCPeerConnection()

                                    console.log(pc_clients);

                                    pc_clients[d.clientId].addEventListener("icecandidate", event => {
                                        if (event.candidate) {
                                            send({ type: "candidate", clientId: d.clientId, candidate: event.candidate })
                                        }
                                    })

                                    pc_clients[d.clientId].addEventListener("track", event => {
                                        event.track.kind === "video" && event.streams.forEach(stream => startStream(stream))
                                    })

                                    stream.getTracks().forEach(track => pc_clients[d.clientId].addTrack(track, stream))

                                    const offer = await pc_clients[d.clientId].createOffer()
                                    pc_clients[d.clientId].setLocalDescription(offer)
                                    send({ type: "offer", clientId: d.clientId, offer })
                                    break;

                                case "answer":
                                    pc_clients[d.clientId].setRemoteDescription(d.answer)
                                    break;

                                case "candidate":
                                    pc_clients[d.clientId].addIceCandidate(new RTCIceCandidate(d.candidate))
                                    break;

                                default:
                                    break;
                            }
                        })
                    })
                break;

            case "successJoin":
                navigator?.mediaDevices?.getUserMedia(mediaConfig)
                    .then(async stream => {
                        startStream(stream, true)

                        ws.addEventListener("message", async res => {
                            const d = JSON.parse(res.data)

                            switch (d.type) {
                                case "join":
                                    pc_clients[d.clientId] = new RTCPeerConnection()

                                    pc_clients[d.clientId].addEventListener("icecandidate", event => {
                                        if (event.candidate) {
                                            send({ type: "candidate", clientId: d.clientId, candidate: event.candidate })
                                        }
                                    })

                                    pc_clients[d.clientId].addEventListener("track", event => {
                                        event.track.kind === "video" && event.streams.forEach(stream => startStream(stream))
                                    })

                                    stream.getTracks().forEach(track => pc_clients[d.clientId].addTrack(track, stream))

                                    const offer = await pc_clients[d.clientId].createOffer()
                                    pc_clients[d.clientId].setLocalDescription(offer)
                                    send({ type: "offer", clientId: d.clientId, offer })
                                    break;

                                case "answer":
                                    pc_clients[d.clientId].setRemoteDescription(d.answer)
                                    break;

                                case "candidate":
                                    pc_clients[d.clientId]?.addIceCandidate(new RTCIceCandidate(d.candidate))
                                    break;

                                default:
                                    break;
                            }
                        })
                    })

                if (!navigator?.mediaDevices?.getUserMedia) {
                    console.log('no');
                    ws.addEventListener("message", async res => {
                        const d = JSON.parse(res.data)

                        switch (d.type) {
                            case "join":
                                pc_clients[d.clientId] = new RTCPeerConnection()

                                pc_clients[d.clientId].addEventListener("icecandidate", event => {
                                    if (event.candidate) {
                                        send({ type: "candidate", clientId: d.clientId, candidate: event.candidate })
                                    }
                                })

                                pc_clients[d.clientId].addEventListener("track", event => {
                                    console.log("track", event);
                                    event.track.kind === "video" && event.streams.forEach(stream => startStream(stream))
                                })

                                // stream.getTracks().forEach(track => pc_clients[d.clientId].addTrack(track, stream))

                                const offer = await pc_clients[d.clientId].createOffer()
                                pc_clients[d.clientId].setLocalDescription(offer)
                                send({ type: "offer", clientId: d.clientId, offer })
                                break;

                            case "answer":
                                pc_clients[d.clientId]?.setRemoteDescription(d.answer)
                                break;

                            case "candidate":
                                pc_clients[d.clientId]?.addIceCandidate(new RTCIceCandidate(d.candidate))
                                break;

                            default:
                                break;
                        }
                    })
                }
                break;

            case "offer":
                navigator?.mediaDevices?.getUserMedia(mediaConfig)
                    .then(async stream => {
                        startStream(stream, true)

                        pc_clients[data.clientId] = new RTCPeerConnection()

                        pc_clients[data.clientId].addEventListener("icecandidate", event => {
                            if (event.candidate) {
                                send({ type: "candidate", clientId: data.clientId, candidate: event.candidate })
                            }
                        })

                        pc_clients[data.clientId].addEventListener("track", event => {
                            event.track.kind === "video" && event.streams.forEach(stream => startStream(stream))
                        })

                        stream.getTracks().forEach(track => pc_clients[data.clientId].addTrack(track, stream))

                        pc_clients[data.clientId].setRemoteDescription(data?.offer)

                        const answer = await pc_clients[data.clientId].createAnswer()
                        pc_clients[data.clientId].setLocalDescription(answer)
                        send({ type: "answer", clientId: data.clientId, answer })
                    })
                break;

            case "candidate":
                pc_clients[data.clientId]?.addIceCandidate(new RTCIceCandidate(data.candidate))
                break;

            default:
                break;
        }
    })
})

function send(message) {
    ws.send(JSON.stringify(message))
}

// DOM

const roomNameInput = document.getElementById("roomNameInput")
const createRoomButton = document.getElementById("createRoomButton")
const videoListElem = document.getElementById("videoList")
const roomListElem = document.getElementById("roomList")

createRoomButton.addEventListener("click", createRoom)

function printRooms(rooms) {
    roomListElem.innerHTML = ""

    for (roomId in rooms) {
        const room = rooms[roomId]

        const newRoomElem = document.createElement("div")
        const newNameElem = document.createElement("p")
        const newConnnectButtonElem = document.createElement("button")

        newRoomElem.classList.add("room")
        newNameElem.classList.add("name")
        newConnnectButtonElem.classList.add("connectButton")

        newNameElem.innerText = room.name
        newConnnectButtonElem.roomId = roomId
        newConnnectButtonElem.innerText = "join"
        newConnnectButtonElem.addEventListener("click", join)

        newRoomElem.appendChild(newNameElem)
        newRoomElem.appendChild(newConnnectButtonElem)
        roomListElem.appendChild(newRoomElem)
    }
}

function createRoom() {
    const roomName = roomNameInput.value
    send({ type: "create", roomName })
}

function join(event) {
    send({ type: "join", roomId: event.target.roomId })
}

function startStream(stream, isLocal) {
    const newVideoElem = document.createElement("video")
    const videoElemList = document.querySelectorAll("video.local")
    const videoLocalElemList = document.querySelectorAll("video.local")

    if (!isLocal || (isLocal && !videoLocalElemList.length)) {
        newVideoElem.width = mediaConfig.video.width
        newVideoElem.hight = mediaConfig.video.height
        newVideoElem.srcObject = stream
        newVideoElem.autoplay = true
        newVideoElem.id = `el${videoListElem.childNodes.length}`
        console.log(videoListElem.childNodes);
        isLocal && newVideoElem.classList.add("local")
        videoListElem.appendChild(newVideoElem)
    }

    // const audioContext = new AudioContext();
    // const mediaStreamAudioSourceNode = audioContext?.createMediaStreamSource(stream);
    // const analyserNode = audioContext?.createAnalyser();
    // mediaStreamAudioSourceNode?.connect(analyserNode);
    // const pcmData = new Float32Array(analyserNode?.fftSize);
    // const onFrame = () => {
    //     analyserNode.getFloatTimeDomainData(pcmData);
    //     let sumSquares = 0.0;
    //     for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
    //     setUserTalkLevel(Math.sqrt(sumSquares / pcmData.length), newVideoElem)
    //     window.requestAnimationFrame(onFrame);
    // };
    // window.requestAnimationFrame(onFrame);
}

function setUserTalkLevel(level, el) {

    if (level > 0.008) {
        el.classList.add("talk")
        el.muted = false
    } else {
        el.classList.remove("talk")
        el.muted = true
    }
}