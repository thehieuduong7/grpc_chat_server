class ChatService{
  constructor(client, readline) {
    this.client = client
    this.readline = readline
    this.isBegin = false
    this.isFirst = true
  }

  joinRoom(name){
    this.client.join(
        {
          name
        },
        (err, res) => {
          if(err || res.code=='1') {
            printMessage('error', err || res?.msg)
            process.exit(0);
          }
          this.user = {name: name}

          // print header
          printGuide();
          console.log(`Current user: ${this.user.name}`)
          //

          this.chatStream = this.client.receiveMsg({
            name: name
          });
          this.chatStream.on("data", (data) => {
            printMessage('message', `${data.msg} (from: ${data.from}, uuid: ${data.uuid})`)
          });
          this.chatStream.on("end", (response) => {
            this.outRoom();
          })
          this.chatStream.on('error', (error) => {
            printMessage("server", "server is down");
            process.exit(0)
          });
          this.getNotificateStream();
          this.getAllUsersStream();
        }
      );
  }
  getNotificateStream() {
    this.notificateStream = this.client.notificateUser(this.user, (err, res)=>{
      if(err || res.code=='1') {
        printMessage('error', err || res?.msg)
      }
    });
    this.notificateStream.on("data", (res)=>{
      printMessage(res.code=='1' ? 'error' :`info`, res.msg)
    });
    this.notificateStream.on("end", () => {
      this.outRoom()
    });
    this.notificateStream.on('error', (error) => {
      printMessage("server", "server is down");
      process.exit(0)
    });
  }

  getAllUsersStream() {
    this.userListStream = this.client.getAllUsers({}, (err, res)=>{
      if(err || res.code=='1') {
        printMessage('error', err || res?.msg)
      }
    });
    this.userListStream.on("data", (response)=>{
      let usersList = response?.users || [];
      if (this.isBegin != usersList.length >= 3 || this.isFirst){
        printMessage(`info`,  usersList.length >= 3 ?
          "group ready to chat":
          "group not ready to chat"
         );
        this.isBegin = usersList.length >= 3;
        this.isFirst = false;
      }
      }
    );
    this.userListStream.on("end", () => {
      this.outRoom()
    });
    this.userListStream.on('error', (error) => {
      printMessage("server", "server is down");
      process.exit(0)
    });

  }

  sendMsg(text){
    // clear the current line
    const msg = {
      msg: text,
      from: this.user.name,
      time: new Date().toLocaleString()
    };
    this.client.sendMsg(msg, (err, res) => {
      if(err || res.code=='1') {
        printMessage('error', err || res?.msg)
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
      if(err || res.code=='1') {
        printMessage('error', err || res?.msg)
      }
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

function printGuide() {
  console.log("action <code>:<data>")
  console.log("code 0: Out room.")
  console.log("code 1: Send message.")
  console.log("code 2: Like message.")
}

module.exports = {
    ChatService,
    printMessage
}
