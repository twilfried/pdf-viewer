// @link WebViewerInstance: https://www.pdftron.com/api/web/WebViewerInstance.html
// @link WebViewerInstance.loadDocument: https://www.pdftron.com/api/web/WebViewerInstance.html#loadDocument__anchor

// @link DocumentViewer: https://www.pdftron.com/api/web/CoreControls.DocumentViewer.html

// @link AnnotationManager: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html
// @link AnnotationManager.addAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#addAnnotations__anchor
// @link AnnotationManager.deleteAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#deleteAnnotations__anchor
// @link AnnotationManager.selectAnnotations: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#selectAnnotations__anchor
// @link AnnotationManager.getAnnotationsList: https://www.pdftron.com/api/web/CoreControls.AnnotationManager.html#getAnnotationsList__anchor

// @link Annotations: https://www.pdftron.com/api/web/Annotations.html

// @link Document: https://www.pdftron.com/api/web/CoreControls.Document.html
// @link Document.loadPageText: https://www.pdftron.com/api/web/CoreControls.Document.html#loadPageText__anchor
// @link Document.getTextPosition: https://www.pdftron.com/api/web/CoreControls.Document.html#getTextPosition__anchor

var viewerElement = document.getElementById('viewer');
WebViewer(
  {
    path: '../../../lib',
    pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
    initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/legal-contract.pdf',
  },
  viewerElement
).then(function(instance) {
  var docViewer = instance.docViewer;
  var annotManager = instance.annotManager;
  var Annotations = instance.Annotations;

  function renderCheckBoxes(pageCount) {
    var pagesDiv = document.getElementById('pages');
    var pageIndex;
    var checkboxes = [];

    for (pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      var input = document.createElement('input');
      /* eslint-disable prefer-template */
      input.id = 'page-' + pageIndex;
      input.type = 'checkbox';
      input.checked = false;
      input.value = pageIndex;

      checkboxes.push(input);

      var label = document.createElement('label');
      label.htmlFor = 'page-' + pageIndex;
      label.innerHTML = 'Page ' + (pageIndex + 1);

      var lineBreak = document.createElement('br');

      pagesDiv.appendChild(input);
      pagesDiv.appendChild(label);
      pagesDiv.appendChild(lineBreak);
    }

    return checkboxes;
  }

  function highlightText(searchText, pageIndex) {
    var doc = docViewer.getDocument();

    // gets all text on the requested page
    // see https://pdftron.com/api/web/CoreControls.Document.html#loadPageText__anchor
    doc.loadPageText(pageIndex, function(text) {
      var textStartIndex = 0;
      var textIndex;
      var annotations = [];

      // find the position of the searched text and add text highlight annotation at that location
      while ((textIndex = text.indexOf(searchText, textStartIndex)) > -1) {
        textStartIndex = textIndex + searchText.length;
        // gets quads for each of the characters from start to end index
        // see https://pdftron.com/api/web/CoreControls.Document.html#getTextPosition__anchor
        doc.getTextPosition(pageIndex, textIndex, textIndex + searchText.length, function(quads) {
          var annotation = new Annotations.TextHighlightAnnotation();
          annotation.Author = annotManager.getCurrentUser();
          annotation.PageNumber = pageIndex + 1;
          annotation.Quads = quads;
          annotation.StrokeColor = new Annotations.Color(0, 255, 255);
          annotations.push(annotation);
        });
      }
      annotManager.addAnnotations(annotations);
      annotManager.selectAnnotations(annotations);
    });
  }

  function removeHighlightedText(pageIndex) {
    var annotations = annotManager.getAnnotationsList().filter(function(annotation) {
      return annotation.PageNumber === pageIndex + 1;
    });
    annotManager.deleteAnnotations(annotations);
  }

  docViewer.on('documentLoaded', function() {
    var textInput = document.getElementById('text');
    var checkboxes = renderCheckBoxes(docViewer.getPageCount());

    checkboxes.forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
        var pageIndex = Number(checkbox.value);

        if (checkbox.checked && textInput.value) {
          highlightText(textInput.value, pageIndex);
        } else {
          removeHighlightedText(pageIndex);
        }
      });
    });

    // debounce loaded elsewhere
    // eslint-disable-next-line
    textInput.addEventListener(
      'input',
      debounce(function() {
        checkboxes.forEach(function(checkbox) {
          var pageIndex = Number(checkbox.value);

          if (checkbox.checked) {
            removeHighlightedText(pageIndex);

            if (textInput.value) {
              highlightText(textInput.value, pageIndex);
            }
          }
        });
      }, 200)
    );

    // highlight search text in the first page by default
    checkboxes[0].checked = true;
    highlightText(textInput.value, 0);
  });
});
