'use strict';

const fs = require('fs');
const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const test = require('assert');
const getImages = require('./lib/getImages.js');

// Connect to database first
MongoClient.connect(process.env.DATABASE_URL, function(err, db) {
  test.equal(null, err);
  console.log('Successfully connected to MongoDB.');
  
  // Routes
  app.use('/public', express.static(process.cwd() + '/public'));
  
  app.get('/', (function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }));

  app.get('/api/search/:query', (function(req, res) {
    // Replace whitespace in search query with %20
    const userQuery = req.params.query.replace(' ', '%20');
    // Store offset GET variable for pagination purposes
    const offset = req.query.offset;
        
    // Search for images
    // Send search results as JSON factoring in the offset request
    getImages(userQuery, offset, function(responseCode, data) {
      const parsedData = JSON.parse(data);
      let results = [];
      
      // Add document to imageSearches collection
      db.collection('imageSearches').insertOne({'term': req.params.query , 'when': new Date()}, function(err, result) {
        test.equal(null, err);
        test.equal(1, result.insertedCount);
        console.log(result.insertedCount + ' new doc has been inserted into the db');
      });
      
      if (parsedData.items) {
        for (let i = 0; i < parsedData.items.length; i++) {
          let image = {
            url: parsedData.items[i].link,
            snippet: parsedData.items[i].snippet,
            thumbnail: parsedData.items[i].image.thumbnailLink,
            context: parsedData.items[i].image.contextLink
          }
          results.push(image);
        }
        res.send(results);
      } else {
        res.send('No images to display');
      }
      
    });
    
  }));
  
  app.get('/api/recent', (function(req, res) {
    // Query the imageSearches collection for all documents
    // Leave out _id field in returned docs
    // Present in decending date order
    db.collection('imageSearches').find({}, {'_id': 0}).sort({'when': -1}).toArray(function (err, docs) {
      if(err) {
        console.log('A db query error occured');
        res.send('A db query error occured');
      }
      let results;
      if (docs.length > 0) {
        results = docs;
      } else {
        results = 'No recent searches';
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
