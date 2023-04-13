const { v4: uuidv4 } = require('uuid');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";

let userInRoom = [];
let callListUser = [];
let chats = [];

// setInterval(()=>{
//   data = {
//     chats: chats.map(e=>{
//       return {
//         uuid: e,
//         from: e.from,
//         like: e.likeList.length
//         }
//     }),
//   }
//   console.log({userInRoom: userInRoom.length, callListUser: callListUser.length})
// }, 20000)

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
      code: 0,
      msg: "Success",
    });

  } else {
    callback(null, { code: 1, msg: "user already exist." });
  }
};

const clearUser = (user)=>{
  userIndex = userInRoom.findIndex(e => e.user.name === user.name)
  if(userIndex != -1){
    userInRoom[userIndex].callMessage.end();
    userInRoom[userIndex].notificate.end();

    userInRoom.splice(userIndex, 1)
  }
  refreshMessage();
}

const outRoom = (call, callback) =>{
  const user = call.request;
  clearUser(user);
  callback(null, {});
  notifcateUserList();
}

const isValidLastLike = (name)=>{
  let indexLast = chats.map(e=> e.from).lastIndexOf(name)
  let lastMessage = chats[indexLast]
  return (!lastMessage || lastMessage.likeList.length >= 2 )
}

const sendMsg = (call, callback) => {
  var chatObj = call.request;
  if(!isValidLastLike(chatObj.from) || userInRoom.length < 3 ){
    return callback(null, {});
  }
  chatObj = {
    ...chatObj,
    uuid: chats.length+1,
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
  notifcateUserList();
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

  switch (true) {
    case !msg:
      callback(null, { code: 1, msg: "message not found"});
      break;
    case msg.likeList.map(e=>e.name).includes(user.name):
      callback(null, { code: 1, msg: "you have liked message"});
      break;
    case  msg.from == user.name:
      callback(null, { code: 1, msg: "can't like your message"});
      break;

    default:
      msg.likeList.push(user)
      if(isValidLastLike(msg.from)){
        sendNotificate(msg.from, {
          code: 0,
          msg: "you can send message."
        })
      }
      // userInRoom.forEach((e) => {
      //   e.callMessage.write(msg);
      // });
      callback(null, {
        code: 0,
        msg: "Success like",
      });
      break;
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
});

console.log("Server is running!");
