function init() {
  wsConnect();
}

function wsConnect() {
  websocket = new WebSocket("ws://10.3.141.1:3000");
  websocket.onopen = function (evt) {
    //  onOpen(evt);
  };
  websocket.onclose = function (evt) {
    onClose(evt);
  };
  websocket.onmessage = function (evt) {
    onMessage(evt);
  };
  websocket.onerror = function (evt) {
    onError(evt);
  };
}

function onClose(evt) {
  document.getElementById("devices").innerHTML = "";

  setTimeout(function () {
    wsConnect();
  }, 2000);
}

function onMessage(evt) {
  let data = JSON.parse(evt.data);

  if (data["type"] === "devices") {
    updateDevices(data["content"]);
  }
}

function updateDevices(devices) {
  let list = document.getElementById("devices");
  list.innerHTML = "";
  devices.forEach((element) => {
    let li = document.createElement("li");
    li.innerText = element;
    list.appendChild(li);
  });
}

function onError(evt) {
  console.log("Error: " + evt);
}

function doSend(mensaje) {
  websocket.send(mensaje);
}

function selectTeams() {
  let message = {};
  message["type"] = "teamSelect";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
  location.reload();
}

function goToDevices() {
  let message = {};
  message["type"] = "devicesScreen";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
  location.reload();
}

window.addEventListener("load", init, false);
