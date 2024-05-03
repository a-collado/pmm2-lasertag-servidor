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
          updateScore(m["score"]);
          break;
        default:
          break;
      }
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

function updateScore(score) {
  let team_1 = score[0];
  let team_2 = score[1];

  let team_1_scoreboard = document.getElementById("scoreboad_team_1");
  team_1.forEach((element) => {
    const newRow = team_1_scoreboard.insertRow();
    const cell1 = newRow.insertCell();
    const cell2 = newRow.insertCell();
    const cell3 = newRow.insertCell();
    cell1.innerHTML = element["name"];
    cell2.textContent = element["kills"];
    cell2.textContent = element["deaths"];
  });

  let team_2_scoreboard = document.getElementById("scoreboad_team_2");
  team_2.forEach((element) => {
    const newRow = team_2_scoreboard.insertRow();
    const cell1 = newRow.insertCell();
    const cell2 = newRow.insertCell();
    const cell3 = newRow.insertCell();
    cell1.innerHTML = element["name"];
    cell2.textContent = element["kills"];
    cell2.textContent = element["deaths"];
  });
}

function populateScore(element) {
  let tr = document.createElement("tr");
  let td_1 = document.createElement("td");
  td_1.innerText = element["name"];
  let td_2 = document.createElement("td");
  td_2.innerText = element["kills"];
  let td_3 = document.createElement("td");
  td_3.innerText = element["deaths"];
  tr.appendChild(td_1);
  tr.appendChild(td_2);
  tr.appendChild(td_3);

  return tr;
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
