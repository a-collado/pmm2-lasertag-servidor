// importamos las librerías requeridas
const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();
const server = require("http").Server(app);
const mqtt = require("mqtt");
const WebSocketServer = require("websocket").server;
const WebSocket = require("ws");

const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

app.set("port", 3000);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "./public")));

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connection.on("message", (message) => {
    console.log("Mensaje recibido: " + message.utf8Data);
    wsServer.connections.forEach(function each(client) {
      //TODO Aqui se podria hacer que en vez de enviar el mensaje a secas,
      //se en envie un JSON, en el que haya un type o algo asi que indique
      //que tipo de mensaje es.
      client.sendUTF(message.utf8Data);
    });
  });
  connection.on("close", (reasonCode, description) => {
    console.log("El cliente se desconecto");
  });
});

// Aqui empieza la parte de MQTT

const ws = new WebSocket("ws://10.3.141.1:3000");
const protocol = "mqtt";
const host = "localhost";
const port = "1883";
const clientId = "mqtt_" + Math.random().toString(16).slice(3);

const connectUrl = protocol + "://" + host + ":" + port;

const connectTopic = "Connections/Connect";
const reconnectTopic = "Connections/Reconnect";

// Tiempo en ms que entre comprobaciones de conexion
const RECONNECTION_TIME = 10000;

const mqttClient = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 400,
  reconnectPeriod: 1000,
});

mqttClient.on("connect", () => {
  console.log("Connected to mqtt");

  mqttClient.subscribe([reconnectTopic], () => {
    console.log("Subscribe to topic " + reconnectTopic);
  });
});

var connectedDevices = [];

mqttClient.on("message", (topic, payload) => {
  console.log("Mensaje MQTT Recibido:", topic, payload.toString());
  connectedDevices.push(payload.toString());
  //ws.send(payload.toString());
});

var requestLoop = setInterval(function () {
  mqttClient.publish(connectTopic, "Connect");
  setTimeout(setConnectedDevices, RECONNECTION_TIME / 2);
}, RECONNECTION_TIME);

function setConnectedDevices() {
  ws.send(JSON.stringify(connectedDevices));
  connectedDevices = [];
}

// Iniciamos el servidor en el puerto establecido por la variable port (3000)
server.listen(app.get("port"), () => {
  console.log("Servidor iniciado en el puerto: " + app.get("port"));
});
