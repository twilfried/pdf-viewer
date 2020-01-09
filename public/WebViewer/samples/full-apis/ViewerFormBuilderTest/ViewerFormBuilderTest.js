(exports => {
  const PDFNet = exports.PDFNet;
  let dropPoint = {};

  // create new PDF
  const createNewPDF = async () => {
    console.log('Loading document...');
    await PDFNet.initialize();
    var doc = await PDFNet.PDFDoc.create();

    doc.initSecurityHandler();
    doc.lock();

    // define new page dimensions
    const pageRect = await PDFNet.Rect.init(0, 0, 612, 794);
    const page = await doc.pageCreate(pageRect);
    doc.pagePushBack(page);

    const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
    var blob = new Blob([docbuf], {
      type: 'application/pdf',
    });

    readerControl.loadDocument(blob, {
      filename: 'myfile.pdf',
    });
  };

  const convertAnnotToFormField = async () => {
    // initialize
    const docViewer = readerControl.docViewer;
    const annotManager = docViewer.getAnnotationManager();
    const annotationsList = [...annotManager.getAnnotationsList()];
    const currentDocument = docViewer.getDocument();

    await PDFNet.initialize();
    const pdfDoc = await currentDocument.getPDFDoc();

    await Promise.all(
      annotationsList.map(async (annot, index) => {
        let field;

        if (annot.custom) {
          console.log(annot.custom);

          // create a form field based on the type of annotation
          if (annot.custom.type === 'TEXT') {
            field = await pdfDoc.fieldCreateFromStrings(annot.getContents() + Date.now() + index, PDFNet.Field.Type.e_text, annot.custom.value, '');
          } else if (annot.custom.type === 'SIGNATURE') {
            field = await pdfDoc.fieldCreateFromStrings(annot.getContents() + Date.now() + index, PDFNet.Field.Type.e_signature, '', '');
          } else if (annot.custom.type === 'CHECK') {
            field = await pdfDoc.fieldCreateFromStrings(annot.getContents() + Date.now() + index, PDFNet.Field.Type.e_check, '', '');
          } else {
            // exit early for other annotations
            annotManager.deleteAnnotation(annot, false, true); // prevent duplicates when importing xfdf
            return;
          }

          // check if there is a flag
          if (annot.custom.flag === true) {
            field.setFlag(PDFNet.Field.Flag.e_read_only, true);
          }
        } else {
          // exit early for other annotations
          annotManager.deleteAnnotation(annot, false, true); // prevent duplicates when importing xfdf
          return;
        }

        // translate coordinates
        const annotRect = await annot.getRect();
        const setTopLeft = currentDocument.getPDFCoordinates(annot.getPageNumber() - 1, annotRect.x1, annotRect.y1);
        const setBottomRight = currentDocument.getPDFCoordinates(annot.getPageNumber() - 1, annotRect.x2, annotRect.y2);

        // create an annotation with a form field created
        const pageNumber = annot.getPageNumber();
        const newAnnot = await PDFNet.WidgetAnnot.create(pdfDoc, await PDFNet.Rect.init(setTopLeft.x, setTopLeft.y, setBottomRight.x, setBottomRight.y), field);

        // delete original annotation
        annotManager.deleteAnnotation(annot, false, true);

        // customize styles of the form field
        Annotations.WidgetAnnotation.getCustomStyles = function(widget) {
          if (widget instanceof Annotations.TextWidgetAnnotation) {
            return {
              'background-color': '#a5c7ff',
              color: 'white',
              'font-size': '20px',
            };
          }

          if (widget instanceof Annotations.SignatureWidgetAnnotation) {
            return {
              border: '1px solid #a5c7ff',
            };
          }
        };
        Annotations.WidgetAnnotation.getCustomStyles(newAnnot);

        // draw the annotation the viewer
        const page = await pdfDoc.getPage(pageNumber);
        await page.annotPushBack(newAnnot);
        await pdfDoc.refreshFieldAppearances();
      })
    );

    // import newly created form fields
    const fdfDoc = await pdfDoc.fdfExtract(PDFNet.PDFDoc.ExtractFlag.e_both);
    const xfdf = await fdfDoc.saveAsXFDFAsString();
    await annotManager.importAnnotations(xfdf);

    // refresh viewer
    docViewer.refreshAll();
    docViewer.updateView();
    docViewer.getDocument().refreshTextData();
    dropPoint = {};
  };

  // adding the annotation which later will be converted to form fields
  const addFormFieldAnnot = (type, name, value, flag) => {
    var docViewer = readerControl.docViewer;
    var annotManager = docViewer.getAnnotationManager();
    var zoom = docViewer.getZoom();
    var doc = docViewer.getDocument();
    const displayMode = docViewer.getDisplayModeManager().getDisplayMode();
    const page = displayMode.getSelectedPages(dropPoint, dropPoint);
    if (!!dropPoint.x && page.first == null) {
      return; // don't add field to an invalid page location
    }
    const pageIdx = page.first !== null ? page.first : docViewer.getCurrentPage() - 1;
    var pageInfo = doc.getPageInfo(pageIdx);
    const pagePoint = displayMode.windowToPage(dropPoint, pageIdx);

    var textAnnot = new Annotations.FreeTextAnnotation();
    textAnnot.PageNumber = pageIdx + 1;
    const rotation = docViewer.getCompleteRotation(pageIdx + 1) * 90;
    textAnnot.Rotation = rotation;
    if (type === 'CHECK') {
      textAnnot.Width = 50 / zoom;
      textAnnot.Height = 50 / zoom;
    } else if (rotation === 270 || rotation === 90) {
      textAnnot.Width = 50 / zoom;
      textAnnot.Height = 250 / zoom;
    } else {
      textAnnot.Width = 250 / zoom;
      textAnnot.Height = 50 / zoom;
    }
    textAnnot.X = (pagePoint.x || pageInfo.width / 2) - textAnnot.Width / 2;
    textAnnot.Y = (pagePoint.y || pageInfo.height / 2) - textAnnot.Height / 2;

    textAnnot.setPadding(new Annotations.Rect(0, 0, 0, 0));
    textAnnot.custom = {
      type,
      value,
      flag,
    };

    // set the type of annot
    textAnnot.setContents(name + '_' + type);
    textAnnot.FontSize = '' + 10.0 / zoom + 'px';
    textAnnot.FillColor = new Annotations.Color(211, 211, 211, 0.5);
    textAnnot.TextColor = new Annotations.Color(0, 165, 228);
    textAnnot.StrokeThickness = 1;
    textAnnot.StrokeColor = new Annotations.Color(0, 165, 228);
    textAnnot.TextAlign = 'center';
    textAnnot.Author = annotManager.getCurrentUser();

    annotManager.deselectAllAnnotations();
    annotManager.addAnnotation(textAnnot, true);
    annotManager.redrawAnnotation(textAnnot);
    annotManager.selectAnnotation(textAnnot);
    dropPoint = {};
  };

  const setDropPoint = dropPt => {
    dropPoint = {
      x: dropPt.x,
      y: dropPt.y,
    };
  };

  exports.addFormFieldAnnot = addFormFieldAnnot;
  exports.convertAnnotToFormField = convertAnnotToFormField;
  exports.createNewPDF = createNewPDF;
  exports.setDropPoint = setDropPoint;
})(window);
