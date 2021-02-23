'use strict';
const express = require("serverless-express/express");
const handler = require("serverless-express/handler");
var AWS = require("aws-sdk");
const path = require('path');

var app = express();
const awsconfig = {region: 'us-west-2'}
AWS.config.update(awsconfig);

// app.get('/song', function (req, res) {
//   let s3 = new AWS.S3({apiVersion: '2006-03-01'});
//   const bucketParams = {
//     Bucket : 'cs493-aws-cli',
//     Key: req.query.title + ".mp3"
//   };

//   s3.getObject(bucketParams, function(err, data) {
//     if (err) {
//       res.send(err);
//     } else {
//       res.send("https://" + bucketParams.Bucket + ".s3-" + awsconfig.region + ".amazonaws.com/" + bucketParams.Key);
//     }
//   });
// });

app.get('/', function (req, res) {
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const bucketParams = {
    Bucket : 'cs493-aws-cli'
  };
  let artists = {}

  s3.listObjects(bucketParams, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      data.Contents.forEach((item, i) => {
        const pathSplit = item.Key.split('/');
        const artist = pathSplit[0];
        const album = pathSplit[1];
        const song = pathSplit[2];
        let artistObject = {...artists[artist]};
        let songObject = {}

        songObject["song" + (i + 1)] = {
          title: path.basename(song, ".mp3"),
          url: "https://" + bucketParams.Bucket + ".s3-" + awsconfig.region + ".amazonaws.com/" + artist + "/" + album + "/" + song
        }
        artistObject[album] = {...artistObject[album], ...songObject};

        artists[artist] = artistObject;
      })
      res.send(artists);
    }
  });
});

module.exports.api = handler(app);