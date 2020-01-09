// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.setHeaderItems: https://www.pdftron.com/api/web/WebViewerInstance.html#setHeaderItems__anchor
// @link WebViewerInstance.openElements: https://www.pdftron.com/api/web/WebViewerInstance.html#openElements__anchor
// @link WebViewerInstance.loadDocument: https://www.pdftron.com/api/web/WebViewerInstance.html#loadDocument__anchor

// @link Header: https://www.pdftron.com/api/web/Header.html

WebViewer(
  {
    path: '../../../lib',
    initialDoc: '../../../samples/files/test_doc_1.pdf',
    enableMeasurement: true,
  },
  document.getElementById('viewer')
).then(function(instance) {
  // Hide non-measurement tools
  instance.setHeaderItems(function(header) {
    header.delete('textToolGroupButton');
    header.delete('freeHandToolGroupButton');
    header.delete('shapeToolGroupButton');
    header.delete('signatureToolButton');
    header.delete('freeTextToolButton');
    header.delete('stickyToolButton');
    header.delete('miscToolGroupButton');
    header.delete('eraserToolButton');
  });

  // open notes panel by default
  instance.openElements(['notesPanel']);

  document.getElementById('select').onchange = function(e) {
    instance.loadDocument(e.target.value);
  };

  document.getElementById('file-picker').onchange = function(e) {
    var file = e.target.files[0];
    if (file) {
      instance.loadDocument(file);
    }
  };

  document.getElementById('url-form').onsubmit = function(e) {
    e.preventDefault();
    instance.loadDocument(document.getElementById('url').value);
  };
});
