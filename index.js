var crypto = require('crypto');
var oauth = require('oauth');
var EasyXml = require('easyxml');
var xml2js = require('xml2js');
var inflect = require('inflect');

var XERO_BASE_URL = 'https://api.xero.com';
var XERO_API_URL = XERO_BASE_URL + '/api.xro/2.0';

function Xero(key, secret, oauth_token, oauth_token_secret, showXmlAttributes, customHeaders) {
    this.key = key;
    this.secret = secret;
    this.oauth_token = oauth_token;
    this.oauth_token_secret = oauth_token_secret;

    this.parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: showXmlAttributes !== undefined ? (showXmlAttributes ? false : true) : true,
        async: true
    });

    this.oa = new oauth.OAuth(null, null, key, secret, '1.0', null, 'HMAC-SHA1', null, customHeaders);
}

Xero.prototype.call = function (method, path, body) {
    var self = this;

    return new Promise((resolve, reject) => {
        var post_body = null;
        var content_type = null;
        if (method && method !== 'GET' && body) {
            if (Buffer.isBuffer(body)) {
                post_body = body;
            } else {
                var root = path.match(/([^\/\?]+)/)[1];
                post_body = new EasyXml({
                    rootElement: inflect.singularize(root),
                    rootArray: root,
                    manifest: true
                }).render(body);
                content_type = 'application/xml';
            }
        }
        var process = function (err, xml, res) {
            self.parser.parseString(xml, function (parseErr, json) {
                if (parseErr) {
                    return reject(parseErr);
                }

                if (err) {
                    // parse error from xml
                    var error = new Error(json.ApiException.Message);
                    error.errorType = json.ApiException.Type;
                    error.errorNumber = json.ApiException.ErrorNumber;
                    return reject(error);
                }

                if (json && json.Response && json.Response.Status !== 'OK') {
                    return reject(json);
                } else {
                    return resolve(json);
                }
            });
        };
        return self.oa._performSecureRequest(self.oauth_token, self.oauth_token_secret,
            method, XERO_API_URL + path, null, post_body, content_type, process);
    })
}

module.exports = Xero;
