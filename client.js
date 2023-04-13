const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const { ChatService} = require('./client/chatservice')

const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const client = new protoDescriptor.ChatService(
  SERVER_URI,
  grpc.credentials.createInsecure()
);

const readline = require('readline')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const chatservice = new ChatService(client, rl)


function startChat (username){
  try {
    chatservice.joinRoom(username)
    rl.on("line", function(text) {
      if (!chatservice.isBegin){
        return;
      }
      text=text.split(':')
      switch (text[0]) {
        case '1':
          chatservice.sendMsg(text[1])
          break;
        case '2':
          chatservice.likeMsg(text[1])
          break;
        case '0':
          chatservice.outRoom()
          break;
        default:
          break;
      }
   });
  } catch (error) {
    console.log({error})
    process.exit(0)
  }
}

  // Handle the SIGINT signal
  process.on('SIGINT', () => {
    chatservice.outRoom()
  });

rl.question("What's ur name? ", answer => {
  startChat(answer);
});
