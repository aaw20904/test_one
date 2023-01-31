 const CLIENT_MSG = 1|0;
 const SERVER_MSG = 2|0;
 const ALL_THE_CHAT = 3|0;
 const ECHO  = 4|0;
 const STAT_MSG = 5|0;
let connectionStatus = true;
  let mustClose = true;
  
window.onload = async function() {
  
  let broker = new MessageBroker( document.querySelector(".messageHolder"));

  /*broker.addMesssage({usr:"Kolya", msg:"Lorem ipsum dolor sit amet", online:true})  
  broker.addMesssage({usr:"Misha", msg:"Lorem ipsum dolor sit amet", online:true}) 
  broker.addMesssage({usr:"Vova",  msg:"Lorem ipsum dolor sit amet", online:true})  
  broker.addMesssage({usr:"Kolya", msg:"Lorem ipsum dolor sit amet", online:true})  
    
  broker.setOnline({usr:1,status:true});*/
   
 
 
  //connect a notificator
  let notificator = new Noficator();
 
//open WS
  let myWsBroker = new SocketMgr(`ws://${location.host}:8080`);

   //connect an input field
  let inpTerm = new InputInterface(parseCookie(document.cookie).usr_name, myWsBroker);
   document.querySelector(".input_terminal").appendChild(inpTerm.mainNode);

  try{
    await myWsBroker.connectToServer( broker, notificator);
    connectionStatus =true;
  }
  catch(e){
    notificator.notify(e);
    connectionStatus=false;
    return;
  }
 //require all the chat
  myWsBroker.requireAllMessages();

  //run connection check 
  window.setInterval(async()=>{
    if (!connectionStatus) {
      if (mustClose) {
        myWsBroker.closeConnectionBrutally();
        mustClose = false;
      }
      //when online - try to connect
      if (navigator.onLine) {
       try{
          await myWsBroker.connectToServer( broker, notificator);
            connectionStatus =true;
            mustClose = true;
            myWsBroker.requireAllMessages();
         }
         catch (e) {
            connectionStatus = false;
         }
      }
    } 
      connectionStatus = false;
     //if online - sending a request
      if (navigator.onLine) {
       
        myWsBroker.checkServerAvalability();
      }
      

    }, 10000);

}


class SocketMgr {
    constructor (address = "ws://localhost:8080") { 
      
       
      this.socket = null;
      this.address = address;
    }

async    connectToServer( msgBrokerInst, notificatorInst  ) {
await new Promise((resolve, reject) => {
        this.socket =  new WebSocket(this.address);
        let that = this;
        
            this.socket.onopen = (e)=> {
                 notificatorInst.notify('WS connected!');
                //that.socket.send("My name is John");
                resolve();
            };

        this.socket.onmessage = function(event) {
          let recived = event.data;
          let incomMsg = JSON.parse(recived);
          /****   {opc, msg, usr, [online]} - means o p c o d e , m e s s a g e   u s e r ****/
          switch(incomMsg.opc) {
            case SERVER_MSG:
              msgBrokerInst.addMesssage(incomMsg);
            break;
            case ALL_THE_CHAT:
              //clear all the chat
                 msgBrokerInst.clearAll();
              //iterates all the array and shows messages 
              incomMsg.msg.forEach((itemMsg)=>{
                msgBrokerInst.addMesssage(itemMsg);
              })
            break;
            case  STAT_MSG:
              msgBrokerInst.setOnline(incomMsg)
            break;
            case ECHO:
              //lear an echo timer
              connectionStatus = true;
            break;
            default:
          }
          
        };

        this.socket.onerror= function (e){
           notificatorInst.notify(e);
        }

        

        this.socket.onclose = function(event) {
          if (event.wasClean) {
             notificatorInst.notify(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
          } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
             notificatorInst.notify('[close] Connection died');
          }
        }

     });
    }

    sendMessageToServer (msg='Hey there!') {
    /****   {opc, msg, usr} - means  o p c o d e,  m e s s a g e,  u s e r  ****/
        let outgoingMessage = {
          opc:CLIENT_MSG,
          usr: parseCookie(document.cookie)['usr_name'],
          msg: msg
        }
      this.socket.send(JSON.stringify(outgoingMessage))
    }

    requireAllMessages () {
      let outgoingMessage = {
          opc: ALL_THE_CHAT,
          usr: parseCookie(document.cookie)['usr_name'],
        }
      this.socket.send(JSON.stringify(outgoingMessage))
    }

