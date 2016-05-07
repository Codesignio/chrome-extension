var utils = {

  dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
  },


  elementsFromPoint(x, y){
    var elements = [], previousPointerEvents = [], current, i, d;

    // get all elements via elementFromPoint, and remove them from hit-testing in order
    while ((current = document.elementFromPoint(x, y)) && elements.indexOf(current) === -1 && current != null) {

      // push the element and its current style
      elements.push(current);
      previousPointerEvents.push({
        value: current.style.getPropertyValue('pointer-events'),
        priority: current.style.getPropertyPriority('pointer-events')
      });

      // add "pointer-events: none", to get to the underlying element
      current.style.setProperty('pointer-events', 'none', 'important');
    }

    // restore the previous pointer-events values
    for (i = previousPointerEvents.length; d = previousPointerEvents[--i];) {
      elements[i].style.setProperty('pointer-events', d.value ? d.value : '', d.priority);
    }

    // return our results
    return elements;
  },
  randomStr(length){
    return new Array(length).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<.5?"toString":"toUpperCase"]();});
  }
};

module.exports = utils;