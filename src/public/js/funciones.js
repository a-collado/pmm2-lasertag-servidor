const wsIPDiv = document.getElementById("ws-ip");
const ws_ip = wsIPDiv.dataset.myString;

function init() {
  wsConnect();
}

function wsConnect() {
  websocket = new WebSocket(ws_ip);
  websocket.onopen = function (evt) {
    fetchState();
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
  setTimeout(function () {
    wsConnect();
  }, 2000);
}

function onMessage(evt) {
  let data = JSON.parse(evt.data);
  switch (data["type"]) {
    case "devices":
      updateDevices(data["content"]);
      break;
    case "reload":
      location.reload();
      break;
    case "redirect":
      let m = data["content"];
      switch (m["destination"]) {
        case "teamSelect":
          setTeamSelect(m["devices"]);
          break;
        case "devicesScreen":
          updateDevices(m["devices"]);
          break;
        case "scoreboard":
          createScore(m["score"]);
          break;
        case "settings":
          break;
        default:
          break;
      }
      break;
    case "scoreboard":
      let score = data["content"];
      updateScore(score);
      break;
    default:
      break;
  }
}

function saveSettings() {
  let selectedGameMode = document.querySelector(
    'input[name="gameMode"]:checked',
  ).value;
  let selectedTime = document.querySelector('input[name="time"]:checked').value;
  let selectedLifes = document.querySelector(
    'input[name="life"]:checked',
  ).value;

  let time = 10;
  switch (selectedTime) {
    case "time_5":
      time = 5;
      break;
    case "time_10":
      time = 10;
      break;
    case "time_15":
      time = 15;
      break;
    default:
      time = 10;
      break;
  }

  let lifes = 8;
  switch (selectedLifes) {
    case "lifes_3":
      lifes = 5;
      break;
    case "lifes_8":
      lifes = 10;
      break;
    case "lifes_13":
      lifes = 15;
      break;
    default:
      lifes = 10;
      break;
  }
  let settings = {
    mode: selectedGameMode,
    time: time,
    lives: lifes,
  };
  let message = {};
  message["type"] = "settings";
  message["content"] = settings;
  message["sender"] = "client";
  doSend(JSON.stringify(message));
  goToScoreboard();
}

function updateDevices(devices) {
  let list = document.getElementById("devices_connecting");
  list.innerHTML = "";
  devices.forEach((element) => {
    let li = document.createElement("li");
    li.innerText = element;
    list.appendChild(li);
    li.classList.add("list-group-item");
  });
}

function setTeamSelect(devices) {
  let list = document.getElementById("devices_teams");

  list.innerHTML = "";

  devices.forEach((element) => {
    let li = document.createElement("li");

    li.innerHTML = `
    <span>${element}</span>
    <div class="team-selector">
      <input type="radio" name="team-${element}" class="form-check-input" value="team1" id="team1-${element}" checked>
      <label for="team1-${element}">Team 1</label>
      <input type="radio" name="team-${element}" class="form-check-input" value="team2" id="team2-${element}">
      <label for="team2-${element}">Team 2</label>
    </div>
    `;

    list.appendChild(li);
  });
}

function createScore(score) {
  let team_1 = score[0];
  let team_2 = score[1];

  let team_1_scoreboard = document.getElementById("scoreboad_team_1");
  populateScore(team_1_scoreboard, team_1);

  let team_2_scoreboard = document.getElementById("scoreboad_team_2");
  populateScore(team_2_scoreboard, team_2);
}

function updateScore(score) {
  let team_1 = score[0];
  let team_2 = score[1];

  let team_1_scoreboard = document.getElementById("scoreboad_team_1");
  replaceScore(team_1_scoreboard, team_1);

  let team_2_scoreboard = document.getElementById("scoreboad_team_2");
  replaceScore(team_2_scoreboard, team_2);
}

function replaceScore(scoreboard, score) {
  for (let index = 0; index < score.length; index++) {
    const newRow = scoreboard.rows[index + 1];
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    const cell3 = document.createElement("td");
    cell1.textContent = score[index]["name"];
    cell2.textContent = score[index]["kills"];
    cell3.textContent = score[index]["deaths"];
    newRow.replaceChild(cell1, newRow.cells[0]);
    newRow.replaceChild(cell2, newRow.cells[1]);
    newRow.replaceChild(cell3, newRow.cells[2]);
  }
}

function populateScore(scoreboard, score) {
  score.forEach((element) => {
    const newRow = scoreboard.insertRow();
    const cell1 = newRow.insertCell();
    const cell2 = newRow.insertCell();
    const cell3 = newRow.insertCell();
    cell1.innerHTML = element["name"];
    cell2.textContent = element["kills"];
    cell3.textContent = element["deaths"];
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
  message["type"] = "redirect";
  message["content"] = "teamSelect";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
}

function goToDevices() {
  let message = {};
  message["type"] = "redirect";
  message["content"] = "devicesScreen";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
}

function fetchState() {
  let message = {};
  message["type"] = "fetch";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
}

function goToScoreboard() {
  let message = {};
  message["type"] = "redirect";
  message["content"] = "scoreboard";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
}

function goToSettings() {
  setTeams();
  let message = {};
  message["type"] = "redirect";
  message["content"] = "settings";
  message["sender"] = "client";
  doSend(JSON.stringify(message));
}

function setTeams() {
  let listItems = document.querySelectorAll(
    "#devices_teams input[id^='team1-']",
  );
  let teams = [];

  listItems.forEach((li) => {
    let player = {};
    player["name"] = li.name.split("-")[1].trim();
    if (li.checked) {
      player["team"] = 1;
    } else {
      player["team"] = 2;
    }
    teams.push(player);
  });

  let message = {};

  message["type"] = "teams";
  message["sender"] = "client";
  message["content"] = teams;

  doSend(JSON.stringify(message));
  goToScoreboard();
}

function setTeamsToScoreboard() {
  setTeams();
  goToScoreboard();
}

window.addEventListener("load", init, false);
