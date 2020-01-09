(exports => {
  const PDFNet = exports.PDFNet;

  const initAll = async docurl => {
    try {
      // await exports.PDFNet.initialize(); // awaits promise
      // PDFNet.beginOperation();
      var doc = await PDFNet.PDFDoc.createFromURL(docurl);
      doc.initSecurityHandler();
      doc.lock();
      var pagecount = await doc.getPageCount();
      var pdfdraw = await PDFNet.PDFDraw.create(100);
      return { doc: doc, pdfdraw: pdfdraw, pagecount: pagecount };
    } catch (err) {
      console.log(err.stack);
    }
  };

  const renderPage = async (renderData, pageIndex) => {
    try {
      var doc = renderData.doc;
      var pdfdraw = renderData.pdfdraw;

      var currentPage = await doc.getPage(pageIndex);
      var bitmapInfo = await pdfdraw.getBitmap(currentPage, PDFNet.PDFDraw.PixelFormat.e_rgba, false);
      var bitmapWidth = bitmapInfo.width;
      var bitmapHeight = bitmapInfo.height;
      var bitmapArray = new Uint8ClampedArray(bitmapInfo.buf);

      var drawingCanvas = document.createElement('canvas');
      drawingCanvas.width = bitmapWidth;
      drawingCanvas.height = bitmapHeight;

      var ctx = drawingCanvas.getContext('2d');
      var imgData = ctx.createImageData(bitmapWidth, bitmapHeight);
      imgData.data.set(bitmapArray);

      ctx.putImageData(imgData, 0, 0);
      return drawingCanvas;
    } catch (err) {
      console.log(err.stack);
    }
  };

  // use "runWithoutCleanup" to lock the document data and run callback, use "with out cleanup" so data isn't cleared afterwards
  // add your own license key as the second parameter, e.g. PDFNet.runWithoutCleanup(main, 'YOUR_LICENSE_KEY')
  exports.loadDocument = docurl => PDFNet.runWithoutCleanup(async () => initAll(docurl), window.parent.sampleL);

  exports.loadCanvasAsync = (renderData, pageIndex) => PDFNet.runWithoutCleanup(async () => renderPage(renderData, pageIndex));
})(window);
// # sourceURL=DeckJSTest.js
