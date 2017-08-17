'use strict'

const https = require("https");

const getImages = function(userQuery, offset, callback) {
  let queryURL = `/customsearch/v1?key=${process.env.GOOGLE_CS_API_KEY}`;
  queryURL += `&cx=${process.env.GOOGLE_CS_Engine_ID}`
  queryURL += "&searchType=image";
  queryURL += "&fields=queries/nextPage(startIndex),items(link,snippet,image/thumbnailLink,image/contextLink)"
  queryURL += `&q=${userQuery}`;
  // For pagination, set start index using the offset variable
  queryURL += offset ? `&start=${offset}` : "&start=1";

  let options = {
    host: "www.googleapis.com",
    port: 443,
    path: queryURL,
    method: "GET"
  };

  const req = https.request(options, function(res) {
    let data = "";
    console.log(options.host + ":" + res.statusCode);
    res.setEncoding("utf8");
    res.on("data", function(chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(res.statusCode, data);
    });
  });

  req.on("error", function(err) {
    console.log("error: " + err.message);
  });

  req.end();
};

module.exports = getImages;