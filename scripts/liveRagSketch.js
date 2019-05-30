var currentPitch;
var live = false;
// var refBaseNote = 164.8;
var refBaseNote = 164.8;

var extraSpaceH = 45;
var extraSpaceW = 0;
var mainSpaceH = 600;
var mainSpaceW = 800;
var margin = 10;
var easing = 0.5;
var backColor;
var backColorTrans;
var frontColor;
var shadeColor;

var ragInfo;
var recordingsList;
var pitchSpace;
var svaraList = [];
var svaraRadius1 = 20;
var svaraRadius2 = 17;
var svaraLine = 20;
var minHz;
var maxHz;
var pitchTrack;
var trackFile;
var melodicLine = [];
var track;
var trackDuration;
var ragName;

var ragMenu;
var recordingsMenu;
var buttonPlay;
var recordButton;
var stopStatus = false;
var micButtonStatus = true;

var cursorTop;
var cursorBottom;
var cursorY = 0;
var navBoxH = 25;
var navCursor;
var navBox;
var navCursorW = 4;
var melCursorX;
var melCursorRadius = 8;
var clock;

var loaded = false;
var paused = true;
var currentTime = 0;
var jump;
// getUserMedia() reference var
var localStream;

// web audio api
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function preload() {
  ragInfo = loadJSON("files/ragInfo.json");
  recordingsList = loadJSON("files/recordingsList.json");
}

function setup () {
  var canvas = createCanvas(extraSpaceW+mainSpaceW, extraSpaceH+mainSpaceH);
  var div = select("#sketch-holder");
  div.style("width: " + width + "px; margin: 10px auto; position: relative;");
  canvas.parent("sketch-holder");

  background(254, 249, 231);

  ellipseMode(RADIUS);
  angleMode(DEGREES);
  imageMode(CENTER);
  textFont("Laila");
  strokeJoin(ROUND);
  strokeCap(ROUND);

  backColor = color(240, 128, 128);
  backColorTrans = color(120, 0, 0, 100);
  frontColor = color(120, 0, 0);
  shadeColor = color(120, 0, 0);

  buttonPlay = createButton("Load")
    .size(80, 25)
    .mouseClicked(player)
    .attribute("hidden", "true")
    .parent("sketch-holder");
  buttonPlay.position(extraSpaceW + margin, height - buttonPlay.height - margin);

  navBox = new CreateNavigationBox();
  navCursor = new CreateNavCursor();

  cursorTop = extraSpaceH + margin*3 + 50;
  cursorBottom = navBox.y1 - margin*2;
  melCursorX = width - (svaraRadius1 * 4) - svaraLine - margin;
  svaraLineX1 = extraSpaceW + (svaraRadius1 * 4) + svaraLine + margin;

  ragMenu = createSelect()
    .size(120, 25)
    .position(extraSpaceW + margin, margin)
    .changed(startRag)
    .parent("sketch-holder");
  ragMenu.option("Select a rāg", "None");
  var ragList = Object.keys(ragInfo);
  for (var i = 0; i < ragList.length; i++) {
    var rag = ragInfo[ragList[i]].name + " | " + ragInfo[ragList[i]].nameTrans;
    ragMenu.option(rag, ragList[i]);
  }

  recordingsMenu = createSelect()
    .size(120, 25)
    .changed(start)
    .parent("sketch-holder");
  recordingsMenu.position(width - recordingsMenu.width - margin, margin);
  recordingsMenu.option("Select a recording", "None");
  var recList = Object.keys(recordingsList);
  for (var i = 0; i < recList.length; i++) {
    var rec = recordingsList[recList[i]].selectOption;
    recordingsMenu.option(rec, recList[i]);
  }

  recordButton = createButton("Mic ON")
    .size(70,  25)
    .mouseClicked(onClickMicButton)
    .parent("sketch-holder");
  recordButton.position(ragMenu.position()["x"] + ragMenu.width + margin, margin);
  recordButton.attribute("disabled", "true");

  for (var i = 0; i < melCursorX - svaraLineX1; i+=2) {
    melodicLine.push(undefined);
  }
}

