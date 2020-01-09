$(function() {
  var $document = $(document); // noneed

  var pageCount = 0;
  var status = {
    NOT_STARTED: 0,
    QUEUED: 1,
    STARTED: 2,
    FINISHED: 3,
  };
  // used to keep track of whether we have loaded the page or not
  var pageStatus = [];
  // used to keep track of what order to render each page in
  var renderQueue = [];

  var isUndefined = function(val) {
    return typeof val === 'undefined';
  };

  // use instead of window.location.hash because of https://bugzilla.mozilla.org/show_bug.cgi?id=483304
  var getWindowHash = function() {
    var url = window.location.href;
    var i = url.indexOf('#');
    return i >= 0 ? url.substring(i + 1) : '';
  };

  var getQueryStringMap = function(useHash) {
    if (isUndefined(useHash)) {
      useHash = true;
    }
    var varMap = {};
    // if useHash is false then we'll use the parameters after '?'
    var queryString = useHash ? getWindowHash() : window.location.search.substring(1);
    var fieldValPairs = queryString.split('&');

    for (var i = 0; i < fieldValPairs.length; i++) {
      var fieldVal = fieldValPairs[i].split('=');
      varMap[fieldVal[0]] = fieldVal[1];
    }

    return {
      getBoolean: function(field, defaultValue) {
        var value = varMap[field];

        if (!isUndefined(value)) {
          value = value.toLowerCase();

          if (value === 'true' || value === 'yes' || value === '1') {
            return true;
          }
          if (value === 'false' || value === 'no' || value === '0') {
            return false;
          }
          // convert to boolean
          return !!field;
        }
        if (isUndefined(defaultValue)) {
          return null;
        }
        return defaultValue;
      },

      getString: function(field, defaultValue) {
        var value = varMap[field];

        if (!isUndefined(value)) {
          return decodeURIComponent(value);
        }
        if (isUndefined(defaultValue)) {
          return null;
        }
        return defaultValue;
      },
    };
  };

  var queryParams = getQueryStringMap();

  // get the document location from the query string (eg ?d=/files/myfile.xod)
  var docLocation = queryParams.getString('d');

  if (docLocation === null) {
    return;
  }

  var renderData;
  window.loadDocument(docLocation).then(function(renderInfo) {
    renderData = renderInfo;
    $document.trigger('documentLoaded');
  });

  function addSlide(pageIndex) {
    var slide = $('<section>')
      .attr('id', 'page' + pageIndex)
      .addClass('slide');
    slide.append($('<div class="loading">'));
    $('body').append(slide);
  }

  function loadCanvas(pageIndex) {
    if (pageIndex < 0 || pageIndex >= pageCount) {
      return;
    }

    var renderNextPage = function() {
      var pageIndex = renderQueue[0];
      pageStatus[pageIndex] = status.STARTED;

      window.loadCanvasAsync(renderData, pageIndex + 1).then(function(canvas) {
        pageStatus[pageIndex] = status.FINISHED;
        var $canvas = $(canvas);
        $canvas.addClass('canvasPage');

        var pageContainer = $('#page' + pageIndex); // obj that contains slides
        pageContainer.append($canvas);
        pageContainer.find('.loading').remove();

        // trigger page rescale
        $.deck('enableScale'); // mayneed

        // make sure page is centered for very large page sizes by using a negative margin
        var widthDiff = parseFloat($canvas.css('width')) - pageContainer.find('.deck-slide-scaler').width();
        // console.log("widthDiff = " + widthDiff);
        // if (widthDiff > 0) {
        $canvas.css('margin-left', -widthDiff / 2 + 'px');
        // }
        if (renderQueue.length > 1) {
          setTimeout(function() {
            renderQueue.shift();
            renderNextPage();
          }, 0);
        } else {
          renderQueue.shift();
        }
      });
    };

    if (pageStatus[pageIndex] === status.NOT_STARTED) {
      renderQueue.push(pageIndex);
      pageStatus[pageIndex] = status.QUEUED;
      if (renderQueue.length === 1) {
        renderNextPage();
      }
    }
  }

  $document.on('documentLoaded', function() {
    pageCount = renderData.pagecount;
    for (var i = 0; i < pageCount; i++) {
      addSlide(i);
      pageStatus.push(status.NOT_STARTED);
    }

    // initially load the first three pages
    for (var j = 0; j < Math.min(pageCount, 10); j++) {
      loadCanvas(j);
    }

    // initialize the deck
    $.deck('.slide');
  });

  $document.on('deck.change', function(event, from, to) {
    // load the previous, current and next pages on a page change
    // note that if they are already loaded they won't be loaded again
    loadCanvas(to - 1);
    loadCanvas(to);
    loadCanvas(to + 1);
  });
});
// # sourceURL=viewer.js
