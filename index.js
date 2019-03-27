var axios = require('axios')

exports.requestSendingMiddleware = function requestSendingMiddleware (store) {
  return next => action => {
    const { payload, meta, type } = action
    // if its a network request
    // fire an action that indicates the request has
    // been sent
    if (payload && payload.then) {
      const requestSendingAction = {
        payload: null,
        type: type + 'Sent',
        meta
      }
      store.dispatch(requestSendingAction)
    }
    return next(action)
  }
}

exports.send = function send (namespace, fnName, data, baseUrl) {
    // HACK append a localStorage saved password onto every request as the security model for now
    const pw = localStorage.getItem('touchpoints_pw')
    return axios.post(`${baseUrl}/fn/${namespace}/${fnName}?pw=${pw}`, data)
        .then(res => {
            if (typeof res.data === "string" && res.data.indexOf("Error") > -1) {
                return Promise.reject(new Error(res.data))
            }
            return Promise.resolve(res.data)
        })
        .catch(err => {
            console.log(err)
        })
}

exports.hcMiddleware = function hcMiddleware (store) {
    return next => action => {
        const { type, meta } = action
        if (!(meta && meta.isHc)) return next(action)
        // the rest will be handled by redux-promises
        const baseUrl = meta.baseUrl || ''
        let sendRequest = send(meta.namespace, type, meta.data, baseUrl)
        sendRequest = meta.then ? sendRequest.then(meta.then) : sendRequest
        const newAction = Object.assign({},
          action,
          {
            payload: sendRequest
          },
          {
            meta: Object.assign({}, meta, { isHc: false })
          }
        )
        return next(newAction)
    }
}
