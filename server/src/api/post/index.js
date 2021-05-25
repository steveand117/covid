/* eslint-disable no-underscore-dangle */

const routes = require('express').Router();
const mongoose = require('mongoose');
const {
  db: { name: dbName },
  api: { posts: { pageSize } },
} = require('../../util/config');

function bodyToFilter(body) {
  const {
    dates,
    topic,
    category,
    institutions,
    georgia,
    platforms,
  } = body || {};

  const filter = {};

  // dates
  const { from, to } = dates || {};
  if (from) {
    filter.authoredAt = { $gte: new Date(from) };
  }
  if (to) {
    filter.authoredAt = {
      ...filter.authoredAt,
      $lte: new Date(to),
    };
  }

  // topic
  if (topic) {
    filter.topics = topic;
  }

  // tags
  const includesTags = [];
  const excludesTags = [];

  if (category) includesTags.push(category);

  if (typeof institutions === 'boolean') {
    if (institutions) {
      includesTags.push('institutional');
    } else {
      excludesTags.push('institutional');
    }
  }

  if (typeof georgia === 'boolean') {
    if (georgia) {
      includesTags.push('georgia');
    } else {
      excludesTags.push('georgia');
    }
  }

  if (includesTags.length > 0) {
    filter.tags = { $all: includesTags };
  }
  if (excludesTags.length > 0) {
    filter.tags = {
      ...filter.tags,
      $nin: excludesTags,
    };
  }

  // platform
  if (Array.isArray(platforms) && platforms.length > 0) {
    filter.platform = { $in: platforms };
  }

  return filter;
}

routes.post('/:page', async (req, res) => {
  const MongoClient = mongoose.connection.client;
  const database = MongoClient.db(dbName);

  const { body, params } = req;
  if (typeof body !== 'object') {
    res.status(400).send();
    return;
  }

  const { page } = params;
  let pageNum = 0;
  try {
    pageNum = parseInt(page, 10);
  } catch (_) {
    res.status(400).send();
    return;
  }

  const filter = bodyToFilter(body);
  const postsCollection = database.collection('socialmediaposts');
  const posts = await postsCollection
    .find(filter)
    .skip(pageNum * pageSize)
    .limit(pageSize).toArray();
  res.status(200).send(posts);
});

module.exports = routes;
