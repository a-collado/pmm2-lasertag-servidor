function init() {
  wsConnect();
}

function wsConnect() {
  websocket = new WebSocket("ws://10.3.141.1:3000");
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
  //document.getElementById("devices_connecting").innerHTML = "";

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

function updateDevices(devices) {
  let list = document.getElementById("devices_connecting");
  list.innerHTML = "";
  devices.forEach((element) => {
    let li = document.createElement("li");
    li.innerText = element;
    list.appendChild(li);
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
      <input type="radio" name="team-${element}" value="team1" id="team1-${element}" checked>
      <label for="team1-${element}">Team 1</label>
      <input type="radio" name="team-${element}" value="team2" id="team2-${element}">
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

window.addEventListener("load", init, false);
