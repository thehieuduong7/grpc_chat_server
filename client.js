const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "chat.proto";
const SERVER_URI = "0.0.0.0:9090";

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const client = new protoDescriptor.ChatService(
  SERVER_URI,
  grpc.credentials.createInsecure()
);

// client.getAllUsers(null,(err, res) =>{
//   // console.log({message: res.messages[0].likeList})
//   // if(res.messages && res.messages.length != 0) {
//   //   client.likeToMessage({
//   //     uuid: res.messages[0].uuid,
//   //     user: {
//   //       username: "op221"
//   //     }
//   //   },(error, response) => {
//   //     if(error) {
//   //       console.log(error)
//   //     }
//   //     console.log({responseLike: response});
//   //   })
//   // }
//   console.log({
//     message: res.users
//   })
// })

var cs = client.getAllUsers({
      });
cs.on("data", (data) => {
  console.log(data.users);
});

cs.on("status", (status) => {
  console.log({status});
});


// client.join(
//   {
//     username: "op2",
//   },
//   (err, res) => {
//     console.log(err, res);
//     var cs = client.receiveMsg({
//       username: "op2",
//     });
//     cs.on("data", (data) => {
//       console.log({data});
//     });

//     cs.on("status", (status) => {
//       console.log({status});
//     });

//     // client.sendMsg(
//     //   {
//     //     from: "op2",
//     //     msg: "hello op2",
//     //   },
//     //   (error, news) => {
//     //     if (!error) console.log({error});
//     //     console.log({news});
//     //   }
//     // );
//   }
// );




/*
cs.on("data", (data) => {
  console.log(data);
});

client.sendMsg(
  {
    to: "op",
    from: "op",
    msg: "oppps",
  },
  (error, news) => {
    if (!error) console.log(error);
    console.log(news);
  }
);
*/
