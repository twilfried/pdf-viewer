// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link DocumentViewer: https://www.pdftron.com/api/web/CoreControls.DocumentViewer.html
// @link AnnotationManager: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html
// @link AnnotationManager.drawAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#drawAnnotations__anchor
// @link Annotations: https://www.pdftron.com/api/web/Annotations.html

WebViewer(
  {
    path: '../../../lib',
    pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
    initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/form1.pdf',
  },
  document.getElementById('viewer')
).then(function(instance) {
  var docViewer = instance.docViewer;
  var annotManager = instance.annotManager;
  var Annotations = instance.Annotations;

  docViewer.on('documentLoaded', function() {
    var pageCount = docViewer.getPageCount();
    var defaultStyles = Annotations.WidgetAnnotation.getCustomStyles;
    var defaultContainerStyles = Annotations.WidgetAnnotation.getContainerCustomStyles;
    var customStyles = function(widget) {
      if (widget instanceof Annotations.TextWidgetAnnotation) {
        if (widget.fieldName === 'f1-1') {
          return {
            'background-color': 'lightgreen',
          };
        }
        return {
          'background-color': 'lightblue',
          color: 'brown',
        };
      }
      if (widget instanceof Annotations.PushButtonWidgetAnnotation) {
        return {
          'background-color': 'red',
          color: 'white',
        };
      }
    };

    var customContainerStyles = function(widget) {
      if (widget instanceof Annotations.WidgetAnnotation) {
        return {
          border: '2px solid green',
        };
      }
    };

    document.getElementById('form').onchange = function(e) {
      if (e.target.id === 'custom') {
        // Change styles for widget annotations
        Annotations.WidgetAnnotation.getCustomStyles = customStyles;
        Annotations.WidgetAnnotation.getContainerCustomStyles = customContainerStyles;
      } else {
        Annotations.WidgetAnnotation.getCustomStyles = defaultStyles;
        Annotations.WidgetAnnotation.getContainerCustomStyles = defaultContainerStyles;
      }
      for (var i = 0; i < pageCount; i++) {
        // Redraw canvas
        annotManager.drawAnnotations(i + 1, null, true);
      }
    };
  });
});
