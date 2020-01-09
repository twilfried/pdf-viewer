// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.loadDocument: https://www.pdftron.com/api/web/WebViewerInstance.html#loadDocument__anchor

// @link DocumentViewer: https://www.pdftron.com/api/web/CoreControls.DocumentViewer.html
// @link DocumentViewer.getViewportRegionRect: https://www.pdftron.com/api/web/CoreControls.DocumentViewer.html#getViewportRegionRect__anchor
// @link DocumentViewer.getCurrentPage: https://www.pdftron.com/api/web/CoreControls.DocumentViewer.html#getCurrentPage__anchor

// @link CoreControls: https://www.pdftron.com/api/web/CoreControls.html
// @link PartRetrievers: https://www.pdftron.com/api/web/PartRetrievers.html

// @link Document: https://www.pdftron.com/api/web/CoreControls.Document.html
// @link Document.loadAsync: https://www.pdftron.com/api/web/CoreControls.Document.html#loadAsync__anchor
// @link Document.cancelLoadCanvas: https://www.pdftron.com/api/web/CoreControls.Document.html#cancelLoadCanvas__anchor

CoreControls.setWorkerPath('../../../lib/core');

/**
 * If in IE11, it will have value of true
 */
var shouldDisplayBeforeDocRendered = !!window.MSInputMethodContext && !!document.documentMode;

var pdfWorkerTransportPromise;
var officeWorkerTransportPromise;
var currentLoadCanvas = {};
var lastRenderRect = {};
var viewers = [];
var instances = {};

/**
 * Used to figure out smallest scale value > 0
 * so that canvase won't appear inverted
 */
var minScaleVal;

var PANEL_IDS = {
  LEFT_PANEL: 'leftPanel',
  MID_PANEL: 'middlePanel',
  RIGHT_PANEL: 'rightPanel',
};

var VIEWER_IDS = [{ panel: PANEL_IDS.LEFT_PANEL }, { panel: PANEL_IDS.MID_PANEL }, { panel: PANEL_IDS.RIGHT_PANEL }];

var TRANSFORMATION_DELTA = 1;

/**
 * Keeps track of the original canvas for each page
 * so that it can be retrieved easily when applying a transformation via nudge tool
 */
var originalCanvases = [];

function isPixelWhite(data, index) {
  // Treat transparent pixels as white
  if (data[index + 3] === 0) {
    return true;
  }

  for (var i = 0; i < 3; i++) {
    if (data[index + i] !== 255) {
      return false;
    }
  }
  return true;
}

function isPixelDataEqual(data1, data2, index) {
  for (var i = 0; i < 4; i++) {
    if (data1[index + i] !== data2[index + i]) {
      return false;
    }
  }
  return true;
}

function getCoords(i, width) {
  var pixels = Math.floor(i / 4);
  return {
    x: pixels % width,
    y: Math.floor(pixels / width),
  };
}

function getIndex(coords, width) {
  return (coords.y * width + coords.x) * 4;
}

