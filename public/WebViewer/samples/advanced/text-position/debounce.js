// eslint-disable-next-line
function debounce(fn, timeout) {
  var timeoutId;

  return function() {
    var args = arguments;
    var context = this;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {
      fn.apply(context, args);
    }, timeout);
  };
}
