require("dotenv").config();
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

const STATES = {
  CONNECTING: "connecting",
  FFA: "freeforall",
  TEAMS: "teams",
  SCOREBOARD: "scoreboard",
  SCOREBOARD_FFA: "scoreboard_ffa",
  SETTINGS: "settings",
  WAIT: "wait",
  END: "end",
};

const PERIODS = [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280];

// Tiempo en ms que entre comprobaciones de conexion
const RECONNECTION_TIME = 10000;

var connectedDevices = [];
var devices = [];
var requestLoop;
var current_state = STATES.CONNECTING;
var scoreboard = [];
var rules_default = {
  mode: "time",
  time: 10,
  lives: 10,
};
var rules = rules_default;
var teams = false;
var lifes = false;
var ws_ip = "ws://" + process.env.IP + ":" + process.env.PORT;
var current_time = 0;

if (current_state === STATES.CONNECTING) {
  setRequestLoop();
} else {
  clearInterval(requestLoop);
}

app.set("port", process.env.PORT);
app.use(cors());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "./public/")));
app.set("views", path.join(__dirname, "./public/views/"));

app.get("/", (req, res) => {
  const data = {
    current_state: current_state,
    ws_ip: ws_ip,
    teams: teams,
    lifes: lifes,
  };
  res.render("index", data);
});

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connection.on("message", (message) => {
    console.log("Mensaje recibido: " + message.utf8Data);
    let m = JSON.parse(message.utf8Data);

    // Reenviamos los mensajes enviados por el servidor al cliente.
    if (m["sender"] === "server") {
      wsServer.connections.forEach(function each(client) {
        if (client !== connection) {
          client.sendUTF(message.utf8Data);
        }
      });
    } else {
      if (m["type"] === "redirect") {
        switch (m["content"]) {
          case "teamSelect":
            clearInterval(requestLoop);
            current_state = STATES.TEAMS;
            teams = true;
            break;
          case "devicesScreen":
            setRequestLoop();
            current_state = STATES.CONNECTING;
            break;
          case "scoreboard":
            setPeriods();
            setTimeLimit();
            sendStartGame();
            if (teams) {
              current_state = STATES.SCOREBOARD;
            } else {
              current_state = STATES.SCOREBOARD_FFA;
            }
            break;
          case "settings":
            current_state = STATES.SETTINGS;
            break;
          case "ffa":
            clearInterval(requestLoop);
            current_state = STATES.FFA;
            teams = false;
            break;
          default:
            break;
        }
        reloadClient();
      }
      if (m["type"] === "fetch") {
        switch (current_state) {
          case STATES.TEAMS:
            redirectClient("teamSelect");
            break;
          case STATES.CONNECTING:
            redirectClient("devicesScreen");
            break;
          case STATES.SCOREBOARD:
            let message = {};
            message["type"] = "redirect";
            message["sender"] = "server";
            let content = {};
            content["destination"] = "scoreboard";
            content["mode"] = rules.mode;
            content["score"] = scoreboard;
            content["lives"] = rules.lives;
            content["time"] = rules.time;
            content["current_time"] = current_time;
            message["content"] = content;
            ws.send(JSON.stringify(message));
            break;
          case STATES.SCOREBOARD_FFA:
            let message_ffa = {};
            message_ffa["type"] = "redirect";
            message_ffa["sender"] = "server";
            let content_ffa = {};
            if (!teams) {
              content_ffa["destination"] = "scoreboard_ffa";
            }
            content_ffa["mode"] = rules.mode;
            content_ffa["lives"] = rules.lives;
            content_ffa["time"] = rules.time;
            content_ffa["current_time"] = current_time;
            content_ffa["score"] = scoreboard;
            message_ffa["content"] = content_ffa;
            ws.send(JSON.stringify(message_ffa));
            break;
          case STATES.FFA:
            redirectClient("freeforall");
            scoreboard = [];
            devices.forEach((element) => {
              sendTeam(element, "3");
              scoreboard.push({ name: element, kills: 0, deaths: 0 });
            });
            console.log(scoreboard);
            break;
          case STATES.END:
            let message_end = {};
            message_end["sender"] = "server";
            message_end["type"] = "end";
            if (teams) {
              let content_ffa = {};
              content_ffa["score"] = scoreboard;
              content_ffa["mode"] = "team";
              message_end["content"] = content_ffa;
            } else {
              let content_ffa = {};
              content_ffa["score"] = scoreboard;
              content_ffa["mode"] = "ffa";
              message_end["content"] = content_ffa;
            }
            ws.send(JSON.stringify(message_end));
          default:
            break;
        }
      }
      if (m["type"] === "teams") {
        scoreboard = [];
        let team_1 = [];
        let team_2 = [];
        console.log(m["content"]);
        m["content"].forEach((element) => {
          let p = { name: element["name"], kills: 0, deaths: 0 };
          if (element["team"] === 1) {
            sendTeam(p["name"], "1");
            team_1.push(p);
          } else {
            sendTeam(p["name"], "2");
            team_2.push(p);
          }
        });
        scoreboard.push(team_1);
        scoreboard.push(team_2);
      }
      if (m["type"] === "settings") {
        rules = m["content"];
        if (rules["mode"] === "lifes") {
          lifes = true;
        } else {
          lifes = false;
        }
      }
    }
  });
  connection.on("close", (reasonCode, description) => {
    console.log("El cliente se desconecto");
  });
});

