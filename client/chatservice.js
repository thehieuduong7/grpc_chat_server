class ChatService{
  constructor(client, readline) {
    this.client = client
    this.readline = readline
    this.isBegin = false
  }

  joinRoom(name){
    this.client.join(
        {
          name
        },
        (err, res) => {

          if(err || res.code=='1') {
            printMessage('error', res.msg)
            process.exit(0);
          }
          this.user = {name: name}
          this.chatStream = this.client.receiveMsg({
            name: name
          });
          this.chatStream.on("data", (data) => {
            if(data.from !== name){
              printMessage('message', `${data.msg} (from: ${data.from}, uuid: ${data.uuid})`)

            }
          });
          this.chatStream.on("end", (response) => {
            this.outRoom();
          })

          this.getAllUsersStream();
          this.getNotificateStream();
        }
      );
  }
  getNotificateStream() {
    this.notificateStream = this.client.notificateUser(this.user, (err, res)=>{
      if(res.code==1){
        printMessage('error', res.msg)
      }
    });
    this.notificateStream.on("data", (res)=>{
      printMessage(res.code=='1' ? 'error' :'info', res.msg)
    });
    this.notificateStream.on("end", () => {
      this.outRoom()
    });
  }

  getAllUsersStream() {
    this.userListStream = this.client.getAllUsers({}, (err, res)=>{
      if(err){
        printMessage('error', response)
      }
    });
    this.userListStream.on("data", (response)=>{
      let usersList = response?.users || [];
      if (usersList.length < 3){
        clearScreen();
        console.log(`user: ${this.user.name}`)
        console.log(`group just ${usersList.length} members`)
        if(this.isBegin){
          this.isBegin = false;
        }
      }else{
        if(!this.isBegin){
          clearScreen();
          console.log(`user: ${this.user.name}`)
          console.log(`----------Wellcome to chat----------`)
          this.isBegin = true;
        }
      }
      }
    );
    this.userListStream.on("end", () => {
      this.outRoom()
    });
  }

  sendMsg(text){
    const msg = {
      msg: text,
      from: this.user.name,
      time: new Date().toLocaleString()
    };
    this.client.sendMsg(msg, (err, response) => {
      if(err){
        printMessage('error', response)
        console.log({err})
      }
    });
  }

  likeMsg(uuid){
    let likeReq = {
      user: this.user, uuid
    }

    this.client.likeToMessage(likeReq, (err, res)=>{
      printMessage(res.code=='1' ? 'error' :'info',
       `${res.msg}`)
    })
  }

  outRoom(){

    // this.chatStream.cancel();
    this.userListStream.cancel();
    this.client.outRoom(this.user,(err, res)=>{
      if(err) console.log({res});
    });
    console.log(`good bye ${this.user.name}`);
    process.exit(0);
  }
}

function printMessage(label, message){
  console.log(`[${label}]: ${message}`)
}

const readline = require('readline');


function clearScreen() {
  const blank = '\n'.repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

module.exports = {
    ChatService,
    printMessage
}
