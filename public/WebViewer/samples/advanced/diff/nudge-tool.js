/* eslint-disable no-unused-vars */
var MID_PANEL = 'middlePanel';

var TRANSFORMATION_TYPE = {
  // some arbitrary unique values
  HORIZONTAL_TRANSLATION_INC: 'HORIZONTAL_TRANSLATION_INC',
  HORIZONTAL_TRANSLATION_DEC: 'HORIZONTAL_TRANSLATION_DEC',
  VERTICAL_TRANSLATION_INC: 'VERTICAL_TRANSLATION_INC',
  VERTICAL_TRANSLATION_DEC: 'VERTICAL_TRANSLATION_DEC',
  ROTATION_INC: 'ROTATION_INC',
  ROTATION_DEC: 'ROTATION_DEC',
  SCALE_IN: 'SCALE_IN',
  SCALE_OUT: 'SCALE_OUT',
};

var DEFAULT_TRANSFORMATION_STATE = {
  verticalTranslation: 0,
  horizontalTranslation: 0,
  rotation: 0,
  scaling: 0,
};

var pageTransformationStates = {};

var onStateChangeCallbackFxn;

var intervalId;

var instance;

function setNudgeDiffToolVisibility(visible) {
  var temp = document.getElementById('nudge-diff-tool');

  var displayStyle = visible ? 'block' : 'none';
  if (temp) {
    temp.style.display = displayStyle;
  } else {
    temp = document
      .getElementById(MID_PANEL)
      .querySelector('iframe')
      .contentDocument.getElementById('nudge-diff-tool');
    if (temp) {
      temp.style.display = displayStyle;
    }
  }
}

function renderSVGIcons() {
  var url = window.location.href;
  var elementIdToSVGMapping = {
    rotateLeft: 'rotate_left.svg',
    rotateRight: 'rotate_right.svg',
    translateUp: 'arrow_up.svg',
    translateLeft: 'arrow_left.svg',
    translateRight: 'arrow_right.svg',
    translateDown: 'arrow_down.svg',
    scaleOut: 'size_decrease.svg',
    scaleIn: 'size_increase.svg',
  };
  Object.keys(elementIdToSVGMapping).forEach(function(elementId) {
    var temp = document.getElementById(elementId);
    var img = document.createElement('img');
    img.draggable = false;
    // eslint-disable-next-line prefer-template
    img.setAttribute('src', url + '/assets/' + elementIdToSVGMapping[elementId]);
    if (temp) {
      temp.appendChild(img);
    }
  });
}

function attachCSSStyleSheetLinkToIframe() {
  var link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  var url = window.location.href;
  if (url.charAt(url.length - 1) === '/') {
    url = url.substring(0, url.length - 1);
  }
  // eslint-disable-next-line prefer-template
  link.setAttribute('href', url + '/diff.css');
  var viewerElementHead = document
    .getElementById(MID_PANEL)
    .querySelector('iframe')
    .contentDocument.querySelector('head');
  viewerElementHead.appendChild(link);
}

function setUpNudgeToolAndAppendToIFrame() {
  attachCSSStyleSheetLinkToIframe();
  // eslint-disable-next-line no-undef
  renderSVGIcons();
  var nudgeDiffToolElement = document.getElementById('nudge-diff-tool');
  if (nudgeDiffToolElement) {
    // append it to iframe
    var viewerElementBody = document
      .getElementById(MID_PANEL)
      .querySelector('iframe')
      .contentDocument.querySelector('body');
    viewerElementBody.prepend(nudgeDiffToolElement);
  }
}

function detectLeftButton(evt) {
  evt = evt || window.event;
  if ('buttons' in evt) {
    return evt.buttons === 1;
  }
  var button = evt.which || evt.button;
  return button === 1;
}

