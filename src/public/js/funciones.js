const wsIPDiv = document.getElementById("ws-ip");
const ws_ip = wsIPDiv.dataset.myString;
const avatars = [
  "bear.png",
  "cat.png",
  "chicken.png",
  "dog.png",
  "duck.png",
  "giraffe.png",
  "gorilla.png",
  "hippo.png",
  "meerkat.png",
  "panda.png",
  "puffer-fish.png",
  "rabbit.png"
];
let avatarIndex = 0;


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
          setCountDown(m["current_time"]);
          break;
        case "scoreboard_ffa":
          createScoreFFA(m["score"]);
          setCountDown(m["current_time"]);
          break;
        case "freeforall":
          setFFA(m["devices"]);
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
    case "scoreboard_ffa":
      let score_ffa = data["content"];
      updateScoreFFA(score_ffa);
      break;
    case "end":
      let score_end = data["content"];
      if (score_end["mode"] === "team") {
        createScore(score_end["score"]);
      } else {
        createScoreFFA(score_end["score"]);
      }
      break;
    default:
      break;
  }
}

// TODO: No esta contando bien el tiempo:
function setCountDown(current_time) {
  let remainingSeconds = current_time;

  const intervalId = setInterval(() => {
    const minutesRemaining = Math.floor(remainingSeconds / 60);
    const secondsRemaining = remainingSeconds % 60;

    const timeString = `${minutesRemaining.toString().padStart(2, "0")}:${secondsRemaining.toString().padStart(2, "0")}`;

    let timer = document.getElementById("tiempo-restante");
    timer.innerText = "Tiempo restante: " + timeString;

    remainingSeconds--;

    if (remainingSeconds < 0) {
      clearInterval(intervalId);
    }
  }, 1000);
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

  let goToTeamsScoreboardButton = document.getElementById("go-to-select-teams");
  let goConfigureTeamsScoreboardButton =
    document.getElementById("go-to-free-for-all");
  list.innerHTML = "";
  devices.forEach((element) => {
    let div = document.createElement("div");
    div.classList.add("player-container");
    
    let avatar = document.createElement("img");
    avatar.src = `imagenes/avatar/${avatars[avatarIndex]}`;
    avatar.alt = "Avatar";
    avatar.classList.add("avatar");

    let li = document.createElement("li");
    li.innerText = element;
    li.classList.add("list-group-item");

    div.appendChild(avatar);
    div.appendChild(li);
    container.appendChild(div);
  
      // Incrementa el índice del avatar y vuelve a 0 si llega al final del array
      avatarIndex++;
      if (avatarIndex >= avatars.length) {
        avatarIndex = 0;
      }
  });

  if (devices.length > 1) {
    goToTeamsScoreboardButton.disabled = false;
    goConfigureTeamsScoreboardButton.disabled = false;
  } else {
    goToTeamsScoreboardButton.disabled = true;
    goConfigureTeamsScoreboardButton.disabled = true;
  }
}

function setTeamSelect(devices) {
  let list = document.getElementById("devices_teams");

  list.innerHTML = "";

  devices.forEach((element) => {
    let div = document.createElement("div");
    div.classList.add("player-container_teams");
    
    let avatar = document.createElement("img");
    avatar.src = `imagenes/avatar/${avatars[avatarIndex]}`;
    avatar.alt = "Avatar";
    avatar.classList.add("avatar_teams");

    let li = document.createElement("li");
    li.classList.add("list-group-item");

    div.appendChild(avatar);
    container.appendChild(div);
  
      // Incrementa el índice del avatar y vuelve a 0 si llega al final del array
      avatarIndex++;
      if (avatarIndex >= avatars.length) {
        avatarIndex = 0;
      }

    li.innerHTML = `
    <span>${element}</span>
    <div class="team-selector">
      <input type="radio" name="team-${element}" class="btn_blue" value="team1" id="team1-${element}" checked>
      <label for="team1-${element}">Equipo Azul</label>
      <input type="radio" name="team-${element}" class="btn_orange" value="team2" id="team2-${element}">
      <label for="team2-${element}">Equipo Naranja</label>
    </div>
    `;

    list.appendChild(li);
  });

  let teamList1 = document.querySelectorAll(
    "#devices_teams input[id^='team1-']",
  );

  let teamList2 = document.querySelectorAll(
    "#devices_teams input[id^='team2-']",
  );

  teamList1.forEach((radio) => {
    radio.addEventListener("change", () => {
      checkTeams();
    });
  });

  teamList2.forEach((radio) => {
    radio.addEventListener("change", () => {
      checkTeams();
    });
  });
}

function checkTeams() {
  let teamList1 = document.querySelectorAll(
    "#devices_teams input[id^='team1-']",
  );

  let teamList2 = document.querySelectorAll(
    "#devices_teams input[id^='team2-']",
  );

  const goToTeamsScoreboardButton = document.getElementById(
    "go-to-teams-scoreboard",
  );
  const goConfigureTeamsScoreboardButton = document.getElementById(
    "go-to-teams-settings",
  );

  let t1 = false;
  let t2 = false;

  teamList1.forEach((li) => {
    if (li.checked) {
      t1 = true;
    }
  });

  teamList2.forEach((li) => {
    if (li.checked) {
      t2 = true;
    }
  });

  if (t1 && t2) {
    goToTeamsScoreboardButton.disabled = false;
    goConfigureTeamsScoreboardButton.disabled = false;
  } else {
    goToTeamsScoreboardButton.disabled = true;
    goConfigureTeamsScoreboardButton.disabled = true;
  }
}

function setFFA(devices) {
  let list = document.getElementById("devices_ffa");

  list.innerHTML = "";

  devices.forEach((element) => {
    let div = document.createElement("div");
    div.classList.add("player-container");
    
    let avatar = document.createElement("img");
    avatar.src = `imagenes/avatar/${avatars[avatarIndex]}`;
    avatar.alt = "Avatar";
    avatar.classList.add("avatar");

    let li = document.createElement("li");
    li.innerHTML = `
    <span>${element}</span>
    `;
    li.classList.add("list-group-item");

    div.appendChild(avatar);
    div.appendChild(li);
    container.appendChild(div);
  
      // Incrementa el índice del avatar y vuelve a 0 si llega al final del array
      avatarIndex++;
      if (avatarIndex >= avatars.length) {
        avatarIndex = 0;
      }
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

function createScoreFFA(score) {
  let scoreboard = document.getElementById("scoreboad_ffa");
  populateScore(scoreboard, score);
}

function updateScore(score) {
  let team_1 = score[0];
  let team_2 = score[1];

  let team_1_scoreboard = document.getElementById("scoreboad_team_1");
  replaceScore(team_1_scoreboard, team_1);

  let team_2_scoreboard = document.getElementById("scoreboad_team_2");
  replaceScore(team_2_scoreboard, team_2);
}

function updateScoreFFA(score) {
  let scoreboard = document.getElementById("scoreboad_ffa");
  replaceScore(scoreboard, score);
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

function selectFFA() {
  let message = {};
  message["type"] = "redirect";
  message["content"] = "ffa";
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

function goToSettingsFFA() {
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
}

function setTeamsToScoreboard() {
  setTeams();
  goToScoreboard();
}

window.addEventListener("load", init, false);
