var request = require('request');
var cheerio = require('cheerio');
var twit = require('twit');
var config = require('./config.js');

var t = new twit({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token: config.access_token,
  access_token_secret: config.access_token_secret
});

stations = [
  '2039', // Diglis
  '2092' // Barbourne
]

function scrape(){
  stations.forEach(function(station){
    var url = 'http://www.environment-agency.gov.uk/homeandleisure/floods/riverlevels/120744.aspx?stationId=' + station;
    request(url, function(err, res, body){
      $ = cheerio.load(body);
      var unparsedLevel = $('#station-detail-left .plain_text p').eq(0).html();
      var unparsedTime = $('#station-detail-left .plain_text p').eq(1).html();
      var rawTimeString = unparsedTime.split('This measurement was recorded at ')[1].split('.')[0];
      var timeString = rawTimeString.split(' on ')[0];
      var timeArray = timeString.split(':');
      var dateString = rawTimeString.split(' on ')[1];
      var dateArray = dateString.split('/');

      var time = new Date();
      time.setFullYear(dateArray[2]);
      time.setHours(timeArray[0]);
      time.setMinutes(timeArray[1]);
      time.setMonth(dateArray[1]-1);
      time.setDate(dateArray[0]);
      time.setSeconds(0);

      console.log(unparsedLevel, unparsedTime);

      t.post('statuses/update', { status: unparsedLevel + ' ' + unparsedTime + '#worcesterfloods' }, function(err, reply) {
        console.log(err, reply);
      });

    });
  });
}

setInterval(scrape, 5 * 60 * 1000);