var endTime;

function setTimeLimit() {
  // WARN: AQUI!!!!!
  let interval = /*rules.time*/ 0.1 * 60 * 1000;
  //let interval = rules.time * 60 * 1000;
  //if (rules.mode === "time") {
  endTime = setInterval(endGameTimeLimit, interval);
  setCurrentTime(rules.time);
  //}
}

// TODO: No esta contando bien el tiempo o se desincroniza con la vista al hacer F5.
function setCurrentTime(minutes) {
  const totalSeconds = minutes * 60;

  current_time = totalSeconds;

  const intervalId = setInterval(() => {
    current_time--;

    if (current_time < 0) {
      clearInterval(intervalId);
    }
  }, 1000);
}

function endGameTimeLimit() {
  let message = {};
  if (teams) {
    message["type"] = "end_team";
  } else {
    message["type"] = "end_ffa";
  }
  message["sender"] = "server";
  message["content"] = scoreboard;
  ws.send(JSON.stringify(message));
  clearInterval(endTime);
  current_state = STATES.END;
  reloadClient();
  sendEndGame();
}

function reloadClient() {
  let message_r = {};
  message_r["type"] = "reload";
  message_r["sender"] = "server";
  ws.send(JSON.stringify(message_r));
}

function redirectClient(destination) {
  let message = {};
  message["type"] = "redirect";
  message["sender"] = "server";
  let content = {};
  content["destination"] = destination;
  content["devices"] = devices;
  message["content"] = content;
  ws.send(JSON.stringify(message));
}

function setConnectedDevices() {
  let message = {};
  message["type"] = "devices";
  message["sender"] = "server";
  message["content"] = connectedDevices;
  ws.send(JSON.stringify(message));
  devices = connectedDevices;
  connectedDevices = [];
}

function updateScoreboard() {
  let message = {};
  message["type"] = "scoreboard";
  message["sender"] = "server";
  message["content"] = scoreboard;
  ws.send(JSON.stringify(message));
}

function updateScoreboardFFA() {
  let message = {};
  message["type"] = "scoreboard_ffa";
  message["sender"] = "server";
  message["content"] = scoreboard;
  ws.send(JSON.stringify(message));
}

// Aqui empieza la parte de MQTT

const ws = new WebSocket(ws_ip);
const protocol = "mqtt";
const host = "localhost";
const port = "1883";
const clientId = "mqtt_" + Math.random().toString(16).slice(3);

const connectUrl = protocol + "://" + host + ":" + port;

const connectTopic = "Connections/Connect";
const reconnectTopic = "Connections/Reconnect";
const periodTopic = "Connections/Period/";
const hitTopic = "Game/Hit";
const killTopic = "Game/Kill/";
const startTopic = "Game/Start";
const endTopic = "Game/End";
const teamTopic = "Connections/Team/";

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

  mqttClient.subscribe([hitTopic], () => {
    console.log("Subscribe to topic " + hitTopic);
  });
});

