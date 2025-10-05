var request = require('request');
var httpProxy = require('http-proxy');

var _apiDomain;
var _apiPort;
var _apiSecret;
var _apiClientTargetId;
var _accessToken;

var poglyadApiClient = function(options){
  _apiDomain 		= options.apiDomain || '';
  _apiPort 		= options.apiPort || '';
  _apiSecret 	= options.apiSecret || '';

  return poglyadApiClient;
};

/**
 * Config proxy middleware
 *
 * Register as Express middleware after coockies intialization.
 * Example:
 *   app.use('/api', poglyadApiClient.proxy);
 *
 * @param {
 * @param 	options.expressInstance
 * @param 	options.apiPath
 * @param 	options.apiDomain
 * @param }
 */
poglyadApiClient.proxy = function() {
  var url = 'http://' + _apiDomain + ':' + _apiPort;

  var proxyOptions = {
    target: url,
    changeOrigin: true,
  };

  var proxy = httpProxy.createProxyServer(proxyOptions);
  proxy.on('proxyReq', function (proxyReq, req, res, options) {
    if (_apiSecret) {
      proxyReq.setHeader('ApiSecret', _apiSecret);
    }

    if (req.session) {
      if (req.session.accessToken) {
        proxyReq.setHeader('Authorization', 'Bearer ' + req.session.accessToken);
      }

      if (req.session.apiClientTargetId) {
        proxyReq.setHeader('ApiClientTargetId', req.session.apiClientTargetId);
      }
    }
  });

  return function(req, res, next) {
    proxy.web(req, res);
  }
};


/**
 * Send request for configured API
 *
 * @param method
 * @param url
 * @param params
 * @param reqOrigin original request object from browser
 * @param callback
 */
poglyadApiClient.request = function(method, url, params, reqOrigin, callback){
  if(!_apiDomain) throw new Error('Module poglyad-api-client not initialised correctly. "apiDomain" must be passed. See more at https://github.com/bodyaka/poglyad-api-client/blob/master/README.md');

  params = params || {};
  callback = callback || function(){};


  var _url = 'http://' + _apiDomain;
  if (_apiPort) {
    _url += ':' +  _apiPort;
  }

  _url += '/' + url;

  var options = {
    method: method,
    url: _url,
    headers: {},
    json: true
  };

  // handle _apiClientSource
  if (_apiSecret) {
    options.headers.ApiSecret = _apiSecret;
  }

  if (reqOrigin.session) {
    if (reqOrigin.session.accessToken) {
      options.headers.Authorization = 'Bearer ' + reqOrigin.session.accessToken;
    }

    if (reqOrigin.session.apiClientTargetId) {
      options.headers.ApiClientTargetId = reqOrigin.session.apiClientTargetId;
    }
  }

  // attach parameters to request
  if(method.toLowerCase() == 'get'){
    options.qs = params;
  }else{
    options.body = params;
  }

  // send request
  request(options, function(err, res, data) {
    if(data && data.error) {
      return callback(new Error('' + data.error.code + ':' + data.error.message), res, data);
    } else if(err) {
      return callback(err)
    } else if(res.statusCode >= 300) {
      return callback(new Error('' +res.statusCode + ':' + res.body), res, data);
    }

    callback(err, res, data);
  })
};

module.exports = poglyadApiClient;
