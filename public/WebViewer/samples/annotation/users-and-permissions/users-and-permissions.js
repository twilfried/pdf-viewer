// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.openElements: https://www.pdftron.com/api/web/WebViewerInstance.html#openElements__anchor
// @link WebViewerInstance.setToolMode: https://www.pdftron.com/api/web/WebViewerInstance.html#setToolMode__anchor

// @link AnnotationManager: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html
// @link AnnotationManager.setCurrentUser: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#setCurrentUser__anchor
// @link AnnotationManager.getCurrentUser: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#getCurrentUser__anchor
// @link AnnotationManager.setIsAdminUser: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#setIsAdminUser__anchor
// @link AnnotationManager.setReadOnly: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#setReadOnly__anchor
// @link AnnotationManager.getAnnotationsList: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#getAnnotationsList__anchor
// @link AnnotationManager.showAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#showAnnotations__anchor
// @link AnnotationManager.hideAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#hideAnnotations__anchor

WebViewer(
  {
    path: '../../../lib',
    pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
    initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf',
  },
  document.getElementById('viewer')
).then(function(instance) {
  var annotManager = instance.annotManager;

  annotManager.setCurrentUser('Justin');
  annotManager.setIsAdminUser(true);
  instance.openElements(['notesPanel']);

  document.getElementById('justin').onchange = function() {
    annotManager.setCurrentUser('Justin');
    annotManager.setIsAdminUser(true);
    annotManager.setReadOnly(false);
    instance.setToolMode('AnnotationEdit');
  };

  document.getElementById('sally').onchange = function() {
    annotManager.setCurrentUser('Sally');
    annotManager.setIsAdminUser(false);
    annotManager.setReadOnly(false);
    instance.setToolMode('AnnotationEdit');
  };

  document.getElementById('brian').onchange = function() {
    annotManager.setCurrentUser('Brian');
    annotManager.setIsAdminUser(false);
    annotManager.setReadOnly(true);
    instance.setToolMode('AnnotationEdit');
  };

  document.getElementById('display').onchange = function(e) {
    var currentUser = annotManager.getCurrentUser();
    var allAnnotations = annotManager.getAnnotationsList().filter(function(annot) {
      return annot.Listable;
    });

    if (e.target.checked) {
      annotManager.showAnnotations(allAnnotations);
    } else {
      var annotationsToHide = allAnnotations.filter(function(annot) {
        return annot.Author !== currentUser;
      });
      annotManager.hideAnnotations(annotationsToHide);
    }
  };
});
