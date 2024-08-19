const PORT = 3001
// const SERVER_IP = '192.168.50.106'
const SERVER_IP = 'localhost'

let myInfo = {}

let socket = null
let socketId = 0
let roomId = 0
let pc = null
let localStream = null
const rooms = new Map()

initSocket()
initClickEvent()

function initClickEvent() {
  document.getElementById('submit-btn').addEventListener('click', function () {
    const roomId = document.querySelector('#room').value
    const userName = Math.random().toString(36).substr(2, 10) // 随机生成用户名
    if (!roomId || !userName) {
      alert('房间ID或姓名不能为空')
      return
    }
    console.log('Attempted to join room:', userName, roomId);
    myInfo = {
        'roomId':roomId,
        'userName': userName,
        'socketId':socketId
    };
    joinRoom(myInfo)
  })

  const chatBtn = document.getElementById('chat-btn')
  chatBtn.addEventListener('click', function () {
    requestVideoCall()
    chatBtn.setAttribute('disabled', true)
  })
}

// 初始化socket事件
function initSocket() {
  socket = io(`http://${SERVER_IP}:${PORT}`)

  socket.on('connected', onConnected)
  socket.on('room_created', onCreateRoom)
  socket.on('room_joined', onJoinRoomSuccess)
  socket.on('room_full', onJoinRoomFail)
  socket.on('receive_video', onReceiveVideo)
  socket.on('accept_video', onAcceptVideo)
  socket.on('receive_offer', onReceiveOffer)
  socket.on('receive_answer', onReceiveAnswer)
  socket.on('add_candidate', onAddCandidate)
}

function onEndCall() {
  if (pc) {
    pc.close()
    pc = null
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop())
    localStream = null
  }
  document.getElementById('local-video').srcObject = null
  document.getElementById('remote-video').srcObject = null
  document.getElementById('chat-btn').removeAttribute('disabled')
}

// 连接 WebSocket 成功
function onConnected(id) {
  socketId = id
  myInfo.socketId = socketId
  console.log('connected to socket',id)
}

// 创建并加入空房间
function onCreateRoom() {
  alert(`你已创建并加入【${myInfo.roomId}】房间`)
  showChatContainer()
}

// 加入房间成功
function onJoinRoomSuccess(existUser) {
  showChatContainer()
  const { userName, roomId, socketId } = existUser

  // 当前用户加入房间可不提示
  if (socketId !== myInfo.socketId) {
    console.log(`用户${userName}已加入【${roomId}】房间`)
  }
}

// 房间已满
function onJoinRoomFail() {
  alert('房间已满，请更换房间号ID')
}

// 收到视频通话申请
function onReceiveVideo(userInfo) {
  if (myInfo.socketId === userInfo.socketId) return

  if (window.confirm(`你要接收该用户${userInfo.userName}的视频通话邀请吗？`)) {
    acceptVideoCall()
  } else {
  }
}

// 用户接听视频
async function onAcceptVideo(userInfo) {
  document.getElementById('chat-btn').setAttribute('disabled', true)
  await createLocalMediaStream()
  createPeerConnection()
  if (userInfo.socketId !== myInfo.socketId) {
    await sendOffer()
  }
}

// 收到 offer 信令后应答
async function onReceiveOffer(offer) {
  if (!pc) return
  await pc.setRemoteDescription(offer)
  const answer = await pc.createAnswer()
  pc.setLocalDescription(answer)
  socket.emit('answer', { answer, userInfo: myInfo })
}

// 收到 answer 信令后
async function onReceiveAnswer(answer) {
  await pc.setRemoteDescription(answer)
}

async function onAddCandidate(candidate) {
  await pc.addIceCandidate(candidate)
}

// 加入房间
function joinRoom(message) {
  socket.emit('create_or_join_room', message)
}

// 发起视频通话
function requestVideoCall() {
  socket.emit('request_video', myInfo)
}

// 用户接听视频
function acceptVideoCall() {
  socket.emit('accept_video', myInfo)
}

// 创建本地媒体流
async function createLocalMediaStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  })
  document.getElementById('local-video').srcObject = localStream
}

// 建立点对点连接
function createPeerConnection() {
  if (!pc) {
    pc = new RTCPeerConnection()
  }

  pc.onicecandidate = onIceCandidate
  pc.oniceconnectionstatechange = onIceConnectionStateChange
  pc.ontrack = onTrack
  pc.onicegatheringstatechange = onicegatheringstatechange

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
  })
}

function onIceCandidate(event) {
  console.log('onIceCandidate', event, event.candidate)
  if (event.candidate) {
    socket.emit('add_candidate', { candidate: event.candidate, userInfo: myInfo })
  }
}

function onIceConnectionStateChange(event) {
  console.log(`oniceconnectionstatechange, pc.iceConnectionState is ${pc.iceConnectionState}.`)
}

function onTrack(event) {
  document.getElementById('remote-video').srcObject = event.streams[0]
  console.log('onTrack', event)
}

function onicegatheringstatechange() {
  console.log(`onicegatheringstatechange, pc.iceGatheringState is ${pc.iceGatheringState}.`)
}

// 发送方创建 offer
async function sendOffer() {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  socket.emit('offer', { offer, userInfo: myInfo })
}

function showChatContainer() {
  document.getElementById('form').style.display = 'none'
  document.getElementById('chat-container').style.display = 'block'
}
