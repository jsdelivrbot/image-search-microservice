'use strict';

const fs = require('fs');
const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const test = require('assert');
const https = require("https");

// Connect to database first
MongoClient.connect(process.env.DATABASE_URL, function(err, db) {
  test.equal(null, err);
  console.log("Successfully connected to MongoDB.");
  
  
  const getImages = function(userQuery, offset, callback) {
    console.log("getImages called");
    let queryURL = `/customsearch/v1?key=${process.env.GOOGLE_CS_API_KEY}`;
    queryURL += `&cx=${process.env.GOOGLE_CS_Engine_ID}`
    queryURL += "&searchType=image";
    queryURL += "&fields=items(link,snippet,image/thumbnailLink,image/contextLink)"
    queryURL += `&q=${userQuery}`;
    queryURL += offset ? `&num=${offset}` : "&num=10";
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
  
  // Routes
  app.use('/public', express.static(process.cwd() + '/public'));
  
  app.get('/', (function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }));

  app.get('/api/search/:query', (function(req, res) {
    // Replace whitespace with %20
    const userQuery = req.params.query.replace(" ", "%20");
    
    const offset = req.query.offset;
    
    
    // Search for images
    // Send search results as JSON factoring in the offset request
    getImages(userQuery, offset, function(responseCode, data) {
      const parsedData = JSON.parse(data).items;
      let results = [];
      
      for (let i = 0; i < parsedData.length; i++) {
        let image = {
          url: parsedData[i].link,
          snippet: parsedData[i].snippet,
          thumbnail: parsedData[i].image.thumbnailLink,
          context: parsedData[i].image.contextLink
        }
        results.push(image);
      }
      
      res.send(results);
    });
    
    // Add document to imageSearches collection
    db.collection("imageSearches").insertOne({"term": userQuery , "when": new Date()}, function(err, result) {
      test.equal(null, err);
      test.equal(1, result.insertedCount);
      console.log(result.insertedCount + " new doc has been inserted into the db");
    });
    
  }));
  
  app.get('/api/recent', (function(req, res) {
    // Query the imageSearches collection for all documents
    // Leave out _id field in returned docs
    // Present in decending date order
    db.collection("imageSearches").find({}, {"_id": 0}).toArray(function (err, docs) {
      if(err) {
        console.log("A db query error occured");
        res.send("A db query error occured");
      }
      let results;
      if (docs.length > 0) {
        results = docs;
      } else {
        results = "No recent searches";
      }
      res.send(results);
    });
  }));
  
  // Respond not found to all the wrong routes
  app.use(function(req, res, next){
    res.status(404);
    res.type('txt').send('Not found');
  });

  // Error Middleware
  app.use(function(err, req, res, next) {
    if(err) {
      res.status(err.status || 500)
        .type('txt')
        .send(err.message || 'SERVER ERROR');
    }  
  })

  app.listen(process.env.PORT, function () {
    console.log('Node.js listening on port ' + process.env.PORT);
  });
  
});