function diffPixels(pageCanvas, firstDocCanvas, firstDocData) {
  pageCanvas.style.position = 'absolute';
  pageCanvas.style.zIndex = 25;
  pageCanvas.style.left = firstDocCanvas.style.left;
  pageCanvas.style.top = firstDocCanvas.style.top;
  pageCanvas.style.backgroundColor = '';

  pageCanvas.classList.add('canvasOverlay');
  firstDocCanvas.parentNode.appendChild(pageCanvas);

  var ctx = pageCanvas.getContext('2d');
  var secondDocImageData = ctx.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
  var secondDocData = secondDocImageData.data;

  for (var i = 0; i < secondDocData.length; i += 4) {
    var coords = getCoords(i, pageCanvas.width);
    var index = getIndex(coords, firstDocCanvas.width);
    var lightness;

    // Apply alpha compositing to treat data as if they were drawn on white background
    var firstOpacity = firstDocData[index + 3] / 255;
    var secondOpacity = secondDocData[i + 3] / 255;

    firstDocData[index] = firstOpacity * firstDocData[index] + (1 - firstOpacity) * 255;
    firstDocData[index + 1] = firstOpacity * firstDocData[index + 1] + (1 - firstOpacity) * 255;
    firstDocData[index + 2] = firstOpacity * firstDocData[index + 2] + (1 - firstOpacity) * 255;
    firstDocData[index + 3] = 255;

    secondDocData[i] = secondOpacity * secondDocData[i] + (1 - secondOpacity) * 255;
    secondDocData[i + 1] = secondOpacity * secondDocData[i + 1] + (1 - secondOpacity) * 255;
    secondDocData[i + 2] = secondOpacity * secondDocData[i + 2] + (1 - secondOpacity) * 255;
    secondDocData[i + 3] = 255;

    var isFirstPixelWhite = isPixelWhite(firstDocData, index);
    var isSecondPixelWhite = isPixelWhite(secondDocData, index);
    if (isFirstPixelWhite && isSecondPixelWhite) {
      // if pixel is white/transparent, make it fully white
      secondDocData[i] = 255;
      secondDocData[i + 1] = 255;
      secondDocData[i + 2] = 255;
      secondDocData[i + 3] = 255;
    } else if (isPixelDataEqual(firstDocData, secondDocData, index)) {
      // if pixel values are the same, make it grey
      lightness = (secondDocData[i] + secondDocData[i + 1] + secondDocData[i + 2]) / 6;

      secondDocData[i] = 128 + lightness;
      secondDocData[i + 1] = 128 + lightness;
      secondDocData[i + 2] = 128 + lightness;
    } else if (coords.y <= firstDocCanvas.height && coords.x <= firstDocCanvas.width) {
      if (isFirstPixelWhite) {
        lightness = (secondDocData[i] + secondDocData[i + 1] + secondDocData[i + 2]) / 3;
        // if the pixel is white in first document only, color it blue
        secondDocData[i] = lightness;
        secondDocData[i + 1] = lightness;
        secondDocData[i + 2] = 255;
      } else if (isSecondPixelWhite) {
        lightness = (firstDocData[index] + firstDocData[index + 1] + firstDocData[index + 2]) / 3;
        // if the pixel is white in second document only, color it red
        secondDocData[i] = 255;
        secondDocData[i + 1] = lightness;
        secondDocData[i + 2] = lightness;
      } else {
        var firstLightness = (firstDocData[index] + firstDocData[index + 1] + firstDocData[index + 2]) / 3;
        var secondLightness = (secondDocData[i] + secondDocData[i + 1] + secondDocData[i + 2]) / 3;
        lightness = (firstLightness + secondLightness) / 2;

        // otherwise, color it magenta-ish based on color difference
        var colorDifference = Math.abs(secondDocData[i] - firstDocData[index]) + Math.abs(secondDocData[i + 1] - firstDocData[index + 1]) + Math.abs(secondDocData[i + 2] - firstDocData[index + 2]);

        var diffPercent = colorDifference / (255 * 3);
        var valChange = lightness * diffPercent;

        var magentaVal = lightness + valChange;

        secondDocData[i] = magentaVal;
        secondDocData[i + 1] = lightness - valChange;
        secondDocData[i + 2] = magentaVal;
      }
    }
  }
  ctx.putImageData(secondDocImageData, 0, 0);
}

function computeNewCoordsFromZoomRotation(currZoom, currRotation, dX, dY) {
  var result = [dX, dY];
  // https://www.pdftron.com/api/web/PDFNet.Page.html#.rotationToDegree__anchor
  switch (currRotation) {
    // 0 deg
    case 0:
      result = [dX * currZoom, dY * currZoom];
      break;
    // 90 deg
    case 1:
      result = [dY * currZoom * -1, dX * currZoom];
      break;
    // 180 deg
    case 2:
      result = [dX * currZoom, dY * currZoom * -1];
      break;
    // 270 deg
    case 3:
      result = [dY * currZoom, dX * currZoom];
      break;
  }
  return result;
}