function draw () {
  fill(backColor);
  noStroke();
  rect(extraSpaceW, extraSpaceH, width, height);

  textAlign(CENTER, TOP);
  textStyle(NORMAL);
  textSize(30);
  strokeWeight(5);
  stroke(frontColor);
  fill(backColor);
  text(ragName, extraSpaceW + mainSpaceW/2, extraSpaceH + margin*3);

  stroke(0, 50);
  strokeWeight(1);
  line(extraSpaceW + margin*2, extraSpaceH + margin*3 + 30, width - margin*2, extraSpaceH + margin*3 + 30);

  for (var i = 0; i < svaraList.length; i++) {
    svaraList[i].displayLines();
  }
  for (var i = 0; i < svaraList.length; i++) {
    svaraList[i].displaySvara();
  }

  if (loaded) {
    navBox.displayBack();
    navCursor.update();
    navCursor.display();
    navBox.displayFront();
    clock.display();

    if (!paused) {
      currentTime = track.currentTime();
    }
    var x = str(currentTime.toFixed(2));
    p = pitchTrack[x];
    if (p != "s" && p >= minHz && p <= maxHz) {
      var targetY = map(p, minHz, maxHz, cursorBottom, cursorTop);
      if (!paused) {
        melodicLine.shift();
        melodicLine.push(targetY);
      }
      cursorY += (targetY - cursorY) * easing;
      fill("white");
      stroke("black");
      strokeWeight(1);
      ellipse(melCursorX, cursorY, melCursorRadius, melCursorRadius);
    } else if (!paused) {
      melodicLine.shift();
      melodicLine.push(undefined);
    }
  } else if (live) {
    if (currentPitch != "s" && currentPitch >= minHz && currentPitch <= maxHz) {
      var targetY = map(currentPitch, -600, 2000, cursorBottom, cursorTop);
      melodicLine.shift();
      melodicLine.push(targetY);
      cursorY += (targetY - cursorY) * easing;
      fill("white");
      stroke("black");
      strokeWeight(3);
      ellipse(melCursorX, cursorY, melCursorRadius, melCursorRadius);
    } else {
      melodicLine.shift();
      melodicLine.push(undefined);
    }
  }

  for (var i = 0; i < melodicLine.length-1; i++) {
    stroke(255);
    strokeWeight(2);
    line(svaraLineX1 + i * 2, melodicLine[i], svaraLineX1 + (i + 1) * 2, melodicLine[i + 1] );
  }
}

function startRag () {
  if (loaded) {
    track.stop();
  }
  loaded = false;
  live = true;
  for (var i = 0; i < melodicLine.length; i++) {
    melodicLine[i] = undefined;
  }
  var currentRag = ragInfo[ragMenu.value()];
  pitchSpace = currentRag.pitchSpace
  ragName = currentRag.name + " " + currentRag.nameTrans;
  minHz = pitchSpace[0].cent-100;
  maxHz = pitchSpace[pitchSpace.length-1].cent+100;
  svaraList = [];
  for (var i = 0; i < pitchSpace.length; i++) {
    var svara = new CreateSvara(pitchSpace[i]);
    svaraList.push(svara);
  }
  buttonPlay.attribute("hidden", true);
  recordingsMenu.value("None");
  ragMenu.value("None");

  recordButton.removeAttribute("disabled");
  recordButton.html("Mic OFF");
  micButtonStatus = false;
  stopStatus = false;
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(handleSuccess);
}

