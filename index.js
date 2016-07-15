'use strict';

//////////////////////////////
// Requires
//////////////////////////////
const express = require('express');

const path = require('path');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config/app.json', 'utf-8')).config;

const Instagram = require('instagram-node').instagram();
const Flickr = require('flickrapi');

const appEnv = require('./lib/env');
const renderer = require('./lib/render');

//////////////////////////////
// App Variables
//////////////////////////////
const app = express();

app.engine('html', renderer);
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));

//////////////////////////////
// Enable social apps config
//////////////////////////////

Instagram.use({
  access_token: config.instagram.access_token,  // eslint-disable-line camelcase
});

/* eslint-disable camelcase */

const flickrOptions = {
  api_key: config.flickr.key,
  secret: config.flickr.secret,
  user_id: config.flickr.user_id,
  access_token: config.flickr.access_token,
  access_token_secret: config.flickr.access_token_secret,
};

/* eslint-enable camelcase */

//////////////////////////////
// Requests
//////////////////////////////
app.get('/', (req, res) => {
  res.render('index');
});

// Get images from instagram
// app.get('/instagram/photo', (req, res) => {
// });

// Get images from flickr
app.get('/flickr/photo/search', (req, res) => {
  const queryOptions = {};
  const querys = ['lat', 'lon', 'tags', 'tag_mode', 'text', 'sort', 'accuracy', 'media', 'has_geo', 'radius', 'radius_units', 'extras', 'per_page', 'page'];
  for (const item of querys) {
    const key = req.query[item];
    if (typeof key !== 'undefined') {
      queryOptions[item] = key;
    }
  }

  queryOptions.api_key = flickrOptions.api_key; // eslint-disable-line camelcase

  Flickr.authenticate(flickrOptions, (err, flickr) => {
    if (err) {
      res.send('Error happens when get authentication from flickr.');
      res.status(500).end();

      return;
    }

    flickr.photos.search(queryOptions, (err, results) => {  // eslint-disable-line no-shadow
      if (err) {
        res.send('Error happens when fetching photos.');
        res.status(500).end();

        return;
      }

      if (!results) {
        res.status(404).end();

        return;
      }

      results.photos.photo.forEach((item, index) => {
        results.photos.photo[index].url = `https://www.flickr.com/photos/${item.owner}/${item.id}/`;  // eslint-disable-line no-param-reassign
      });

      res.json(results);
      res.status(200).end();
    });
  });
});

app.get('/flickr/photo/detail', (req, res) => {
  const photo_id = req.query.id;  // eslint-disable-line camelcase

  Flickr.authenticate(flickrOptions, (err, flickr) => {
    if (err) {
      res.send('Error happens when get authentication from flickr.');
      res.status(500).end();

      return;
    }

    flickr.photos.getInfo({
      photo_id,  // eslint-disable-line camelcase
    }, (err, result) => {  // eslint-disable-line no-shadow
      if (err) {
        res.send('Error happens when fetching detail information for a photo.');
        res.status(500).end();

        return;
      }

      if (!result) {
        res.status(404).end();

        return;
      }

      res.json(result);
      res.status(200).end();
    });
  });
});

app.get('/flickr/photo/place', (req, res) => {
  const woe_id = req.query.id;  // eslint-disable-line camelcase

  Flickr.authenticate(flickrOptions, (err, flickr) => {
    if (err) {
      res.send('Error happens when get authentication from flickr.');
      res.status(500).end();

      return;
    }

    flickr.places.getInfo({
      woe_id,  // eslint-disable-line camelcase
    }, (err, result) => {  // eslint-disable-line no-shadow
      if (err) {
        res.send('Error happens when fetching place information for a photo.');
        res.status(500).end();

        return;
      }

      if (!result) {
        res.status(404).end();

        return;
      }

      res.json(result);
      res.status(200).end();
    });
  });
});

//////////////////////////////
// Start the server
//////////////////////////////
app.listen(appEnv.port, () => {
  // Mean to console.log out, so disabling
  console.log(`Server starting on ${appEnv.url}`); // eslint-disable-line no-console
});