function updateMiddlePanelDiff(pageIndexToApplyDiff) {
  if (!originalCanvases[pageIndexToApplyDiff]) {
    return;
  }
  var instance = instances[PANEL_IDS.MID_PANEL].instance;
  var documentContainer = instances[PANEL_IDS.MID_PANEL].documentContainer;

  var canvas = originalCanvases[pageIndexToApplyDiff];
  // eslint-disable-next-line no-undef
  var transformationToApply = getPageTransformationState(pageIndexToApplyDiff);

  var coords = computeNewCoordsFromZoomRotation(
    instance.docViewer.getZoom(),
    instance.docViewer.getRotation(),
    transformationToApply.horizontalTranslation * TRANSFORMATION_DELTA,
    transformationToApply.verticalTranslation * TRANSFORMATION_DELTA
  );

  var newCanvas = document.createElement('canvas');
  var newCanvasCtx = newCanvas.getContext('2d');

  newCanvas.setAttribute('width', canvas.width);
  newCanvas.setAttribute('height', canvas.height);

  newCanvas.style.width = canvas.style.width;
  newCanvas.style.height = canvas.style.height;

  newCanvasCtx.fillStyle = 'white';

  newCanvasCtx.save();

  // translate so that we can rotate using the center as the focal point
  newCanvasCtx.translate(canvas.width / 2, canvas.height / 2);

  var newScale = (TRANSFORMATION_DELTA * transformationToApply.scaling + 100) / 100;
  if (newScale >= 0) {
    minScaleVal = newScale;
    newCanvasCtx.scale(newScale, newScale);
  } else {
    newCanvasCtx.scale(minScaleVal, minScaleVal);
  }
  // rotate params must be in radians
  newCanvasCtx.rotate((transformationToApply.rotation * Math.PI) / 180);
  // undo translation so that future transformations are correct
  newCanvasCtx.translate(-canvas.width / 2, -canvas.height / 2);
  newCanvasCtx.translate(coords[0], coords[1]);
  newCanvasCtx.drawImage(canvas, 0, 0);

  newCanvasCtx.restore();

  // eslint-disable-next-line prefer-template
  var firstDocCanvas = documentContainer.querySelector('.canvas' + pageIndexToApplyDiff);
  if (!firstDocCanvas) {
    return;
  }
  var firstDocCtx = firstDocCanvas.getContext('2d');
  var firstDocData = firstDocCtx.getImageData(0, 0, firstDocCanvas.width, firstDocCanvas.height).data;

  var existingOverlay = firstDocCanvas.parentNode.querySelector('.canvasOverlay');
  if (existingOverlay) {
    existingOverlay.parentNode.removeChild(existingOverlay);
  }
  diffPixels(newCanvas, firstDocCanvas, firstDocData);
}

function updatePage(doc, documentContainer, instance, pageIndex) {
  // eslint-disable-next-line prefer-template
  var firstDocCanvas = documentContainer.querySelector('.canvas' + pageIndex);
  if (!firstDocCanvas) {
    return;
  }
  var isViewportRender = firstDocCanvas.style.left !== '';

  return doc.loadCanvasAsync({
    pageIndex: pageIndex,
    canvasNum: 1,
    pageRotation: instance.docViewer.getRotation(),
    getZoom: function() {
      return instance.docViewer.getZoom();
    },
    drawComplete: function(pageCanvas) {
      originalCanvases[pageIndex] = pageCanvas;
      updateMiddlePanelDiff(pageIndex);
      currentLoadCanvas[pageIndex] = null;
    },
    renderRect: isViewportRender ? Object.assign({}, lastRenderRect[pageIndex]) : undefined,
  });
}

function update(panel, pageIndex) {
  var newDoc = instances[panel].newDoc;
  var documentContainer = instances[panel].documentContainer;
  var instance = instances[panel].instance;

  if (currentLoadCanvas[pageIndex]) {
    newDoc.cancelLoadCanvas(currentLoadCanvas[pageIndex]);
  }
  currentLoadCanvas[pageIndex] = updatePage(newDoc, documentContainer, instance, pageIndex);
}

var originalScroller = null;
var scrollTimeout;

