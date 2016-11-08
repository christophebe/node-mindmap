'use strict';

const fs = require('fs');
const mindMap = require('../index.js');
const cleanText = mindMap.cleanText;
const word2phrase = mindMap.word2phrase;
const word2vec = mindMap.word2vec;


const raw = fs.readFileSync('./thegiftofmagi.txt', {encoding: 'utf8'});
const stopwords = fs.readFileSync('./stopwords.txt', {encoding: 'utf8'})
  .trim()
  .split('\n')
  .map(d=>d.trim());

var stemmer = true;
var minCount = 3;
var threshold = 100;

word2phrase({minCount, threshold})(raw)
  .then(cleanText({stopwords, stemmer, minCount}))
  .then(word2vec({
    size: 100,
    minCount: minCount,
    window: 5
  }))
  .then(display, handleErr)
  .catch(handleErr);
 
function handleErr(err) {
 if (err) 
   console.error(err, err.stack); 
}

function display({corpus, vocab, stopwordsSet, model, modelPath}) {
  const words = Object.keys(vocab.map);
  var i = 0;
  var n = 5;
  var word = words[i];
  var out = model.mostSimilar(word, 5);
  while (n) {
    word = words[++i];
    word = vocab.keep(word, minCount) && word;
    out = word && model.mostSimilar(word, 5);
    if (out) {
      --n;
      var similar = out.map(function(d) {
        return vocab.original(d.word) || d.word;
      });
      console.log(vocab.original(word));
      console.log(similar);
    }
  }
}