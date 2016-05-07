chrome.extension.onRequest.addListener(function(request, sender, callback){
    if (request.msg === 'scrollPage') {
        getPositions(callback);
    }

    if(request.msg === 'processEnd'){
      window.clearTimeout(cleanUpTimeout);
      processArrangements();
    }
});

function getPositions(callback) {
  chrome.extension.onRequest.addListener(function(request, sender, callback){

    if(request.msg === 'processEnd'){
      window.clearTimeout(cleanUpTimeout);
      processArrangements();
    }
  });


    var fullWidth = document.body.scrollWidth,
        fullHeight = document.body.scrollHeight,
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        originalX = window.scrollX,
        originalY = window.scrollY,
        originalOverflowStyle = document.documentElement.style.overflow,
        arrangements = [],

        scrollPad = 200,
        yDelta = windowHeight - (windowHeight > scrollPad ? scrollPad : 0),
        xDelta = windowWidth,
        yPos = fullHeight - windowHeight,
        xPos,
        numArrangements;

    if (fullWidth <= xDelta + 1) {
        fullWidth = xDelta;
    }

    document.documentElement.style.overflow = 'hidden';

    while (yPos > -yDelta) {
        xPos = 0;
        while (xPos < fullWidth) {
            arrangements.push([xPos, yPos]);
            xPos += xDelta;
        }
        yPos -= yDelta;
    }

    numArrangements = arrangements.length;

    function cleanUp() {
        document.documentElement.style.overflow = originalOverflowStyle;
        window.scrollTo(originalX, originalY);
    }

  var cleanUpTimeout;

    function processArrangements() {
        if (!arrangements.length) {
            cleanUp();
            if (callback) {
                callback();
            }
            return;
        }

        var next = arrangements.shift(),
            x = next[0], y = next[1];

        window.scrollTo(x, y);

        var data = {
            msg: 'capturePage',
            x: window.scrollX,
            y: window.scrollY,
            complete: (numArrangements-arrangements.length)/numArrangements,
            totalWidth: fullWidth,
            totalHeight: fullHeight,
            devicePixelRatio: window.devicePixelRatio
        };

        window.setTimeout(function() {
            cleanUpTimeout = window.setTimeout(cleanUp, 1250);
            chrome.runtime.sendMessage(data);

        }, 50);
    };

  processArrangements();
}