// Create an instance of worker transport to share among WebViewer instances
function getWorkerTransportPromise(path) {
  // String or file
  var filename = typeof path === 'object' ? path.name : path || '';
  var isOfficeFile = filename.endsWith('docx') || filename.endsWith('pptx') || filename.endsWith('xlsx');

  // Use existing workers
  if (isOfficeFile && officeWorkerTransportPromise) {
    return officeWorkerTransportPromise;
  }

  if (!isOfficeFile && pdfWorkerTransportPromise) {
    return pdfWorkerTransportPromise;
  }

  return CoreControls.getDefaultBackendType().then(function(backendType) {
    if (path && isOfficeFile) {
      officeWorkerTransportPromise = CoreControls.initOfficeWorkerTransports(backendType, {});

      return officeWorkerTransportPromise;
    }

    // Use PDF worker by default
    pdfWorkerTransportPromise = CoreControls.initPDFWorkerTransports(backendType, {});

    return pdfWorkerTransportPromise;
  });
}

function loadDocument(panel, docLocation) {
  var CoreControls = instances[panel].instance.CoreControls;

  CoreControls.createDocument(docLocation, { workerTransportPromise: getWorkerTransportPromise(docLocation) }).then(function(newDoc) {
    instances[panel] = Object.assign({}, instances[panel], { newDoc: newDoc });
  });
}

function openDoc(panel, firstPdf, secondPdf) {
  var instance = instances[panel].instance;
  instance.loadDocument(firstPdf);

  if (panel === PANEL_IDS.MID_PANEL && secondPdf) {
    loadDocument(panel, secondPdf);
  }
}

// Synchronizes scrolling of WebViewer instances
function syncScrolls(scrollLeft, scrollTop) {
  viewers.forEach(function(item) {
    const documentContainer = instances[item.panel].documentContainer;

    if (!documentContainer) {
      return;
    }

    if (documentContainer.scrollLeft !== scrollLeft) {
      documentContainer.scrollLeft = scrollLeft;
    }

    if (documentContainer.scrollTop !== scrollTop) {
      documentContainer.scrollTop = scrollTop;
    }
  });
}

// Synchronizes zooming of WebViewer instances
function syncZoom(zoom) {
  viewers.forEach(function(item) {
    var instance = instances[item.panel].instance;

    if (instance.getZoomLevel() !== zoom) {
      instance.setZoomLevel(zoom);
    }
  });
}

// Synchronizes rotation of the page
function syncRotation(rotation) {
  viewers.forEach(function(item) {
    var instance = instances[item.panel].instance;

    if (instance.docViewer.getRotation() !== rotation) {
      instance.docViewer.setRotation(rotation);
    }
  });
}

// Create an instance of WebViewer
function setupViewer(item) {
  return new Promise(function(resolve) {
    var viewerElement = document.getElementById(item.panel);

    WebViewer(
      {
        path: '../../../lib',
        // share a single instame of the worker transport
        workerTransportPromise: getWorkerTransportPromise(item.pdf),
        initialDoc: item.pdf || null,
        // disable annotation rendering
        enableAnnotations: false,
      },
      viewerElement
    ).then(function(instance) {
      var docViewer = instance.docViewer;

      docViewer.on('documentLoaded', function() {
        if (!instances[item.panel].documentContainer) {
          var documentContainer = viewerElement.querySelector('iframe').contentDocument.querySelector('.DocumentContainer');
          instances[item.panel] = Object.assign({}, instances[item.panel], {
            documentContainer: documentContainer,
          });

          // Sync all WebViewer instances when scroll changes
          documentContainer.onscroll = function() {
            if (!originalScroller || originalScroller === documentContainer) {
              originalScroller = documentContainer;
              syncScrolls(documentContainer.scrollLeft, documentContainer.scrollTop);
              clearTimeout(scrollTimeout);
              scrollTimeout = setTimeout(function() {
                originalScroller = null;
              }, 50);
            }
          };
        }
      });

      // Update zoom value of the WebViewer instances
      docViewer.on('zoomUpdated', function(zoom) {
        syncZoom(zoom);
      });

      // Update rotation value of the WebViewer instances
      docViewer.on('rotationUpdated', function(rotation) {
        syncRotation(rotation);
      });

      viewers.push(item);

      instances[item.panel] = {
        instance: instance,
        viewerElement: viewerElement,
      };

      resolve();
    });
  });
}

