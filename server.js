const { v4: uuidv4 } = require('uuid');
const {printMessage} = require("./server/chatService")

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);




let userInRoom = [];
let callListUser = [];
let chats = [];
const MIN_USERS = 3

// we'll implement the handlers here
const join = (call, callback) => {
  const user = call.request;
  // check username already exists.
  const userExiist = userInRoom.find((e) => e.user.name == user.name);
  if (!userExiist) {
    userInRoom.push({user});
    callback(null, {
      code: 0,
      msg: "Success",
    });
    printMessage("login",`${user.name} joined, users: [${userInRoom.map(e=>e.user.name).join(", ")}]`)
    if(userInRoom.length==MIN_USERS){
      printMessage("server",`start chat, (current ${userInRoom.length})`);
    }

    userInRoom.forEach(e=>{
      e.notificate?.write({
        code: 0,
        msg: `${user.name} joined, users: [${userInRoom.map(e=>e.user.name).join(", ")}]`
      })
    })
    setTimeout(notifcateUserList, 100);
  } else {
    let errorMessage = `${user.name} already exist.`;
    printMessage("login error", errorMessage)
    callback(null, { code: 1, msg: errorMessage});
  }
};

const clearUser = (user)=>{
  userIndex = userInRoom.findIndex(e => e.user.name === user.name)
  if(userIndex != -1){
    userInRoom[userIndex].callMessage.end();
    userInRoom[userIndex].notificate.end();
    userInRoom.splice(userIndex, 1);

    //log user sign out

    printMessage("logout",`${user.name} left, users: [${userInRoom.map(e=>e.user.name).join(", ")}]`)
    if(userInRoom.length == MIN_USERS-1){
      printMessage("server",`waiting user, (current ${userInRoom.length})`);
    }
    userInRoom.forEach(e=>{
      e.notificate.write({
        code: 0,
        msg: `${user.name} left, users: [${userInRoom.map(e=>e.user.name).join(", ")}]`
      })
    })
  }
  refreshMessage();
}

const outRoom = (call, callback) =>{
  const user = call.request;
  clearUser(user);
  callback(null, {});
  setTimeout(notifcateUserList, 100)
}

const isValidLastLike = (name)=>{
  let indexLast = chats.map(e=> e.from).lastIndexOf(name)
  let lastMessage = chats[indexLast]
  return (!lastMessage || lastMessage.likeList.length >= 2 )
}

const sendMsg = (call, callback) => {
  var chatObj = call.request;

  // check du like moi cho send all
  if(!isValidLastLike(chatObj.from) || userInRoom.length < MIN_USERS ){
    printMessage("message error", `${chatObj.msg} (from: ${chatObj.from})`)
    sendNotificate(chatObj.from, {
      code: 1,
      msg: `you can't send next message`
    })
    return callback(null, {});
  }
  let data= {
    ...chatObj,
    uuid: chats.length+1,
    likeList: []
  }
  userInRoom.forEach((e) => {
    e.callMessage.write(data);
  });
  chats.push(data);
  printMessage('message', `${data.msg} (from: ${data.from}, uuid: ${data.uuid})`)

  callback(null, {});
};

const notifcateUserList = ()=>{
  callListUser.forEach(e=>{
    e.write({users: userInRoom.map(e=> e.user)})
  })
}
const getAllUsers = (call, callback) => {
  callListUser.push(call)
  call.write({ users: userInRoom.map(e => e.user)})
  call.on("cancelled", ()=>{
    callListUser = callListUser.filter(e=> e !== call)
    call.end();
  })
};

const receiveMsg = (call, callback) => {
  const user = call.request
  let indexUser = userInRoom.findIndex(e=> e.user.name === user.name)
  userInRoom[indexUser].callMessage = call
  call.on("cancelled", ()=>{
    clearUser({name: user.name})
    notifcateUserList();
  })
};

const refreshMessage = ()=>{
  if(userInRoom.length<5){
    chats = []
  }
}
const getAllMessages = (call, callback) => {
  callback(null, { messages: chats });
};

const likeToMessage = (call, callback) => {
  const {uuid, user} = call.request;
  let msg = chats.find(e => e.uuid == uuid);
  let msgError = "";
  switch (true) {
    case !msg:
      msgError = "message not found"
      break;
    case msg.likeList.map(e=>e.name).includes(user.name):
      msgError = "have liked message"
      break;
    case  msg.from == user.name:
      msgError = "can't like your message"

      break;

    default:
      msg.likeList.push(user)

      // notificate to user send msg
      sendNotificate(msg.from, {
        code: 0,
        msg: `${user.name} like your msg uuid=${msg.uuid} (${msg.likeList.length} likes${
          isValidLastLike(msg.from)? "- you can send next message." : ""})`
      })

      callback(null, {
        code: 0,
        msg: "Success like",
      });
      printMessage("like", `${user.name} like msg uuid=${msg.uuid} (${msg.likeList.length} likes)`);
      break;
  }
  if(msgError != ""){
    callback(null, { code: 1, msg: msgError});
    printMessage("like error", `${user.name} like ${uuid} (${msgError})`);
  }
};

const sendNotificate = (name, data)=>{
  callNotificate = userInRoom.find(e=> e.user.name === name)?.notificate
  if(!callNotificate) return;
  callNotificate.write(data)
}

const notificateUser = (call,callback) => {
  const user = call.request
  let indexUser = userInRoom.findIndex(e=> e.user.name === user.name)
  userInRoom[indexUser].notificate = call
  call.on("cancelled", ()=>{
    clearUser({name: user.name})
    notifcateUserList();
  })
}

const server = new grpc.Server();

server.addService(protoDescriptor.ChatService.service, {
  join,
  sendMsg,
  getAllUsers,
  receiveMsg,
  getAllMessages,
  likeToMessage,
  outRoom,
  notificateUser
});

server.bindAsync(SERVER_URI, grpc.ServerCredentials.createInsecure(), ()=>{
  server.start();
  printMessage("server",`------server start------`);
});
// printMessage("server",`waiting user, (current ${userInRoom.length})`);

process.on('SIGINT', () => {
  printMessage("server",`------server shut down------`);
  process.exit(0)
});
