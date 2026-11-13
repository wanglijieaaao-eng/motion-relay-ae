'use strict';

function encodeRequest(operation, value) {
  var request = { operation: operation };
  if (value !== undefined) request.value = value;
  return JSON.stringify(request) + '\n';
}

module.exports = { encodeRequest: encodeRequest };