mqttClient.on("message", (topic, payload) => {
  console.log("Mensaje MQTT Recibido:", topic, payload.toString());
  switch (topic) {
    case reconnectTopic:
      connectedDevices.push(payload.toString());
      break;
    case hitTopic:
      if (current_state == STATES.SCOREBOARD) {
        registerHitTeams(JSON.parse(payload.toString()));
        // TODO: Aqui habra que poner que se quiten las vidas
      } else if (current_state == STATES.SCOREBOARD_FFA) {
        registerHitFFA(JSON.parse(payload.toString()));
      }
      if (
        current_state === STATES.SCOREBOARD ||
        current_state === STATES.SCOREBOARD_FFA
      ) {
        let pistola = JSON.parse(payload.toString())["pistola"];
        let topic_k = killTopic.concat(pistola);
        mqttClient.publish(topic_k, "kill");
      }
      break;
    default:
      break;
  }
});

function setRequestLoop() {
  console.log("Starting device search");
  requestLoop = setInterval(checkConnectionDevices, RECONNECTION_TIME);
}

function checkConnectionDevices() {
  mqttClient.publish(connectTopic, "Connect");
  setTimeout(setConnectedDevices, RECONNECTION_TIME / 2);
}

function findClosestPeriodIndex(number) {
  let closestIndex = 0;
  let smallestDifference = Math.abs(number - PERIODS[0]);

  for (let i = 1; i < PERIODS.length; i++) {
    let currentDifference = Math.abs(number - PERIODS[i]);
    if (currentDifference < smallestDifference) {
      smallestDifference = currentDifference;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function registerHitTeams(hitInformation) {
  if (scoreboard.length === 0) {
    return;
  }
  let from = hitInformation["chaleco"];
  let to = hitInformation["pistola"];

  let fromP = scoreboard[0].findIndex((player) => player.name === from);
  let fromT = 0;
  if (fromP === -1) {
    fromP = scoreboard[1].findIndex((player) => player.name === from);
    fromT = 1;
  }

  if (to == 0) {
    return;
  }

  let index = findClosestPeriodIndex(to);
  if (index < devices) {
    return;
  }
  to = devices[index];

  let toP = scoreboard[0].findIndex((player) => player.name === to);
  let toT = 0;
  if (toP === -1) {
    toP = scoreboard[1].findIndex((player) => player.name === to);
    toT = 1;
  }

  if (fromT !== toT) {
    scoreboard[fromT][fromP].deaths += 1;
    scoreboard[toT][toP].kills += 1;
    updateScoreboard();
  }
}

function registerHitFFA(hitInformation) {
  if (scoreboard.length === 0) {
    return;
  }
  let from = hitInformation["chaleco"];
  let to = hitInformation["pistola"];

  if (to == 0) {
    return;
  }

  let index = findClosestPeriodIndex(to);
  if (index < devices) {
    return;
  }
  to = devices[index];

  let fromP = scoreboard.findIndex((player) => player.name === from);
  let toP = scoreboard.findIndex((player) => player.name === to);

  if (fromP != null && toP != null && fromP !== toP) {
    scoreboard[fromP].deaths += 1;
    scoreboard[toP].kills += 1;
    updateScoreboardFFA();
  }
}

function setPeriods() {
  for (let index = 0; index < devices.length; index++) {
    let topic = periodTopic.concat(devices[index]);
    mqttClient.publish(topic, PERIODS[index].toString());
  }
}

function sendStartGame() {
  mqttClient.publish(startTopic, "start");
}

function sendEndGame() {
  mqttClient.publish(endTopic, "end");
}

function sendTeam(player, team) {
  let t = teamTopic.concat(player);
  mqttClient.publish(t, team);
}
// Iniciamos el servidor en el puerto establecido por la variable port (3000)
server.listen(app.get("port"), () => {
  console.log("Servidor iniciado en el puerto: " + app.get("port"));
});
