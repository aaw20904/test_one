
/**
 * this app for testing web-sockets when the network turn off unexpectedly
 It has`nt ANY  rdbms. THis app hasn`t ANY security: no hashing, no passwords.
 There may by a " men/women in the middle" 
 */
 const util = require('node:util');
 const http = require('http');
 const WebSocket = require('ws');
 const CLIENT_MSG = 1|0;
 const SERVER_MSG = 2|0;
 const ALL_THE_CHAT = 3|0;
 const ECHO  = 4|0;
 const STAT_MSG = 5|0;
const express = require('express');
const fs = require("fs")
const app = express();
const cookieParser = require('cookie-parser');
var cookie = require('cookie');
app.use(cookieParser());
connections = {}

///storage for names.Names uses as key when you logIn
let names = new Set();
names.add("Dima");
names.add("Andrew");
names.add("Ruslan");
names.add("Guest");
let client_messages = [];

client_messages.push({usr:"Ruslan",msg:"HelloWord!",online:false})
//creating a http server.It will be listen 
//and when there will be 304 status - pushs it into a WS server
// to initializate a WS server
const server = http.createServer();

//when there is 304 status - does authentication by cookie
server.on('upgrade', async function upgrade(request, socket, head) {
 
  let args;
  let cookies_req = cookie.parse(request.headers.cookie);
  //is the user in system?
   if (!names.has(cookies_req.usr_name)){
      socket.destroy(); 
      return;
   }
  //if the socket is dead (IP changing by mobile operator or short communication failure)
  //and PING-PONG system didn`t found it
  if (connections[cookies_req.usr_name]) {
    //close exist 'dead' connection
    connections[cookies_req.usr_name].terminate();
    //clean the connection pool
    delete connections[cookies_req.usr_name];
  }
  

//push a socket and request to handshake and  establish WS connection
  wss.handleUpgrade(request, socket, head, function done(ws) {
    ws.m2f4_id = cookies_req.usr_name;
    connections[cookies_req.usr_name] = ws;
    wss.emit('connection', ws, request);
  });
});

server.listen(8080);
//create a ws server without a HTTP server
const wss = new WebSocket.WebSocketServer({noServer:true, clientTracking:true});

function heartbeat () {
  this.isAlive = true;
}

wss.on('connection',  function connection(ws, request, client){
  //notify all the participants that a new user is online
       for (const [key, value] of Object.entries(connections)) {
          if (key !== ws.m2f4_id ) {
            //making async function
            
       
                 value.send(JSON.stringify({opc: STAT_MSG, usr: ws.m2f4_id, online:true})); 
         
          
            
          }
       }
  //a new wssw connection established. Returns a socket 
    ws.isAlive = true;
    ws.on('pong', ()=>{
      ws.isAlive=true;
      console.log(`Pong:${new Date().toLocaleTimeString()}`)
    });

     ws.on('message', function message(data) {
      processClientMessage(data.toString('utf-8'), client_messages, wss, ws)
      /*console.log('received:', data.toString('utf-8'));
      console.log(ws.m2f4_id);*/
    });

    ws.on('close', async (a)=>{
      //remove a connection from the pool:
      delete connections[ws.m2f4_id];
      //notify all the users 
      //notify all the participants
       for ([key, value] of Object.entries(connections)) {
         new Promise((resolve, reject) => {
              value.send(JSON.stringify({opc: STAT_MSG, usr: ws.m2f4_id, online:false}), null, (e)=>{
                if (e) {
                  reject(e) 
               }
                resolve(e) });
         });
         
       }

    })
    //..
})
/****   {opc, msg, usr, [online] } - means o p c o d e , m e s s a g e   u s e r ****/
let processClientMessage = async (incomingMsg, storage, wss_x, sock ) => {
  let rawMsg = JSON.parse(incomingMsg);
  switch (rawMsg.opc) {
    case CLIENT_MSG:
      //store 
    storage.push({usr: rawMsg.usr,  msg: rawMsg.msg});
      //echo to all the clients
      let outgoingMsg = JSON.stringify({opc: SERVER_MSG, msg: rawMsg.msg, usr: rawMsg.usr, online: true});

     
   wss_x.clients.forEach(async (ws)=>{
    await new Promise((resolve, reject) => {
         ws.send(outgoingMsg, null,(e)=>{
            if(e){
              reject(e);
              return;
            } 
            resolve()
           });
        });
    
    })
        break;
    case ECHO:
      sock.send(JSON.stringify({opc:ECHO}));
        break;
    case ALL_THE_CHAT:
    //an array for the response
       let resp_messages = [];
       storage.forEach((msgObj)=>{
         //is a user online?
         if (connections[msgObj.usr]) {
          msgObj.online = true;
         } else {
          msgObj.online = false;
         }
         //push to the response
         resp_messages.push(msgObj);

       }) 
       
         
        //send to the client
       sock.send(JSON.stringify({msg:resp_messages, opc:ALL_THE_CHAT}))
        
         
        break;
    default:
  }
}

//ping-pong WS callback
const interval = setInterval(async function ping() {

  
  wss.clients.forEach(async function each(ws) {
    if (ws.isAlive === false) {
       //delete a socket from an array
        delete connections[ws.m2f4_id];
        console.log('The ws connection has been closed:No response :-(')
        //notify all the participants
       for ( [key, value] of Object.entries( connections)) {
          await new Promise((resolve, reject) => {
              value.send({opc: STAT_MSG, usr: ws.m2f4_id, online:false}, null, (e)=>{
                if(e){
                  reject(e)
                  return;
                }
                resolve();
              })
          });
       }
        return ws.terminate();
    } else {
    
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 5000);

wss.on('close', function close() {
  clearInterval(interval);
});






app.use(express.urlencoded({extended:true}));
///start point of the app
app.get('/', (req, res) => {
    //checking a user 
    if (!req.cookies.usr_name) {
        res.redirect('/login');
        return;
    } 
    if (names.has(req.cookies.usr_name)) {
        //user log in successfully!
        let readable = fs.createReadStream('./public/index.html',{highWaterMark:32000});
         res.contentType('text/html');
        readable.pipe(res);
    } else{
        res.redirect('/login');
    }
    console.log(req.cookies);

});

app.get("/login",(req,res)=>{
   let readable = fs.createReadStream('./public/auth.html',{highWaterMark:32000});
   res.contentType('text/html');
   readable.pipe(res);
})

app.post('/enter',(req,res)=>{
    console.log(req.body)
    res.cookie("usr_name",req.body.usr_name);
    res.redirect('/');
})

app.use(express.static('public'));

app.listen(80, () => {
    console.log(`listening on port 80`);
});

//Run app, then load http://localhost:port in a browser to see the output.