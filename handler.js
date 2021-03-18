'use strict';
const express = require("serverless-express/express");
const handler = require("serverless-express/handler");
var AWS = require("aws-sdk");
const path = require('path');

var app = express();
app.use(express.json());
const awsconfig = {region: 'us-west-2'}
AWS.config.update(awsconfig);

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

app.get('/song', function (req, res) {
  var docClient = new AWS.DynamoDB.DocumentClient();
  let s3 = new AWS.S3({apiVersion: '2006-03-01'});

  var params = {
    TableName : "music",
    KeyConditionExpression: "#pk = :pk and #sk = :sk",
    ExpressionAttributeNames:{
        "#pk": "pk",
        "#sk": "sk"
    },
    ExpressionAttributeValues: {
        ":pk": "song",
        ":sk": req.query.song
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      res.send(err);
    } else {
      var params = {Bucket: 'cs493-aws-cli', Key: data.Items[0].attributes.s3ey, Expires: 900};
      const url = s3.getSignedUrl('getObject', params);
      res.send(url);
    }
  });
});

app.post('/play', function (req, res) {
  var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

  if (req.body) {
    if (!req.body.song && !req.body.album && !req.body.artist) {
      res.send({type: "error", message: "there was no song/album/artist"})
    } else {
      var params = {
       DelaySeconds: 10,
       MessageAttributes: {
         "song": {
          DataType: "String",
          StringValue: req.body.song
         },
         "album": {
          DataType: "String",
          StringValue: req.body.album
         },
         "artist": {
          DataType: "String",
          StringValue: req.body.artist
         },
       },
       MessageBody: "The song: " + req.body.song + " from the album: " + req.body.album + " created by the artist: " + req.body.artist + " was played",
       QueueUrl: "https://sqs.us-west-2.amazonaws.com/243732450758/play-music-queue"
     };

     sqs.sendMessage(params, function(err, data) {
      if (err) {
        res.send({type: "error", message: err});
      } else {
        res.send({type: "success", message: "The message with id " + data.MessageId + " was successfully published"});
      }
    });
    }
  }
});

app.post('/cloud', function (req, res) {
  if (req.body) {
    if (!req.body.song && !req.body.album && !req.body.artist) {
      res.send({type: "error", message: "there was no song/album/artist"})
    } else {
      var cloudwatchlogs = new AWS.CloudWatchLogs();

      var params = {
        logEvents: [
          {
            message: "The song: " + req.body.song + " from the album: " + req.body.album + " created by the artist: " + req.body.artist + " was played",
            timestamp: Date.now()
          },
        ],
        logGroupName: 'SongsPlayed',
        logStreamName: 'SongsAlbumsArtists'
      };
      cloudwatchlogs.putLogEvents(params, function(err, data) {
        if (err){
          res.send({type: "error", message: err})
        } else {
          res.send({type: "success", message: "log was successful"}); 
        }
      });
    }
  }
});

module.exports.api = handler(app);

module.exports.receivePlay = async (event, context) => {
  event.Records.forEach(record => {
    console.log({
      body: record.body, 
      attributes: {
        song: record.messageAttributes.song.stringValue,
        album: record.messageAttributes.album.stringValue,
        artist: record.messageAttributes.artist.stringValue
      }
    })
  });
}