    checkServerAvalability(){
      this.socket.send(JSON.stringify({opc:ECHO}));
    }

    closeConnectionBrutally(){
      this.socket.close();
    }

}


class Noficator {
  constructor(){
    //get  a toast
    this.dom_elem =  document.querySelector(".notificator");
      // Create toast instance
    this.myToast = new bootstrap.Toast(this.dom_elem);
  }

    notify(msg="helloword", that=this){
      
       that.dom_elem.querySelector(".toast-body").innerText = msg;
         //show a toast
      that.myToast.show();
    }
}

class InputInterface {
    constructor (usrid="k", wsBrokerObj) {
        //instance of ws_broker
        this.wsBrokerObj = wsBrokerObj;
        this.usrid = usrid;
          //create main node
        let wrapper = document.createElement('div');
        wrapper.classList.add("p-2","d-flex","justify-content-start","align-items-start","flex-column","m-1");
          //an input
        let textfield = document.createElement("textarea");
        textfield.rows = 2;
        textfield.cols = 32;
        textfield.maxLength = 128;
        textfield.classList.add("m-1","tr_text","rounded");
         //a button
         let btn = document.createElement("button");
         btn.classList.add("btn","btn-primary","m-1","p-1");
         btn.innerText = "Send..";
         //connect a callback
         btn.addEventListener("click",()=>{
            let typedText = textfield.value;
            this.wsBrokerObj.sendMessageToServer(typedText)
         })

         wrapper.appendChild(textfield);
         wrapper.appendChild(btn);
         this.mainNode = wrapper;
         
    }


}

class MessageBroker {
    constructor(parentNode){
        this.parentNode = parentNode;
        
    }

    clearAll(){
        var childElements = this.parentNode;
        var delChild = childElements.lastChild;
       while (delChild) {
           childElements.removeChild(delChild);
           delChild = childElements.lastChild;
        }

    }

    addMesssage ( info={msg:"Lorem ipsum dolor", usr:"someOne",  online:true}) {
       let box = this._createBox(info.usr);
       let textFields = this._createTextFields(info);
       //apply children to the parent
       box.appendChild(textFields.usr);
       box.appendChild(textFields.msg)
       this.parentNode.appendChild(box);
       //scroll on the bottom
       window.scrollBy(0, window.innerHeight);
    }

       //making a box
    _createBox(id=123){
         let box= document.createElement('div');
         box.setAttribute("data-usrid",id);
         box.classList.add("msg_container","my-1","p-1");
         return box;
    }

    //create fields: name and the text message
    _createTextFields(info={msg:"someText", usr:'someone', online:true}) {
        //first strinf= name + indicator
        let firstString = document.createElement('div');
          firstString.classList.add('d-flex','flex-row','justify-content-between','align-items-center',"w-100","p-1");
        let name = document.createElement('div');
          name.classList.add("h5","text-success","fw-bold","p-1","name");
          name.innerText=info.usr;
         
        let indicator = document.createElement("span");
          indicator.classList.add("dot_online");
          info.online ? indicator.classList.add("online_net") : indicator.classList.add("offline_net");
          //append cfhildren
          firstString.appendChild(name);
          firstString.appendChild(indicator)

        //a message
        let message = document.createElement('div');
        message.classList.add("h6","p-1","msg");
        message.innerText = info.msg;
        return {msg:message, usr: firstString};
    }

     setOnline (inp={usrid:1,  online:true}) {
        let elems =this.parentNode.querySelectorAll(`[data-usrid="${inp.usr}"]`);
        if (!elems) {
            throw new Error('Wrong usrid!');
            return;
        }
        elems = Array.prototype.slice.call(elems);
        if (inp.online) {
            elems.forEach(data=>{
                
                data.querySelector(".dot_online").classList.remove("offline_net")
                data.querySelector(".dot_online").classList.add("online_net");
            })
               
        } else {
              elems.forEach(data=>{
                data.querySelector(".dot_online").classList.remove("online_net")
                data.querySelector(".dot_online").classList.add("offline_net");
              })
        }
       
     }


}

function parseCookie(c=document.cookie) {
  let result = {};
  let substr = c.split(';');
  substr = substr.map((q)=>{
    let v1 = q.split('=');
    result[v1[0]] = v1[1];
  });
  return result;

}

   
