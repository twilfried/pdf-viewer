// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.registerTool: https://www.pdftron.com/api/web/WebViewerInstance.html#registerTool__anchor
// @link WebViewerInstance.unregisterTool: https://www.pdftron.com/api/web/WebViewerInstance.html#unregisterTool__anchor
// @link WebViewerInstance.setHeaderItems: https://www.pdftron.com/api/web/WebViewerInstance.html#setHeaderItems__anchor
// @link WebViewerInstance.setToolMode: https://www.pdftron.com/api/web/WebViewerInstance.html#setToolMode__anchor

// @link Header: https://www.pdftron.com/api/web/Header.html
// @link Header.get: https://www.pdftron.com/api/web/Header.html#get__anchor
// @link Header.getHeader: https://www.pdftron.com/api/web/Header.html#getHeader__anchor
// @link Header.insertBefore: https://www.pdftron.com/api/web/Header.html#insertBefore__anchor

WebViewer(
  {
    path: '../../../lib',
    pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
    initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf',
  },
  document.getElementById('viewer')
).then(function(instance) {
  // ruler.js
  var rulerTool = window.createRulerTool(instance);
  // stamp.js
  var customStampTool = window.createStampTool(instance);

  var addRulerTool = function() {
    // Register tool
    instance.registerTool({
      toolName: 'RulerTool',
      toolObject: rulerTool,
      buttonImage: '../../../samples/annotation/custom-annotations/ruler.svg',
      buttonName: 'rulerToolButton',
      tooltip: 'Ruler Tool',
    });

    // Add tool button in header
    instance.setHeaderItems(function(header) {
      header.get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'RulerTool',
        hidden: ['tablet', 'mobile'],
      });
      header
        .getHeader('tools')
        .get('freeHandToolGroupButton')
        .insertBefore({
          type: 'toolButton',
          toolName: 'RulerTool',
          hidden: ['desktop'],
        });
    });
    instance.setToolMode('RulerTool');
  };

  function removeRulerTool() {
    // Unregister tool
    instance.unregisterTool('RulerTool');
    instance.setToolMode('AnnotationEdit');
  }

  function addCustomStampTool() {
    // Register tool
    instance.registerTool({
      toolName: 'CustomStampTool',
      toolObject: customStampTool,
      buttonImage: '../../../samples/annotation/custom-annotations/stamp.png',
      buttonName: 'customStampToolButton',
      tooltip: 'Approved Stamp Tool',
    });

    // Add tool button in header
    instance.setHeaderItems(function(header) {
      header.get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'CustomStampTool',
        hidden: ['tablet', 'mobile'],
      });
      header
        .getHeader('tools')
        .get('freeHandToolGroupButton')
        .insertBefore({
          type: 'toolButton',
          toolName: 'CustomStampTool',
          hidden: ['desktop'],
        });
    });

    instance.setToolMode('CustomStampTool');
  }

  function removeCustomStampTool() {
    instance.unregisterTool('CustomStampTool');
    instance.setToolMode('AnnotationEdit');
  }

  document.getElementById('ruler').onchange = function(e) {
    if (e.target.checked) {
      addRulerTool();
    } else {
      removeRulerTool();
    }
  };

  document.getElementById('custom-stamp').onchange = function(e) {
    if (e.target.checked) {
      addCustomStampTool();
    } else {
      removeCustomStampTool();
    }
  };

  instance.iframeWindow.document.body.ondragover = function(e) {
    e.preventDefault();
    return false;
  };

  var dropPoint = {};
  instance.iframeWindow.document.body.ondrop = function(e) {
    var scrollElement = instance.docViewer.getScrollViewElement();
    var scrollLeft = scrollElement.scrollLeft || 0;
    var scrollTop = scrollElement.scrollTop || 0;
    dropPoint = { x: e.pageX + scrollLeft, y: e.pageY + scrollTop };
    e.preventDefault();
    return false;
  };

  function addStamp(imgData, point, rect) {
    point = point || {};
    rect = rect || {};
    var Annotations = instance.Annotations;
    var docViewer = instance.docViewer;
    var annotManager = docViewer.getAnnotationManager();
    var doc = docViewer.getDocument();
    var displayMode = docViewer.getDisplayModeManager().getDisplayMode();
    var page = displayMode.getSelectedPages(point, point);
    if (!!point.x && page.first == null) {
      return; // don't add to an invalid page location
    }
    var pageIdx = page.first !== null ? page.first : docViewer.getCurrentPage() - 1;
    var pageInfo = doc.getPageInfo(pageIdx);
    var pagePoint = displayMode.windowToPage(point, pageIdx);
    var zoom = docViewer.getZoom();

    var stampAnnot = new Annotations.StampAnnotation();
    stampAnnot.PageNumber = pageIdx + 1;
    var rotation = docViewer.getCompleteRotation(pageIdx + 1) * 90;
    stampAnnot.Rotation = rotation;
    if (rotation === 270 || rotation === 90) {
      stampAnnot.Width = rect.height / zoom;
      stampAnnot.Height = rect.width / zoom;
    } else {
      stampAnnot.Width = rect.width / zoom;
      stampAnnot.Height = rect.height / zoom;
    }
    stampAnnot.X = (pagePoint.x || pageInfo.width / 2) - stampAnnot.Width / 2;
    stampAnnot.Y = (pagePoint.y || pageInfo.height / 2) - stampAnnot.Height / 2;

    stampAnnot.ImageData = imgData;
    stampAnnot.Author = annotManager.getCurrentUser();

    annotManager.deselectAllAnnotations();
    annotManager.addAnnotation(stampAnnot);
    annotManager.redrawAnnotation(stampAnnot);
    annotManager.selectAnnotation(stampAnnot);
  }

  // create a stamp image copy for drag and drop
  var sampleImg = document.getElementById('sample-image');
  var div = document.createElement('div');
  var img = document.createElement('img');
  img.id = 'sample-image-copy';
  div.appendChild(img);
  div.style.position = 'absolute';
  div.style.top = '-500px';
  div.style.left = '-500px';
  document.body.appendChild(div);
  var el = sampleImg.firstElementChild;
  img.src = el.src;
  var height = el.height;
  function drawImage() {
    var width = (height / img.height) * img.width;
    img.style.width = width + 'px';
    img.style.height = height + 'px';
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    c.width = width;
    c.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    img.src = c.toDataURL();
  }
  img.onload = drawImage;

  sampleImg.ondragstart = function(e) {
    e.target.style.opacity = 0.5;
    var copy = e.target.cloneNode(true);
    copy.id = 'stamp-image-drag-copy';
    var el = document.getElementById('sample-image-copy');
    copy.src = el.src;
    copy.style.width = el.width;
    copy.style.height = el.height;
    copy.style.padding = 0;
    copy.style.position = 'absolute';
    copy.style.top = '-1000px';
    copy.style.left = '-1000px';
    document.body.appendChild(copy);
    e.dataTransfer.setDragImage(copy, copy.width * 0.5, copy.height * 0.5);
    e.dataTransfer.setData('text', '');
  };

  sampleImg.ondragend = function(e) {
    var el = document.getElementById('stamp-image-drag-copy');
    addStamp(e.target.src, dropPoint, el.getBoundingClientRect());
    e.target.style.opacity = 1;
    document.body.removeChild(document.getElementById('stamp-image-drag-copy'));
    e.preventDefault();
  };

  sampleImg.onclick = function(e) {
    addStamp(e.target.src, {}, document.getElementById('sample-image-copy'));
  };

  document.getElementById('file-open').onchange = function() {
    var fileReader = new FileReader();
    fileReader.onload = function() {
      var result = fileReader.result;
      var uploadImg = new Image();
      uploadImg.onload = function() {
        var imgWidth = 250;
        addStamp(result, {}, { width: imgWidth, height: (uploadImg.height / uploadImg.width) * imgWidth });
      };
      uploadImg.src = result;
    };
    if (this.files && this.files.length > 0) {
      fileReader.readAsDataURL(this.files[0]);
    }
  };
});
