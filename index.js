'use strict';

const fs = require('fs');
const w2v = require( 'word2vec' );
const porterStemmer = require('stemmer');

module.exports = {
  cleanText,
  stemHelper,
  word2vec,
  word2phrase
};

function handleErr(err) {
 if (err) 
   console.error(err, err.stack); 
}

function word2vec(params) {
  return function(obj) {
    var {corpus, vocab, stopwordsSet} = obj;
    return new Promise(function(resolve, reject) {
      var {filename, id} = toTextFile(corpus);
      var filenameModel = id+'-model.txt';
      var cb = function(code) {
        console.log(`exit(${code})`);
        fs.unlink(filename, d => console.log(`tmp file: ${filename} deleted`));
        if (code === 0) {
          w2v.loadModel(filenameModel, function(err, model) {
            if (err) return reject(err);
            obj.model = model;
            obj.modelPath = filenameModel;
            return resolve(obj);
          });
        } else reject(code);
      };
      w2v.word2vec(filename, filenameModel, params, cb);
    }).catch(handleErr);
  };
}

function word2phrase(params) {
  return function(corpus) {
    return new Promise(function(resolve, reject) {
      var {filename, id} = toTextFile(corpus);
      var filenamePhrase = id+'-phrases.txt';
      var cb = function(code) {
        console.log(`exit(${code})`);
        fs.unlink(filename, d => console.log(`tmp file: ${filename} deleted`));
        if (code === 0) {
          let res = fs.readFileSync(filenamePhrase, {encoding: 'utf8'});
          fs.unlink(filenamePhrase, d => console.log(`tmp file: ${filenamePhrase} deleted`));
          return resolve(res);
        }
        reject(code);
      };
      w2v.word2phrase(filename, filenamePhrase, params, cb);    
    }).catch(handleErr);
  };
}

function toTextFile(corpus){
  var text = typeof corpus === 'string' ? corpus : corpus.map(d=>d.join(' ').trim()).join('\n').trim();
  var id = Date.now();
  var filename = id+'-corpus.txt';
  fs.writeFileSync(filename, text);
  return {id, filename};
}


function cleanText({stemmer, stopwords, minCount = 5}) {
  return function(text) {
    var vocab, mapFn, stopwordsSet;
    if (stemmer) {
      stemmer = typeof stemmer === 'function' ? stemmer : porterStemmer;
      stopwords = stopwords && stopwords.map(cleanSentence).map(stemmer);
      stopwordsSet = new Set(stopwords);
      vocab = stemHelper(stemmer, stopwordsSet);
      mapFn = function(d) {
        return sentence2tokens(d)
          .map(w => vocab.stem(w))
          .filter(token => !stopwordsSet.has(token) && vocab.keep(token, minCount));
      };
    } else {
      stopwords = stopwords && stopwords.map(cleanSentence);
      stopwordsSet = new Set(stopwords);
      vocab = stemHelper(d => d, stopwordsSet);
      mapFn = function(d) {
        return sentence2tokens(d)
          .map(w => vocab.stem(w))
          .filter(token => !stopwordsSet.has(token) && vocab.keep(token, minCount));
      };
    }
    
    
    var corpus = text.split(/[\n\.;]{1,}/g)
      .filter(d => d.trim())
      .map(mapFn)
      .filter(d=>d && d.length > 0);
    
    return {corpus, vocab, stopwordsSet};
  };

}

function sentence2tokens(sentence) {
  return cleanSentence(sentence)
    .split(' ')
    .filter(d => d);
}

function cleanSentence(sentence) {
  return sentence.trim().toLowerCase() // to lower case
    .replace(/[,:\(\)\{\}\[\]]{1,}/gm, ' ') // pad connectors with space
    .replace(/ {1,}/gm, ' ') // remove extra space
    .replace(/[^a-z _]/gmi, '')
    .trim(); // keep alpha numeric only
}

function stemHelper(stemmer = porterStemmer, stopwordsSet = new Set()) {
  var map = Object.create(null);
  var tf = Object.create(null);
  var original = function(stemmed) {
    return map[stemmed];
  };
  var stem = function(word, ignore) {
    var stemmed = stemmer(word.trim());
    if (!ignore && !stopwordsSet.has(stemmed)) {
      map[stemmed] = map[stemmed] || new Set();
      map[stemmed].add(word);
      tf[stemmed] = tf[stemmed] || 0;
      ++tf[stemmed];
    }
    return stemmed;
  };
  var keep = function(stemmed, minCount = 5) {
    return tf[stemmed] >= minCount;
  };
  
  return {stem, original, map, tf, keep};
}