function start () {
  live = false;
  if (loaded) {
    track.stop();
  }
  paused = true;
  loaded = false;
  currentTime = 0;
  for (var i = 0; i < melodicLine.length; i++) {
    melodicLine[i] = undefined;
  }
  var currentRecording = recordingsList[recordingsMenu.value()];
  trackFile = currentRecording.recording;
  trackDuration = currentRecording.duration;
  var currentRag = ragInfo[recordingsMenu.value()];
  pitchSpace = currentRag.pitchSpace
  ragName = currentRag.name + " " + currentRag.nameTrans;
  minHz = pitchSpace[0].cent-100;
  maxHz = pitchSpace[pitchSpace.length-1].cent+100;
  svaraList = [];
  for (var i = 0; i < pitchSpace.length; i++) {
    var svara = new CreateSvara(pitchSpace[i]);
    svaraList.push(svara);
  }
  pitchTrack = loadJSON('files/pitchTracks/'+trackFile+'_pitchTrack.json');
  buttonPlay.removeAttribute("hidden");
  buttonPlay.html("Load");

  clock = new CreateClock;

  recordingsMenu.value("None");
  ragMenu.value("None");

  recordButton.html("Mic ON");
  recordButton.attribute("disabled", "true");
  // stop the microphone access
  localStream.getAudioTracks()[0].stop();
  micButtonStatus = true;
  stopStatus = true;
}

function CreateNavigationBox () {
  this.x1 = buttonPlay.width + margin * 2;
  this.x2 = width - margin - 90;
  this.y1 = height - margin - navBoxH;
  this.y2 = height - margin;
  this.w = this.x2 - this.x1;

  this.displayBack = function () {
    fill(0, 50);
    noStroke();
    rect(this.x1, this.y1, this.w, navBoxH);
  }

  this.displayFront = function () {
    stroke(0, 150);
    strokeWeight(2);
    line(this.x1+1, this.y1, this.x2, this.y1);
    line(this.x2, this.y1, this.x2, this.y2);
    strokeWeight(1);
    line(this.x1, this.y1, this.x1, this.y2);
    line(this.x1, this.y2, this.x2, this.y2);
  }

  this.clicked = function () {
    if (mouseX > this.x1 && mouseX < this.x2 && mouseY > this.y1 && mouseY < this.y2) {
      jump = map(mouseX, this.x1, this.x2, 0, trackDuration);
      if (paused) {
        currentTime = jump;
      } else {
        track.jump(jump);
        jump = undefined;
      }
      for (var i = 0; i < melodicLine.length; i++) {
        melodicLine[i] = undefined;
      }
    }
  }
}

function CreateNavCursor () {
  this.x = navBox.x1 + navCursorW/2;

  this.update = function () {
    this.x = map(currentTime, 0, trackDuration, navBox.x1+navCursorW/2, navBox.x2-navCursorW/2);
    if (navBox.x2 - navCursorW/2 - this.x < 0.1) {
      buttonPlay.html("Play");
      track.stop();
      paused = true;
      currentTime = 0;
    }
  }

  this.display = function () {
    stroke(frontColor);
    strokeWeight(navCursorW);
    line(this.x, navBox.y1+navCursorW/2, this.x, navBox.y2-navCursorW/2);
  }
}

function CreateSvara (svara) {
  this.y = map(svara.cent, minHz, maxHz, cursorBottom, cursorTop);
  this.name = svara.svara;
  this.function = svara.function;
  if (this.function == "sadja") {
    this.radius = svaraRadius1;
    this.col = frontColor;
    this.strokeW = 4;
    this.lineW = 4;
    this.txtCol = backColor;
  } else if (this.function == "vadi") {
    this.radius = svaraRadius1;
    this.col = backColor;
    this.strokeW = 4;
    this.lineW = 2;
    this.txtCol = frontColor;
  } else if (this.function == "samvadi") {
    this.radius = svaraRadius2;
    this.col = backColor;
    this.strokeW = 2;
    this.lineW = 2;
    this.txtCol = frontColor;
  } else {
    this.radius = svaraRadius2;
    this.col = color(0, 0);
    this.strokeW = 0;
    this.lineW = 1;
    this.txtCol = frontColor;
  }
  if (svaraList.length == 0) {
    this.position = 0;
  } else if (svaraList[svaraList.length-1].position == 0) {
    this.position = 1;
  } else {
    this.position = 0;
  }
  this.x_adjust = svaraLine + (svaraRadius1*2) * this.position;

  this.displayLines = function () {
    if (this.name != "") {
      stroke(frontColor);
      strokeWeight(this.lineW);
      line(svaraLineX1 - this.x_adjust, this.y, melCursorX + this.x_adjust, this.y)
    }
  }

  this.displaySvara = function () {
    stroke(frontColor);
    strokeWeight(this.strokeW);
    fill(this.col);
    ellipse(melCursorX + this.x_adjust + svaraRadius1, this.y, svaraRadius1, svaraRadius1);
    ellipse(svaraLineX1 - this.x_adjust - svaraRadius1, this.y, svaraRadius1, svaraRadius1);

    textAlign(CENTER, CENTER);
    noStroke();
    textSize(svaraRadius1*0.9);//this.radius*0.9);
    textStyle(BOLD);//this.txtStyle);
    fill(this.txtCol);
    text(this.name, melCursorX + this.x_adjust + svaraRadius1, this.y+this.radius*0.1);
    text(this.name, svaraLineX1 - this.x_adjust - svaraRadius1, this.y+this.radius*0.1);
    // stroke(frontColor);
    // strokeWeight(3);
    // fill(backColor);
    // textSize(svaraRadius1*0.7);
    // textStyle(NORMAL);
    // text(this.key, melCursorX + this.x_adjust + svaraRadius1 + textWidth(this.name), this.y + (svaraRadius1*0.9)/2)
  }
}

