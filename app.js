var request = require('request');
var cheerio = require('cheerio');
var twit = require('twit');
var storage = require('node-persist');
var config = require('./config.js');

var t = new twit({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token: config.access_token,
  access_token_secret: config.access_token_secret
});

storage.initSync();

stations = [
  { id: 2039, name: 'Diglis' },
  { id: 2092, name: 'Barbourne' }
]

function pad(number){
  if(number < 10) return '0' + number;
  return number;
}

function scrape(){
  stations.forEach(function(station){
    var url = 'http://www.environment-agency.gov.uk/homeandleisure/floods/riverlevels/120744.aspx?stationId=' + station.id;
    request(url, function(err, res, body){
      $ = cheerio.load(body);
      var unparsedLevel = $('#station-detail-left .plain_text p').eq(0).text();
      var unparsedTime = $('#station-detail-left .plain_text p').eq(1).text();
      var rawTimeString = unparsedTime.split('This measurement was recorded at ')[1].split('.')[0];
      var timeString = rawTimeString.split(' on ')[0];
      var timeArray = timeString.split(':');
      var dateString = rawTimeString.split(' on ')[1];
      var dateArray = dateString.split('/');

      // parse date data into date object
      var date = new Date();
      date.setFullYear(dateArray[2]);
      date.setHours(timeArray[0]);
      date.setMinutes(timeArray[1]);
      date.setMonth(dateArray[1]-1);
      date.setDate(dateArray[0]);
      date.setSeconds(0);
      date.setMilliseconds(0);

      // fetch saved data from this station
      var saved = storage.getItem(station.name);

      if(!saved){
        saved = {}
        saved.date = new Date(0);
        saved.peak = 0;
        saved.peakDate = new Date(0);
      } else {
        saved.date = new Date(saved.date);
        saved.peakDate = new Date(saved.peakDate);
      }

      // see if we have any new data, if we don't, stop everything here
      if(saved.date.getTime() == date.getTime()){
        console.log('No updates for '+station.name);
        return;
      }

      // parse river level data
      var level = unparsedLevel.split(' is ')[1].split(' metres.')[0];

      var toSave = {
        date: date
      }

      if(saved.peakDate.getDate() != date.getDate() && saved.peakDate < date || saved.peak < level){
        console.log('New daily peak');
        toSave.peak = level;
        toSave.peakDate = date;
      } else {
        toSave.peak = saved.peak;
        toSave.peakDate = saved.peakDate;
      }

      storage.setItem(station.name, toSave);

      // create string for twitter
      var tweet = '#' + station.name + ': ' + level + 'm at ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + '; Daily Peak: ' + saved.peak + 'm at ' + pad(toSave.peakDate.getHours()) + ':' + pad(toSave.peakDate.getMinutes()) + ' #worcesterfloods';

      //console.log(unparsedLevel, unparsedTime);
      console.log(tweet);

      t.post('statuses/update', { status: tweet }, function(err, reply) {
        //console.log(err, reply);
      });

    });
  });
}

scrape();
setInterval(scrape, 5 * 60 * 1000);