function setUpEventListenersForTool(elementId, activateFxn, deactivateFxn) {
  document.getElementById(elementId).onmousedown = activateFxn;
  document.getElementById(elementId).onmouseup = deactivateFxn;
  document.getElementById(elementId).onmouseenter = function(e) {
    if (detectLeftButton(e)) {
      activateFxn();
    }
  };
  document.getElementById(elementId).onmouseleave = function(e) {
    if (detectLeftButton(e)) {
      deactivateFxn();
    }
  };
  document.getElementById(elementId).ontouchstart = function(e) {
    e.preventDefault();
    activateFxn(e);
  };
  document.getElementById(elementId).ontouchend = deactivateFxn;
}

function onStateChange(callbackFxn) {
  onStateChangeCallbackFxn = callbackFxn;
}

function setInstance(param) {
  instance = param;
}

function updateLocalTransformationState(transformationOperation) {
  // getCurrentPage() starts at index 1
  var currPageIndex = instance.docViewer.getCurrentPage() - 1;
  // if page does not exist
  if (!pageTransformationStates[currPageIndex]) {
    pageTransformationStates[currPageIndex] = {};
    Object.assign(pageTransformationStates[currPageIndex], DEFAULT_TRANSFORMATION_STATE);
  }

  var transformationState = pageTransformationStates[currPageIndex];
  switch (transformationOperation) {
    case TRANSFORMATION_TYPE.HORIZONTAL_TRANSLATION_INC:
      transformationState.horizontalTranslation++;
      break;
    case TRANSFORMATION_TYPE.HORIZONTAL_TRANSLATION_DEC:
      transformationState.horizontalTranslation--;
      break;
    case TRANSFORMATION_TYPE.VERTICAL_TRANSLATION_INC:
      transformationState.verticalTranslation++;
      break;
    case TRANSFORMATION_TYPE.VERTICAL_TRANSLATION_DEC:
      transformationState.verticalTranslation--;
      break;
    case TRANSFORMATION_TYPE.ROTATION_INC:
      transformationState.rotation++;
      break;
    case TRANSFORMATION_TYPE.ROTATION_DEC:
      transformationState.rotation--;
      break;
    case TRANSFORMATION_TYPE.SCALE_IN:
      transformationState.scaling++;
      break;
    case TRANSFORMATION_TYPE.SCALE_OUT:
      transformationState.scaling--;
      break;
  }
}

function initNudgeTool() {
  var elementIdToOperationMapping = {
    rotateLeft: TRANSFORMATION_TYPE.ROTATION_DEC,
    rotateRight: TRANSFORMATION_TYPE.ROTATION_INC,
    translateUp: TRANSFORMATION_TYPE.VERTICAL_TRANSLATION_DEC,
    translateLeft: TRANSFORMATION_TYPE.HORIZONTAL_TRANSLATION_DEC,
    translateRight: TRANSFORMATION_TYPE.HORIZONTAL_TRANSLATION_INC,
    translateDown: TRANSFORMATION_TYPE.VERTICAL_TRANSLATION_INC,
    scaleOut: TRANSFORMATION_TYPE.SCALE_OUT,
    scaleIn: TRANSFORMATION_TYPE.SCALE_IN,
  };
  Object.keys(elementIdToOperationMapping).forEach(function(elementId) {
    setUpEventListenersForTool(
      elementId,
      function() {
        var operationType = elementIdToOperationMapping[elementId];

        updateLocalTransformationState(operationType);
        if (onStateChangeCallbackFxn) {
          onStateChangeCallbackFxn(pageTransformationStates);
        }
        intervalId = setInterval(function() {
          updateLocalTransformationState(operationType);
          if (onStateChangeCallbackFxn) {
            onStateChangeCallbackFxn(pageTransformationStates);
          }
        }, 250);
      },
      function() {
        clearInterval(intervalId);
      }
    );
  });
  pageTransformationStates = {};
}

function resetPageTransformationStates() {
  pageTransformationStates = {};
}

function getPageTransformationState(index) {
  return pageTransformationStates[index] ? pageTransformationStates[index] : DEFAULT_TRANSFORMATION_STATE;
}
