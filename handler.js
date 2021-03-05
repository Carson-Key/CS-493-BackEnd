'use strict';
const express = require("serverless-express/express");
const handler = require("serverless-express/handler");
var AWS = require("aws-sdk");
const path = require('path');

var app = express();
const awsconfig = {region: 'us-west-2'}
AWS.config.update(awsconfig);

app.get('/song', function (req, res) {
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const bucketParams = {
    Bucket : 'cs493-aws-cli',
    Key: req.query.title + ".mp3"
  };

  s3.getObject(bucketParams, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      res.send("https://" + bucketParams.Bucket + ".s3-" + awsconfig.region + ".amazonaws.com/" + bucketParams.Key);
    }
  });
});

app.get('/artistList', function (req, res) {
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
        let artist;
        let album;
        let song;
        let key;

        if (path.extname(item.Key) === ".mp3") {
          if (pathSplit[2]) {
            artist = pathSplit[0];
            album = pathSplit[1];
            song = pathSplit[2];
            key = artist + "/" + album + "/" + song
          } else if (pathSplit[1]) {
            artist = "No-Artist";
            album = pathSplit[0];
            song = pathSplit[1];
            key = album + "/" + song
          } else {
            artist = "No-Artist";
            album = "No-Album";
            song = pathSplit[0];
            key = song
          }
          let artistObject = {...artists[artist]};
          let songObject = {}
          var params = {Bucket: bucketParams.Bucket, Key: key, Expires: 900};
          const url = s3.getSignedUrl('getObject', params);
  
          songObject["song" + (i + 1)] = {
            title: path.basename(song, ".mp3"),
            url: url
          }
          artistObject[album] = {...artistObject[album], ...songObject};
  
          artists[artist] = artistObject;
        }
      })
      res.send(artists);
    }
  });
});

app.get('/genres', function (req, res) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});

  var params = {
    TableName : "music",
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames:{
        "#pk": "pk"
    },
    ExpressionAttributeValues: {
        ":pk": "genre"
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      let returnedGenres = []
      data.Items.forEach((genre) => {
        returnedGenres.push(genre.attributes.name)
      })
      res.send(returnedGenres);
    }
  });
});

app.get('/artist/by/genre', function (req, res) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});

  var params = {
    TableName : "music",
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames:{
        "#pk": "pk"
    },
    ExpressionAttributeValues: {
        ":pk": "genre#" + req.query.genre
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      let returnedGenres = []
      data.Items.forEach((genre) => {
        returnedGenres.push(genre.attributes.name)
      })
      res.send(returnedGenres);
    }
  });
});

app.get('/albums/for/artist', function (req, res) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});

  var params = {
    TableName : "music",
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames:{
        "#pk": "pk"
    },
    ExpressionAttributeValues: {
        ":pk": "artist#" + req.query.artist
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      let returnedGenres = []
      data.Items.forEach((genre) => {
        returnedGenres.push(genre.attributes.name)
      })
      res.send(returnedGenres);
    }
  });
});

app.get('/songs/for/album', function (req, res) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});

  var params = {
    TableName : "music",
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames:{
        "#pk": "pk"
    },
    ExpressionAttributeValues: {
        ":pk": "album#" + req.query.album
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      let returnedGenres = []
      data.Items.forEach((genre) => {
        returnedGenres.push(genre.attributes.name)
      })
      res.send(returnedGenres);
    }
  });
});

module.exports.api = handler(app);