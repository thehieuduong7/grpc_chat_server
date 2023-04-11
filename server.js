const { v4: uuidv4 } = require('uuid');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";

let usersInChat = [];
let observers = [];
let chats = [];

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// we'll implement the handlers here
const join = (call, callback) => {
  const user = call.request;

  // check username already exists.
  const userExiist = usersInChat.find((_user) => _user.name == user.name);
  if (!userExiist) {
    usersInChat.push(user);
    callback(null, {
      error: 0,
      msg: "Success",
    });
  } else {
    callback(null, { error: 1, msg: "user already exist." });
  }
};

const outRoom = (call, callback) =>{
  const user = call.request;
  usersInChat = usersInChat.filter(e => e.name !== user.name)
  observers = observers.filter(e=> e.user.name !== user.name)
  console.log({observers, usersInChat})
  callback(null, {});

}

const sendMsg = (call, callback) => {
  var chatObj = call.request;

  console.log({
    chats,
    chatObj
  })
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
  observers.forEach((observer) => {
    observer.call.write(chatObj);
  });
  chats.push(chatObj);

  callback(null, {});
};

const getAllUsers = (call, callback) => {
  callback(null, { users: usersInChat });
};

const receiveMsg = (call, callback) => {
  const user = call.request
  observers.push({
    call,
    user: {
      name: user.user
    }
  });
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
      observers.forEach((observer) => {
        observer.call.write(msg);
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
