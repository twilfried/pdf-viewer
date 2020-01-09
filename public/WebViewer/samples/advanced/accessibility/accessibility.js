var voiceIndex = 0;
var pitch = 1;
var rate = 1;
var volume = 1;

window.onbeforeunload = function() {
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
};

var readText = function(documentText) {
  var utterance = new SpeechSynthesisUtterance(documentText);
  if (voiceIndex) {
    utterance.voice = speechSynthesis.getVoices()[voiceIndex];
  }
  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = volume;
  if (speechSynthesis.speaking) {
    speechSynthesis.resume();
  } else {
    speechSynthesis.speak(utterance);
  }
};

var pauseText = function() {
  speechSynthesis.pause();
};

var addVoices = function() {
  for (var i = 0; i < speechSynthesis.getVoices().length; i++) {
    var voice = speechSynthesis.getVoices()[i];
    var option = document.createElement('option');
    // eslint-disable-next-line
    option.textContent = voice.voiceURI + '-' + voice.lang;
    option.value = i;
    document.getElementById('voice').appendChild(option);
  }
};

// Instantiate
WebViewer(
  {
    path: '../../../lib',
    initialDoc: '../../../samples/files/cheetahs.pdf',
    accessibleMode: true,
  },
  document.getElementById('viewer')
).then(function(instance) {
  var docViewer = instance.docViewer;
  var iframeDocument = instance.iframeWindow.document;

  function getPageText(pageIndex) {
    var pageTextElement = iframeDocument.getElementById('pageText' + pageIndex);
    return pageTextElement ? pageTextElement.innerText : null;
  }

  var intervalId;
  function readDocumentText() {
    speechSynthesis.cancel();
    clearInterval(intervalId);
    // setInterval used in case text DOM is not ready yet
    intervalId = setInterval(function() {
      var currentPage = docViewer.getCurrentPage() - 1;
      var text = getPageText(currentPage);

      if (text) {
        readText(text);
        clearInterval(intervalId);
      }
    }, 200);
  }

  docViewer.on('documentLoaded', function() {
    var playButton = document.getElementById('play');
    var pauseButton = document.getElementById('pause');

    iframeDocument.addEventListener('keydown', function(e) {
      if (e.key === 'Tab' || e.keycode === 9) {
        speechSynthesis.cancel();
      }
      if (e.key === 'p' || e.keycode === 80) {
        readDocumentText();
      }
    });

    var voiceList = window.speechSynthesis.getVoices();
    if (voiceList.length) {
      addVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = addVoices;
    }

    playButton.onclick = readDocumentText;
    pauseButton.onclick = pauseText;
  });
});

var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

// SpeechSynthesis is not supported in IE11
if (isIE11) {
  window.alert('SpeechSynthesis is not supported in IE11.\nPlease try a different browser.');
  var aside = document.getElementsByTagName('aside')[0];
  while (aside.firstChild) {
    aside.removeChild(aside.firstChild);
  }
  var warningMessage = document.createTextNode('This demo is not compatible with IE11. Please open the demo in a different browser or ');
  var returnLink = document.createElement('a');
  var returnText = document.createTextNode('go back to samples');
  returnLink.setAttribute('href', '../');
  returnLink.setAttribute('target', '_self');
  aside.appendChild(warningMessage);
  returnLink.appendChild(returnText);
  aside.appendChild(returnLink);
}

var voiceDropdown = document.getElementById('voice');
var pitchSlider = document.getElementById('pitch');
var rateSlider = document.getElementById('rate');
var volumeSlider = document.getElementById('volume');

voiceDropdown.onchange = function() {
  speechSynthesis.cancel();
  voiceIndex = this.value;
};
pitchSlider.onchange = function() {
  speechSynthesis.cancel();
  pitch = this.value / 50;
};
rateSlider.onchange = function() {
  speechSynthesis.cancel();
  rate = this.value / 10;
};
volumeSlider.onchange = function() {
  speechSynthesis.cancel();
  volume = this.value / 100;
};
