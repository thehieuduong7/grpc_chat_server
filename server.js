const { v4: uuidv4 } = require('uuid');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";

let userInRoom = [];
let callListUser = [];
let chats = [];

// setInterval(()=>{
//   console.log({userInRoom: userInRoom.length, callListUser: callListUser.length,})
// }, 5000)

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// we'll implement the handlers here
const join = (call, callback) => {
  const user = call.request;

  // check username already exists.
  const userExiist = userInRoom.find((e) => e.user.name == user.name);
  if (!userExiist) {
    userInRoom.push({user});
    callback(null, {
      error: 0,
      msg: "Success",
    });
    notifcateUserList();
  } else {
    callback(null, { error: 1, msg: "user already exist." });
  }
};

const clearUser = (user)=>{
  userIndex = userInRoom.findIndex(e => e.user.name === user.name)
  if(userIndex != -1){
    userInRoom[userIndex].callMessage.end();
    userInRoom.splice(userIndex, 1)
  }
}

const outRoom = (call, callback) =>{
  const user = call.request;
  clearUser(user);
  callback(null, {});
  notifcateUserList();
}

const sendMsg = (call, callback) => {
  var chatObj = call.request;
  let indexLast = chats.map(e=> e.from).lastIndexOf(chatObj.from)
  let lastMessage = chats[indexLast]
  if(!!lastMessage && lastMessage.likeList.length < 2 ){
    return callback(null, {});
  }

  chatObj = {
    ...chatObj,
    uuid: uuidv4(),
    likeList: []
  }
  // check du like moi cho send all
  userInRoom.forEach((e) => {
    e.callMessage.write(chatObj);
  });
  chats.push(chatObj);

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
  })
};

const receiveMsg = (call, callback) => {
  const user = call.request
  let indexUser = userInRoom.findIndex(e=> e.user.name === user.user)
  userInRoom[indexUser].callMessage = call
  call.on("cancelled", ()=>{
    clearUser({name: user.user})
    notifcateUserList();
  })
};

const getAllMessages = (call, callback) => {
  callback(null, { messages: chats });
};

const likeToMessage = (call, callback) => {
  const {uuid, user} = call.request;
  let msg = chats.find(e => e.uuid == uuid);

  switch (true) {
    case !msg:
      callback(null, { error: 1, msg: "message not found"});
      break;
    case msg.likeList.map(e=>e.name).includes(user.name):
      callback(null, { error: 1, msg: "you have liked message"});
      break;
    case  msg.from == user.name:
      callback(null, { error: 1, msg: "Can't like your message"});
      break;

    default:
      msg.likeList.push(user)
      userInRoom.forEach((e) => {
        e.callMessage.write(msg);
      });
      callback(null, {
        error: 0,
        msg: "Success like",
      });
      break;
  }
};

const server = new grpc.Server();

server.addService(protoDescriptor.ChatService.service, {
  join,
  sendMsg,
  getAllUsers,
  receiveMsg,
  getAllMessages,
  likeToMessage,
  outRoom
});

server.bindAsync(SERVER_URI, grpc.ServerCredentials.createInsecure(), ()=>{
  server.start();
});

console.log("Server is running!");