function CreateClock () {
  this.clock;
  this.y = navBox.y2 - navBoxH / 2;
  this.total = niceTime(trackDuration);
  this.now;
  this.display = function () {
    this.now = niceTime(currentTime);
    this.clock = this.now + " / " + this.total;
    textAlign(LEFT, CENTER);
    textSize(12);
    textStyle(NORMAL);
    noStroke();
    fill(frontColor);
    text(this.clock, navBox.x2 + margin, this.y);
  }
}

function player () {
  if (loaded) {
    if (paused) {
      paused = false;
      if (jump == undefined) {
        track.play();
      } else {
        track.play();
        track.jump(jump);
        jump = undefined;
      }
      buttonPlay.html("Pause");
    } else {
      paused = true;
      currentTime = track.currentTime();
      track.pause();
      buttonPlay.html("Play");
    }
  } else {
    initLoading = millis();
    buttonPlay.html("Loading...");
    buttonPlay.attribute("disabled", "true");
    recordingsMenu.attribute("disabled", "true");
    ragMenu.attribute("disabled", "true");
    track = loadSound("tracks/" + trackFile + '.mp3', soundLoaded, failedLoad);
  }
}

function soundLoaded () {
  buttonPlay.html("Play");
  buttonPlay.removeAttribute("disabled");
  ragMenu.removeAttribute("disabled");
  recordingsMenu.removeAttribute("disabled");
  loaded = true;
  var endLoading = millis();
  print("Track loaded in " + (endLoading-initLoading)/1000 + " seconds");
}

function failedLoad () {
  print("Loading failed");
}

function mouseClicked () {
  if (loaded) {
    navBox.clicked();
  }
}

function niceTime (seconds) {
  var niceTime;
  var sec = int(seconds%60);
  var min = int(seconds/60);
  niceTime = str(min).padStart(2, "0") + ":" + str(sec).padStart(2, "0");
  return niceTime
}

handleSuccess = function(stream) {
  var context = new AudioContext();
  var source = context.createMediaStreamSource(stream);
  var processor = context.createScriptProcessor(1024, 1, 1);

  source.connect(processor);
  processor.connect(context.destination);
  localStream = stream;
  processor.onaudioprocess = function(e) {
    // Do something with the data, i.e Convert this to WAV
    // console.log(e.inputBuffer);
    var frequency = yin(e.inputBuffer.getChannelData(0), audioCtx.sampleRate, 0.3)
    //console.log(frequency)
    currentPitch = 1200*Math.log2(frequency/refBaseNote);
    console.log(currentPitch);
    if (stopStatus){
      context.close();
    }
  }
}

// callback function to start/stop using microphone input
onClickMicButton = function() {
  if (micButtonStatus) {
    recordButton.html("Mic OFF");
    micButtonStatus = false;
    stopStatus = false;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(handleSuccess);
  }
  else {
    recordButton.html("Mic ON");
    // stop the microphone access
    localStream.getAudioTracks()[0].stop();
    micButtonStatus = true;
    stopStatus = true;
  }
}