function initializeViewers(array, callback) {
  var pageCompleteRenderRect = {};

  Promise.all(array.map(setupViewer)).then(function() {
    var instance = instances[PANEL_IDS.MID_PANEL].instance;

    // eslint-disable-next-line no-undef
    setInstance(instance);

    // disable for middle panel
    instance.disableElements([PANEL_IDS.LEFT_PANEL, 'leftPanelButton', 'searchButton', 'searchPanel', 'searchOverlay']);

    instance.docViewer.on('pageComplete', function(completedPageIndex) {
      pageCompleteRenderRect[completedPageIndex] = lastRenderRect[completedPageIndex];
      update(PANEL_IDS.MID_PANEL, completedPageIndex);
    });

    instance.docViewer.on('beginRendering', function() {
      var pageIndex = instance.docViewer.getCurrentPage() - 1;
      lastRenderRect[pageIndex] = instance.docViewer.getViewportRegionRect(pageIndex);
      if (currentLoadCanvas[pageIndex]) {
        var newDoc = instances[PANEL_IDS.MID_PANEL].newDoc;
        newDoc.cancelLoadCanvas(currentLoadCanvas[pageIndex]);
      }
    });

    instance.docViewer.on('finishedRendering', function() {
      var displayMode = instance.docViewer.getDisplayModeManager().getDisplayMode();
      var visiblePages = displayMode.getVisiblePages();

      visiblePages.forEach(function(pageIndex) {
        lastRenderRect[pageIndex] = pageCompleteRenderRect[pageIndex];
        update(PANEL_IDS.MID_PANEL, pageIndex);
        // eslint-disable-next-line no-undef
        setNudgeDiffToolVisibility(true);
      });
    });

    instance.docViewer.one('finishedRendering', function() {
      // run this only once
      // in IE11, this event is called everytime a pdf is rotated or zoomed in
      // eslint-disable-next-line no-undef
      setUpNudgeToolAndAppendToIFrame();
    });

    return callback(null, instances);
  });
}

function onNudgeToolStateChange() {
  var instance = instances[PANEL_IDS.MID_PANEL].instance;
  var currPageIndex = instance.docViewer.getCurrentPage() - 1;
  updateMiddlePanelDiff(currPageIndex);
}

function initialize(firstPdfRelPath, secondPdfRelPath, nudgeToolVisibilityBeforeDocRendered) {
  openDoc(PANEL_IDS.MID_PANEL, firstPdfRelPath, secondPdfRelPath);
  openDoc(PANEL_IDS.LEFT_PANEL, firstPdfRelPath);
  openDoc(PANEL_IDS.RIGHT_PANEL, secondPdfRelPath);

  originalCanvases = [];
  // eslint-disable-next-line no-undef
  setNudgeDiffToolVisibility(nudgeToolVisibilityBeforeDocRendered);
  // eslint-disable-next-line no-undef
  resetPageTransformationStates();
}

// Initialize WebViewer instances
initializeViewers(VIEWER_IDS, function() {
  initialize(window.location.href + '../../../samples/files/test_doc_1.pdf', window.location.href + '../../../samples/files/test_doc_2.pdf');
});

document.getElementById('selectControl').onclick = function(e) {
  e.preventDefault();
  var select1 = document.getElementById('select1');
  var firstPdf = select1.options[select1.selectedIndex].value;
  var select2 = document.getElementById('select2');
  var secondPdf = select2.options[select2.selectedIndex].value;

  initialize(window.location.href + firstPdf, window.location.href + secondPdf, shouldDisplayBeforeDocRendered);
};

document.getElementById('url-form').onsubmit = function(e) {
  e.preventDefault();

  var firstPdf = document.getElementById('url').value;
  var secondPdf = document.getElementById('url2').value;

  initialize(firstPdf, secondPdf, shouldDisplayBeforeDocRendered);
};

document.getElementById('file-picker-form').onsubmit = function(e) {
  e.preventDefault();
  var firstPdf = document.forms['file-picker-form'][0].files[0];
  var secondPdf = document.forms['file-picker-form'][1].files[0];

  initialize(firstPdf, secondPdf, shouldDisplayBeforeDocRendered);
};

// eslint-disable-next-line no-undef
onStateChange(onNudgeToolStateChange);
// eslint-disable-next-line no-undef
setNudgeDiffToolVisibility(shouldDisplayBeforeDocRendered);
// eslint-disable-next-line no-undef
initNudgeTool();
