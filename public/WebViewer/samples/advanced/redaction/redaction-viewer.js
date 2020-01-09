// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.loadDocument: https://www.pdftron.com/api/web/WebViewerInstance.html#loadDocument__anchor
// @link WebViewerInstance.disableTools: https://www.pdftron.com/api/web/WebViewerInstance.html#disableTools__anchor
// @link WebViewerInstance.enableTools: https://www.pdftron.com/api/web/WebViewerInstance.html#enableTools__anchor
// @link WebViewerInstance.setToolMode: https://www.pdftron.com/api/web/WebViewerInstance.html#setToolMode__anchor

WebViewer(
  {
    path: '../../../lib',
    initialDoc: 'https://s3.amazonaws.com/pdftron/downloads/pl/legal-contract.pdf',
    fullAPI: true,
    enableRedaction: true,
  },
  document.getElementById('viewer')
).then(function(instance) {
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

  instance.disableTools();
  instance.enableTools(['AnnotationCreateRedaction']);
  instance.setToolMode('AnnotationCreateRedaction');
});
