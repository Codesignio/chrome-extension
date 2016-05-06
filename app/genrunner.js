function genRunner(gen) {

  return new Promise((resolve, reject)=> {
    onFulfilled();

    function onFulfilled(res) {
      var ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      return next(ret);
    }


    function onRejected(err) {
      var ret;
      try {
        ret = gen.throw(err);
      } catch (e) {
        return reject(e);
      }
      return next(ret);
    }


    function next(ret) {
      if (ret.done) return resolve(ret.value);

      var returnedValue = ret.value;

      if (typeof returnedValue == 'function') {
        returnedValue = new Promise((resolve, reject)=> {
          returnedValue(function (err, res) {
            if (err) {
              reject(err)
            } else {
              resolve(res);
            }
          })
        })
      }

      if (returnedValue && typeof returnedValue.then == 'function') {
        return returnedValue.then(onFulfilled, onRejected);
      }

      return onRejected(new TypeError('not a thunk or promise'));
    }
  })

}

module.exports = genRunner;
