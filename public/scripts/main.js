(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// create empty object to store all methods
var app = {};

// create empty objects/arrays on app object to store the information to be used later on
app.user = {};
app.destination = {};
app.weather = {};
app.currency = {};
app.POIs = [];
app.exchangeRate;
app.tours = [];
app.airport = {};
app.language = {};

// method to init Googlde Autocomplete;
// takes parameter of an id to target specific input tags
app.initAutocomplete = function (id) {
    new google.maps.places.Autocomplete(document.getElementById(id));
};

// most of the APIs we are requesting data from accept location info in the form of lat lng coords
// so we enter the user's input into Google geocoder to get lat and lng coords to use in other API requests
app.getDestinationInfo = function (location) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        // if there is no error, filter the result so that the component is a "country"
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            // out of the results of the filter, get the info and populate the app.destination object
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            app.getWeather(app.destination.lat, app.destination.lng);
            app.getCurrency(app.destination.countryCode);
            app.getCityCode(app.destination.lat, app.destination.lng);
            app.getLanguage(app.destination.countryCode);
            app.getAirports(app.destination.lat, app.destination.lng);
            console.log(app.destination.countryCode);
        } else {
            alert("Something went wrong." + status);
        }
    });
};

// ajax call to get weather
// takes lat and lng coords as parameters
app.getWeather = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/' + latitude + ',' + longitude,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    }).then(function (res) {
        // take result and pull desired information into app.weather object
        app.weather.conditions = res.daily.summary;
        app.weather.currentTemp = Math.round(res.currently.temperature);
        app.weather.icon = res.daily.icon;
        app.displayWeather(app.weather);
    });
};

// i found that the points of interest and tours request works better with a city code instead of lat and lng coords
// method to get city code from lat and lng to use in other ajax requests
app.getCityCode = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/detect-parents',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': latitude + ',' + longitude
        }
    }).then(function (res) {
        var data = res.data.places[0];

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            var cityCode = data.parent_ids[0];
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } else {
            // if the result is a city, just use that id in the other rquests
            var _cityCode = data.id;
            app.getPOIs(_cityCode);
            app.getTours(_cityCode);
        }
    });
};

// method to get POIs (points of interest);
app.getPOIs = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'tags_not': 'Airport',
            'parents': cityCode,
            'level': 'poi',
            'limit': 20
        }
    }).then(function (res) {
        var points = res.data.places;

        // we only want results that have an image and a descriptions (perex)
        var filteredPoints = points.filter(function (place) {
            return place.thumbnail_url && place.perex;
        });

        // if there are no results that have an image and a description, call the displayError function
        if (filteredPoints.length === 0) {
            app.displayError('poi', 'points of interest');
        } else {
            // take the first 3 items and push their properties onto the app.POIs object
            filteredPoints.forEach(function (point) {
                var place = {
                    'name': point.name,
                    'description': point.perex,
                    'photo': point.thumbnail_url
                };
                app.POIs.push(place);
            });
            app.displayPOIs(app.POIs);
        }
    });
};
//method to get closest airport
app.getAirports = function (lat, lng) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': lat + ',' + lng,
            'tags': 'Airport'
        }
    }).then(function (res) {
        // push the properties onto app.airport object
        app.airport.name = res.data.places[0].name;
        app.airport.description = res.data.places[0].perex;
        app.airport.photo = res.data.places[0].thumbnail_url;

        // call displayAirports using properties from ajax request
        app.displayAirports(app.airport);
    });
};

// method to get language
app.getLanguage = function (country) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + country,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.language.primary = res[0].languages[0].name;
        if (res[0].languages.length > 1) {
            app.language.secondary = res[0].languages[1].name;
        }
        app.displayLanguage(app.language);
    });
};

// 
app.getTours = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/tours/viator',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parent_place_id': cityCode
        }
    }).then(function (res) {
        var list = res.data.tours;
        var tours = list.filter(function (place) {
            return place.photo_url && place.url;
        });
        if (tours.length === 0) {
            app.displayError('tours', 'tours');
        } else {
            for (var i = 0; i < tours.length; i++) {
                var tour = {
                    name: tours[i].title,
                    photo: tours[i].photo_url,
                    url: tours[i].url
                };
                app.tours.push(tour);
            }
            app.displayTours(app.tours);
        }
    });
};

app.getCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.currency.code = res[0].currencies[0].code;
        app.currency.symbol = res[0].currencies[0].symbol;
        app.displayCurrency(app.currency);
    });
};

app.convertCurrency = function (userCurrency, destinationCurrency) {
    $.ajax({
        url: 'https://free.currencyconverterapi.com/api/v6/convert',
        method: 'GET',
        dataType: 'json',
        data: {
            q: userCurrency + '_' + destinationCurrency + ',' + destinationCurrency + '_' + userCurrency,
            compact: 'ultra'
        }
    }).then(function (res) {
        app.currency.exchangeRate = res[userCurrency + '_' + destinationCurrency];

        $('#currency h2').text('$1 ' + userCurrency + ' = ' + app.currency.symbol + ' ' + app.currency.exchangeRate.toFixed(2) + ' ' + destinationCurrency);
    });
};

app.displayError = function (divID, topic) {
    var title = '<h3>' + topic + '</h3>';
    $('#' + divID).append(title, '<h2>Sorry, we don\'t have detailed information about ' + topic + ' in this area. Try your search again in a nearby city or related area.</h2>');
};

app.displayCurrency = function (object) {
    $('#currency').find('i').toggle(false);
    var title = '<h3>Currency</h3>';
    var html = '<h2>The currency used is ' + object.symbol + ' ' + object.code + '</h2>';
    var input = '<form id="userCurrency"><input class="userCurrency  type="search" id="user" placeholder="Enter your location."><button class="submit">Convert</button></form>';
    $('#currency').append(title, html, input);
    app.getUserInfo();
};

app.getUserInfo = function () {
    app.initAutocomplete('user');
    $('#userCurrency').on('submit', function (e) {
        e.preventDefault();
        var userLocation = $('#user').val();
        app.getUserLocation(userLocation);
    });
};

app.getUserLocation = function (location) {
    new google.maps.places.Autocomplete(document.getElementById('user'));
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
        } else {
            alert('Sorry, something went wrong.' + status);
        }
        app.getUserCurrency(app.user.countryCode);
    });
};

app.getUserCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.user.code = res[0].currencies[0].code;
        app.convertCurrency(app.user.code, app.currency.code);
    });
};

app.displayLanguage = function (object) {
    $('#language').find('i').toggle(false);
    var title = '<h3>Language</h3>';
    var primary = '<h2>Primary</h2><h4>' + object.primary + '</h4>';
    var secondary = '<h2>Secondary</h2><h4>' + object.secondary + '</h4>';
    $('#language').append(title, primary);
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    }
};

app.displayAirports = function (object) {
    $('#airport').find('i').toggle(false);
    var title = '<h3>Closest Airport</h3>';
    var name = '<h4>' + object.name + '</h4>';
    $('#airport').append(title, name);
};

// method to display tours
// i realized when there's a lot of results, it's not ideal for mobile users
// so i tried some simple "pagination" when the screen width is less than 600px
// create 2 variables, one to act as a "counter" and one to dictate results per page
// when user clicks 'load more', it appends the next three results, removes the button, and appends a new button at the end of the new results
app.displayTours = function (array) {
    $('#tours').find('i').toggle(false);
    var title = '<h3>Top Tours</h3>';
    $('#tours').append(title);

    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#tours').append(loadMore);
        $('#tours').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i = counter; _i < counter + resultsPerPage; _i++) {
                var _div = $('<div class="clearfix hvr-shadow">');
                var _name = '<h2>' + array[_i].name + '<h2>';
                var _photo = '<img class="hvr-grow-shadow"  src="' + array[_i].photo + '">';
                var _link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

                var _text = $('<div>').append(_name, _link);
                _div.append(_photo, _text);
                $('#tours').append(_div);
            }
            $('#tours').append(loadMore);
        });

        // if screen width is not less than 600px, append elements normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + item.url + '">Book Now</a>';
            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        });
    }
};

// method to display points of interest
// same "pagination" system as tours
app.displayPOIs = function (array) {
    $('#poi').find('i').toggle(false);
    var title = '<h3>Points of Interest</h3>';
    $('#poi').append(title);
    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var desc = '<p>' + array[i].description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var text = $('<div>').append(name, desc);

            div.append(photo, text);
            $('#poi').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#poi').append(loadMore);

        $('#poi').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i2 = counter; _i2 < counter + resultsPerPage; _i2++) {
                var _div2 = $('<div class="clearfix hvr-shadow">');
                var _name2 = '<h2>' + array[_i2].name + '<h2>';
                var _desc = '<p>' + array[_i2].description + '</p>';
                var _photo2 = '<img class="hvr-grow-shadow" src="' + array[_i2].photo + '">';
                var _text2 = $('<div>').append(_name2, _desc);

                _div2.append(_photo2, _text2);
                $('#poi').append(_div2);
            }
            $('#poi').append(loadMore);
        });
        // else just append all the results normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var desc = '<p>' + item.description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var text = $('<div>').append(name, desc);
            div.append(photo, text);
            $('#poi').append(div);
        });
    }
};

app.displayWeather = function (object) {
    $('#weather').find('i').toggle(false);
    var degrees = '';
    var title = '<h3>Weather</h3>';
    var icon = '<canvas id="' + object.icon + '" width="80" height="80"></canvas>';
    if (app.destination.countryCode === 'US') {
        degrees = 'F';
    } else {
        degrees = 'C';
    }
    var html = '<h2>Currently:</h2> \n    <h4>' + object.currentTemp + '\xB0' + degrees + '</h4>\n        <p class="weatherText">' + object.conditions + '</p>';
    $('#weather').append(title, icon, html);
    app.loadIcons();
};

app.randomHero = function () {
    var i = Math.floor(Math.random() * 10) + 1;
    $('.splashPage').css({
        'background': 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("public/assets/hero' + i + '.jpg")',
        'background-position': 'center',
        'background-size': 'cover'
    });
};

app.loadIcons = function () {
    var icons = new Skycons({ "color": "black" });
    icons.set("clear-day", Skycons.CLEAR_DAY);
    icons.set("clear-night", Skycons.CLEAR_NIGHT);
    icons.set("partly-cloudy-day", Skycons.PARTLY_CLOUDY_DAY);
    icons.set("partly-cloudy-night", Skycons.PARTLY_CLOUDY_NIGHT);
    icons.set("cloudy", Skycons.CLOUDY);
    icons.set("rain", Skycons.RAIN);
    icons.set("sleet", Skycons.SLEET);
    icons.set("snow", Skycons.SNOW);
    icons.set("wind", Skycons.WIND);
    icons.set("fog", Skycons.FOG);
    icons.play();
};

app.events = function () {
    app.initAutocomplete('destination');

    $('form').on('submit', function (e) {
        $('.content').empty();
        $('.content').each(function () {
            $(this).append('<i class="fas fa-plane hvr-icon loader"></i>');
        });
        var destination = $('#destination').val();
        if (destination.length > 0) {
            $('#splashPage').toggle(false);
            $('#contentPage').toggle(true);
            $('form').removeClass('splashSearchForm');
            $('#destination').removeClass('splashSearchBar');
            $('#submitButton').removeClass('splashSearchButton');
            $('#submitButton').addClass('contentSearchButton');
            $('form').addClass('contentSearchForm');
            $('#destination').addClass('contentSearchBar');
            e.preventDefault();
            $('#destinationName').text(destination);
            app.getDestinationInfo(destination);
        }
        app.destination = {};
        app.weather = {};
        app.currency = {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
        $('#destination').val('');
    });

    $('#searchMenu').on('click', function () {
        $('.contentSearchForm').toggle();
    });
};

app.init = function () {
    app.randomHero();
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    app.events();
};

$(function () {
    app.init();
});

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjs7QUFHQTtBQUNBO0FBQ0EsSUFBSSxnQkFBSixHQUF1QixVQUFDLEVBQUQsRUFBUTtBQUMzQixRQUFJLE9BQU8sSUFBUCxDQUFZLE1BQVosQ0FBbUIsWUFBdkIsQ0FBb0MsU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQXBDO0FBQ0gsQ0FGRDs7QUFJQTtBQUNBO0FBQ0EsSUFBSSxrQkFBSixHQUF5QixVQUFDLFFBQUQsRUFBYztBQUNuQyxRQUFNLFdBQVcsSUFBSSxPQUFPLElBQVAsQ0FBWSxRQUFoQixFQUFqQjtBQUNBLGFBQVMsT0FBVCxDQUFpQjtBQUNiLG1CQUFXO0FBREUsS0FBakIsRUFFRyxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3BCO0FBQ0EsWUFBSSxVQUFVLE9BQU8sSUFBUCxDQUFZLGNBQVosQ0FBMkIsRUFBekMsRUFBNkM7QUFDekMsZ0JBQU0sb0JBQW9CLFFBQVEsQ0FBUixFQUFXLGtCQUFYLENBQThCLE1BQTlCLENBQXFDLFVBQUMsU0FBRCxFQUFlO0FBQzFFLHVCQUFPLFVBQVUsS0FBVixDQUFnQixDQUFoQixNQUF1QixTQUE5QjtBQUNILGFBRnlCLENBQTFCO0FBR0E7QUFDQSxnQkFBSSxXQUFKLENBQWdCLFdBQWhCLEdB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Q0EsY0FBRSxlQUFGLEVBQW1CLFFBQW5CLENBQTRCLHFCQUE1QjtBQUNBLGNBQUUsTUFBRixFQUFVLFFBQVYsQ0FBbUIsbUJBQW5CO0FBQ0EsY0FBRSxjQUFGLEVBQWtCLFFBQWxCLENBQTJCLGtCQUEzQjtBQUNBLGNBQUUsY0FBRjtBQUNBLGNBQUUsa0JBQUYsRUFBc0IsSUFBdEIsQ0FBMkIsV0FBM0I7QUFDQSxnQkFBSSxrQkFBSixDQUF1QixXQUF2QjtBQUNIO0FBQ0QsWUFBSSxXQUFKLEdBQWtCLEVBQWxCO0FBQ0EsWUFBSSxPQUFKLEdBQWMsRUFBZDtBQUNBLFlBQUksUUFBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLElBQUosR0FBVyxFQUFYO0FBQ0EsWUFBSSxZQUFKO0FBQ0EsWUFBSSxLQUFKLEdBQVksRUFBWjtBQUNBLFlBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLFNBQUosR0FBZ0IsRUFBaEI7QUFDQSxVQUFFLGNBQUYsRUFBa0IsR0FBbEIsQ0FBc0IsRUFBdEI7QUFDSCxLQTVCRDs7QUE4QkEsTUFBRSxhQUFGLEVBQWlCLEVBQWpCLENBQW9CLE9BQXBCLEVBQTZCLFlBQVc7QUFDcEMsVUFBRSxvQkFBRixFQUF3QixNQUF4QjtBQUNILEtBRkQ7QUFHSCxDQXBDRDs7QUFzQ0EsSUFBSSxJQUFKLEdBQVcsWUFBTTtBQUNiLFFBQUksVUFBSjtBQUNBLFFBQUksZ0JBQUosQ0FBcUIsYUFBckI7QUFDQSxNQUFFLGNBQUYsRUFBa0IsTUFBbEIsQ0FBeUIsS0FBekI7QUFDQSxRQUFJLE1BQUo7QUFDSCxDQUxEOztBQU9BLEVBQUUsWUFBWTtBQUNWLFFBQUksSUFBSjtBQUNILENBRkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBjcmVhdGUgZW1wdHkgb2JqZWN0IHRvIHN0b3JlIGFsbCBtZXRob2RzXG5jb25zdCBhcHAgPSB7fTtcblxuLy8gY3JlYXRlIGVtcHR5IG9iamVjdHMvYXJyYXlzIG9uIGFwcCBvYmplY3QgdG8gc3RvcmUgdGhlIGluZm9ybWF0aW9uIHRvIGJlIHVzZWQgbGF0ZXIgb25cbmFwcC51c2VyID0ge307XG5hcHAuZGVzdGluYXRpb24gPSB7fTtcbmFwcC53ZWF0aGVyID0ge307XG5hcHAuY3VycmVuY3k9IHt9O1xuYXBwLlBPSXMgPSBbXTtcbmFwcC5leGNoYW5nZVJhdGU7XG5hcHAudG91cnMgPSBbXTtcbmFwcC5haXJwb3J0ID0ge307XG5hcHAubGFuZ3VhZ2UgPSB7fTtcblxuXG4vLyBtZXRob2QgdG8gaW5pdCBHb29nbGRlIEF1dG9jb21wbGV0ZTtcbi8vIHRha2VzIHBhcmFtZXRlciBvZiBhbiBpZCB0byB0YXJnZXQgc3BlY2lmaWMgaW5wdXQgdGFnc1xuYXBwLmluaXRBdXRvY29tcGxldGUgPSAoaWQpID0+IHtcbiAgICBuZXcgZ29vZ2xlLm1hcHMucGxhY2VzLkF1dG9jb21wbGV0ZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufVxuXG4vLyBtb3N0IG9mIHRoZSBBUElzIHdlIGFyZSByZXF1ZXN0aW5nIGRhdGEgZnJvbSBhY2NlcHQgbG9jYXRpb24gaW5mbyBpbiB0aGUgZm9ybSBvZiBsYXQgbG5nIGNvb3Jkc1xuLy8gc28gd2UgZW50ZXIgdGhlIHVzZXIncyBpbnB1dCBpbnRvIEdvb2dsZSBnZW9jb2RlciB0byBnZXQgbGF0IGFuZCBsbmcgY29vcmRzIHRvIHVzZSBpbiBvdGhlciBBUEkgcmVxdWVzdHNcbmFwcC5nZXREZXN0aW5hdGlvbkluZm8gPSAobG9jYXRpb24pID0+IHtcbiAgICBjb25zdCBnZW9jb2RlciA9IG5ldyBnb29nbGUubWFwcy5HZW9jb2RlcigpO1xuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xuICAgICAgICAnYWRkcmVzcyc6IGxvY2F0aW9uXG4gICAgfSwgKHJlc3VsdHMsIHN0YXR1cykgPT4ge1xuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBlcnJvciwgZmlsdGVyIHRoZSByZXN1bHQgc28gdGhhdCB0aGUgY29tcG9uZW50IGlzIGEgXCJjb3VudHJ5XCJcbiAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xuICAgICAgICAgICAgY29uc3QgYWRkcmVzc0NvbXBvbmVudHMgPSByZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50cy5maWx0ZXIoKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gb3V0IG9mIHRoZSByZXN1bHRzIG9mIHRoZSBmaWx0ZXIsIGdldCB0aGUgaW5mbyBhbmQgcG9wdWxhdGUgdGhlIGFwcC5kZXN0aW5hdGlvbiBvYmplY3RcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24uY291bnRyeU5hbWUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5sb25nX25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24ubGF0ID0gcmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbi5sYXQoKTtcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5sbmcgPSByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZygpO1xuICAgICAgICAgICAgYXBwLmdldFdlYXRoZXIoYXBwLmRlc3RpbmF0aW9uLmxhdCwgYXBwLmRlc3RpbmF0aW9uLmxuZyk7XG4gICAgICAgICAgICBhcHAuZ2V0Q3VycmVuY3koYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRDaXR5Q29kZShhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcbiAgICAgICAgICAgIGFwcC5nZXRMYW5ndWFnZShhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUpO1xuICAgICAgICAgICAgYXBwLmdldEFpcnBvcnRzKGFwcC5kZXN0aW5hdGlvbi5sYXQsIGFwcC5kZXN0aW5hdGlvbi5sbmcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0KFwiU29tZXRoaW5nIHdlbnQgd3JvbmcuXCIgKyBzdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuLy8gYWpheCBjYWxsIHRvIGdldCB3ZWF0aGVyXG4vLyB0YWtlcyBsYXQgYW5kIGxuZyBjb29yZHMgYXMgcGFyYW1ldGVyc1xuYXBwLmdldFdlYXRoZXIgPSAobGF0aXR1ZGUsIGxvbmdpdHVkZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0L2VhMmY3YTdiYWIzZGFhY2M5ZjU0ZjE3NzgxOWZhMWQzLyR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbnAnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAndW5pdHMnOiAnYXV0bydcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAvLyB0YWtlIHJlc3VsdCBhbmQgcHVsbCBkZXNpcmVkIGluZm9ybWF0aW9uIGludG8gYXBwLndlYXRoZXIgb2JqZWN0XG4gICAgICAgIGFwcC53ZWF0aGVyLmNvbmRpdGlvbnMgPSByZXMuZGFpbHkuc3VtbWFyeTtcbiAgICAgICAgYXBwLndlYXRoZXIuY3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKHJlcy5jdXJyZW50bHkudGVtcGVyYXR1cmUpO1xuICAgICAgICBhcHAud2VhdGhlci5pY29uID0gcmVzLmRhaWx5Lmljb247XG4gICAgICAgIGFwcC5kaXNwbGF5V2VhdGhlcihhcHAud2VhdGhlcik7XG4gICAgICAgIFxuICAgIH0pO1xufVxuXG4vLyBpIGZvdW5kIHRoYXQgdGhlIHBvaW50cyBvZiBpbnRlcmVzdCBhbmQgdG91cnMgcmVxdWVzdCB3b3JrcyBiZXR0ZXIgd2l0aCBhIGNpdHkgY29kZSBpbnN0ZWFkIG9mIGxhdCBhbmQgbG5nIGNvb3Jkc1xuLy8gbWV0aG9kIHRvIGdldCBjaXR5IGNvZGUgZnJvbSBsYXQgYW5kIGxuZyB0byB1c2UgaW4gb3RoZXIgYWpheCByZXF1ZXN0c1xuYXBwLmdldENpdHlDb2RlID0gKGxhdGl0dWRlLCBsb25naXR1ZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9kZXRlY3QtcGFyZW50c2AsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiAnenppSlljamxtRThMYldIZHZVNXZDOFVjU0Z2S0VQc0MzbmtBbDdlSydcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ2xvY2F0aW9uJzogYCR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWBcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBjb25zdCBkYXRhID0gcmVzLmRhdGEucGxhY2VzWzBdO1xuXG4gICAgICAgIC8vIHdlIHNwZWNpZmljYWxseSB3YW50IHRvIHRhcmdldCBjaXRpZXNcbiAgICAgICAgLy8gaWYgdGhhdCByZXN1bHQgaXMgYSBsZXZlbCBzbWFsbGVyIHRoYW4gYSBjaXR5LCB0YXJnZXQgdGhlIG5leHQgcGFyZW50IElEXG4gICAgICAgIGlmIChkYXRhLmxldmVsICE9PSAnY2l0eScpIHtcbiAgICAgICAgICAgIGNvbnN0IGNpdHlDb2RlID0gZGF0YS5wYXJlbnRfaWRzWzBdO1xuICAgICAgICAgICAgYXBwLmdldFBPSXMoY2l0eUNvZGUpO1xuICAgICAgICAgICAgYXBwLmdldFRvdXJzKGNpdHlDb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgdGhlIHJlc3VsdCBpcyBhIGNpdHksIGp1c3QgdXNlIHRoYXQgaWQgaW4gdGhlIG90aGVyIHJxdWVzdHNcbiAgICAgICAgICAgIGNvbnN0IGNpdHlDb2RlID0gZGF0YS5pZDsgIFxuICAgICAgICAgICAgYXBwLmdldFBPSXMoY2l0eUNvZGUpO1xuICAgICAgICAgICAgYXBwLmdldFRvdXJzKGNpdHlDb2RlKTtcbiAgICAgICAgfSBcbiAgICB9KTtcbn1cblxuLy8gbWV0aG9kIHRvIGdldCBQT0lzIChwb2ludHMgb2YgaW50ZXJlc3QpO1xuYXBwLmdldFBPSXMgPSAoY2l0eUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9saXN0YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAndGFnc19ub3QnOiAnQWlycG9ydCcsXG4gICAgICAgICAgICAncGFyZW50cyc6IGNpdHlDb2RlLFxuICAgICAgICAgICAgJ2xldmVsJzogJ3BvaScsXG4gICAgICAgICAgICAnbGltaXQnOiAyMCxcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcyk9PiB7XG4gICAgICAgIGNvbnN0IHBvaW50cyA9IHJlcy5kYXRhLnBsYWNlcztcblxuICAgICAgICAvLyB3ZSBvbmx5IHdhbnQgcmVzdWx0cyB0aGF0IGhhdmUgYW4gaW1hZ2UgYW5kIGEgZGVzY3JpcHRpb25zIChwZXJleClcbiAgICAgICAgY29uc3QgZmlsdGVyZWRQb2ludHMgPSBwb2ludHMuZmlsdGVyKChwbGFjZSk9PiB7XG4gICAgICAgICAgICByZXR1cm4gcGxhY2UudGh1bWJuYWlsX3VybCAmJiBwbGFjZS5wZXJleFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gcmVzdWx0cyB0aGF0IGhhdmUgYW4gaW1hZ2UgYW5kIGEgZGVzY3JpcHRpb24sIGNhbGwgdGhlIGRpc3BsYXlFcnJvciBmdW5jdGlvblxuICAgICAgICBpZiAoZmlsdGVyZWRQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhcHAuZGlzcGxheUVycm9yKCdwb2knLCAncG9pbnRzIG9mIGludGVyZXN0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0YWtlIHRoZSBmaXJzdCAzIGl0ZW1zIGFuZCBwdXNoIHRoZWlyIHByb3BlcnRpZXMgb250byB0aGUgYXBwLlBPSXMgb2JqZWN0XG4gICAgICAgICAgICBmaWx0ZXJlZFBvaW50cy5mb3JFYWNoKChwb2ludCk9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICduYW1lJzogcG9pbnQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogcG9pbnQucGVyZXgsXG4gICAgICAgICAgICAgICAgICAgICdwaG90byc6IHBvaW50LnRodW1ibmFpbF91cmwsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhcHAuUE9Jcy5wdXNoKHBsYWNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXBwLmRpc3BsYXlQT0lzKGFwcC5QT0lzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLy9tZXRob2QgdG8gZ2V0IGNsb3Nlc3QgYWlycG9ydFxuYXBwLmdldEFpcnBvcnRzID0gKGxhdCwgbG5nKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi9wbGFjZXMvbGlzdGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiAnenppSlljamxtRThMYldIZHZVNXZDOFVjU0Z2S0VQc0MzbmtBbDdlSydcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ2xvY2F0aW9uJzogYCR7bGF0fSwke2xuZ31gLFxuICAgICAgICAgICAgJ3RhZ3MnOiAnQWlycG9ydCcsXG4gICAgICAgIH1cbiAgICB9KSAudGhlbiAoKHJlcykgPT4ge1xuICAgICAgICAvLyBwdXNoIHRoZSBwcm9wZXJ0aWVzIG9udG8gYXBwLmFpcnBvcnQgb2JqZWN0XG4gICAgICAgIGFwcC5haXJwb3J0Lm5hbWUgPSByZXMuZGF0YS5wbGFjZXNbMF0ubmFtZTtcbiAgICAgICAgYXBwLmFpcnBvcnQuZGVzY3JpcHRpb24gPSByZXMuZGF0YS5wbGFjZXNbMF0ucGVyZXg7XG4gICAgICAgIGFwcC5haXJwb3J0LnBob3RvID0gcmVzLmRhdGEucGxhY2VzWzBdLnRodW1ibmFpbF91cmw7XG5cbiAgICAgICAgLy8gY2FsbCBkaXNwbGF5QWlycG9ydHMgdXNpbmcgcHJvcGVydGllcyBmcm9tIGFqYXggcmVxdWVzdFxuICAgICAgICBhcHAuZGlzcGxheUFpcnBvcnRzKGFwcC5haXJwb3J0KTtcbiAgICB9KTtcbn1cblxuLy8gbWV0aG9kIHRvIGdldCBsYW5ndWFnZVxuYXBwLmdldExhbmd1YWdlID0gKGNvdW50cnkpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxuICAgICAgICB9XG4gICAgfSkgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAubGFuZ3VhZ2UucHJpbWFyeSA9IHJlc1swXS5sYW5ndWFnZXNbMF0ubmFtZTtcbiAgICAgICAgaWYgKHJlc1swXS5sYW5ndWFnZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgYXBwLmxhbmd1YWdlLnNlY29uZGFyeSA9IHJlc1swXS5sYW5ndWFnZXNbMV0ubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBhcHAuZGlzcGxheUxhbmd1YWdlKGFwcC5sYW5ndWFnZSk7XG4gICAgfSk7XG5cbn1cblxuLy8gXG5hcHAuZ2V0VG91cnMgPSAoY2l0eUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3RvdXJzL3ZpYXRvcmAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiAnenppSlljamxtRThMYldIZHZVNXZDOFVjU0Z2S0VQc0MzbmtBbDdlSydcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ3BhcmVudF9wbGFjZV9pZCc6IGNpdHlDb2RlXG4gICAgICAgIH1cbiAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBjb25zdCBsaXN0ID0gcmVzLmRhdGEudG91cnM7XG4gICAgICAgIGNvbnN0IHRvdXJzID0gbGlzdC5maWx0ZXIoKHBsYWNlKT0+IHtcbiAgICAgICAgICAgIHJldHVybiBwbGFjZS5waG90b191cmwgJiYgcGxhY2UudXJsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodG91cnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhcHAuZGlzcGxheUVycm9yKCd0b3VycycsICd0b3VycycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3Vycy5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3VyID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b3Vyc1tpXS50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgcGhvdG86IHRvdXJzW2ldLnBob3RvX3VybCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB0b3Vyc1tpXS51cmxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFwcC50b3Vycy5wdXNoKHRvdXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXBwLmRpc3BsYXlUb3VycyhhcHAudG91cnMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmFwcC5nZXRDdXJyZW5jeSA9IChjb3VudHJ5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vcmVzdGNvdW50cmllcy5ldS9yZXN0L3YyL25hbWUvJHtjb3VudHJ5Q29kZX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGFwcC5jdXJyZW5jeS5jb2RlID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uY29kZTtcbiAgICAgICAgYXBwLmN1cnJlbmN5LnN5bWJvbCA9IHJlc1swXS5jdXJyZW5jaWVzWzBdLnN5bWJvbDtcbiAgICAgICAgYXBwLmRpc3BsYXlDdXJyZW5jeShhcHAuY3VycmVuY3kpO1xuICAgIH0pO1xufSAgICBcblxuYXBwLmNvbnZlcnRDdXJyZW5jeSA9ICh1c2VyQ3VycmVuY3ksIGRlc3RpbmF0aW9uQ3VycmVuY3kpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2ZyZWUuY3VycmVuY3ljb252ZXJ0ZXJhcGkuY29tL2FwaS92Ni9jb252ZXJ0YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcTogYCR7dXNlckN1cnJlbmN5fV8ke2Rlc3RpbmF0aW9uQ3VycmVuY3l9LCR7ZGVzdGluYXRpb25DdXJyZW5jeX1fJHt1c2VyQ3VycmVuY3l9YCxcbiAgICAgICAgICAgIGNvbXBhY3Q6ICd1bHRyYSdcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAuY3VycmVuY3kuZXhjaGFuZ2VSYXRlID0gcmVzW2Ake3VzZXJDdXJyZW5jeX1fJHtkZXN0aW5hdGlvbkN1cnJlbmN5fWBdO1xuXG4gICAgICAgICQoJyNjdXJyZW5jeSBoMicpLnRleHQoYCQxICR7dXNlckN1cnJlbmN5fSA9ICR7YXBwLmN1cnJlbmN5LnN5bWJvbH0gJHthcHAuY3VycmVuY3kuZXhjaGFuZ2VSYXRlLnRvRml4ZWQoMil9ICR7ZGVzdGluYXRpb25DdXJyZW5jeX1gKVxuXG4gICAgfSk7XG59XG5cbmFwcC5kaXNwbGF5RXJyb3IgPSAoZGl2SUQsIHRvcGljKSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPiR7dG9waWN9PC9oMz5gO1xuICAgICQoYCMke2RpdklEfWApLmFwcGVuZCh0aXRsZSwgYDxoMj5Tb3JyeSwgd2UgZG9uJ3QgaGF2ZSBkZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCAke3RvcGljfSBpbiB0aGlzIGFyZWEuIFRyeSB5b3VyIHNlYXJjaCBhZ2FpbiBpbiBhIG5lYXJieSBjaXR5IG9yIHJlbGF0ZWQgYXJlYS48L2gyPmApO1xufVxuXG5cbmFwcC5kaXNwbGF5Q3VycmVuY3kgPSAob2JqZWN0KSA9PiB7XG4gICAgJCgnI2N1cnJlbmN5JykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPkN1cnJlbmN5PC9oMz5gO1xuICAgIGNvbnN0IGh0bWwgPSBgPGgyPlRoZSBjdXJyZW5jeSB1c2VkIGlzICR7b2JqZWN0LnN5bWJvbH0gJHtvYmplY3QuY29kZX08L2gyPmA7XG4gICAgY29uc3QgaW5wdXQgPSBgPGZvcm0gaWQ9XCJ1c2VyQ3VycmVuY3lcIj48aW5wdXQgY2xhc3M9XCJ1c2VyQ3VycmVuY3kgIHR5cGU9XCJzZWFyY2hcIiBpZD1cInVzZXJcIiBwbGFjZWhvbGRlcj1cIkVudGVyIHlvdXIgbG9jYXRpb24uXCI+PGJ1dHRvbiBjbGFzcz1cInN1Ym1pdFwiPkNvbnZlcnQ8L2J1dHRvbj48L2Zvcm0+YDtcbiAgICAkKCcjY3VycmVuY3knKS5hcHBlbmQodGl0bGUsaHRtbCwgaW5wdXQpO1xuICAgIGFwcC5nZXRVc2VySW5mbygpO1xufVxuXG5hcHAuZ2V0VXNlckluZm8gPSAoKSA9PiB7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ3VzZXInKTtcbiAgICAkKCcjdXNlckN1cnJlbmN5Jykub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCB1c2VyTG9jYXRpb24gPSAkKCcjdXNlcicpLnZhbCgpO1xuICAgICAgICBhcHAuZ2V0VXNlckxvY2F0aW9uKHVzZXJMb2NhdGlvbik7XG4gICAgfSk7XG59XG5cbmFwcC5nZXRVc2VyTG9jYXRpb24gPSAobG9jYXRpb24pID0+IHtcbiAgICBuZXcgZ29vZ2xlLm1hcHMucGxhY2VzLkF1dG9jb21wbGV0ZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXNlcicpKTtcbiAgICBjb25zdCBnZW9jb2RlciA9IG5ldyBnb29nbGUubWFwcy5HZW9jb2RlcigpO1xuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xuICAgICAgICAnYWRkcmVzcyc6IGxvY2F0aW9uXG4gICAgfSwgKHJlc3VsdHMsIHN0YXR1cykgPT4ge1xuICAgICAgICBpZiAoc3RhdHVzID09IGdvb2dsZS5tYXBzLkdlb2NvZGVyU3RhdHVzLk9LKSB7XG4gICAgICAgICAgICBjb25zdCBhZGRyZXNzQ29tcG9uZW50cyA9IHJlc3VsdHNbMF0uYWRkcmVzc19jb21wb25lbnRzLmZpbHRlcigoY29tcG9uZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC50eXBlc1swXSA9PT0gJ2NvdW50cnknO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhcHAudXNlci5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGVydCgnU29ycnksIHNvbWV0aGluZyB3ZW50IHdyb25nLicgKyBzdGF0dXMpXG4gICAgICAgIH1cbiAgICBhcHAuZ2V0VXNlckN1cnJlbmN5KGFwcC51c2VyLmNvdW50cnlDb2RlKTtcbiAgICB9KTsgICAgXG59XG5cbmFwcC5nZXRVc2VyQ3VycmVuY3kgPSAoY291bnRyeUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAudXNlci5jb2RlID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uY29kZTtcbiAgICAgICAgYXBwLmNvbnZlcnRDdXJyZW5jeShhcHAudXNlci5jb2RlLCBhcHAuY3VycmVuY3kuY29kZSk7XG4gICAgfSk7XG59XG5cblxuYXBwLmRpc3BsYXlMYW5ndWFnZSA9IChvYmplY3QpID0+IHtcbiAgICAkKCcjbGFuZ3VhZ2UnKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+TGFuZ3VhZ2U8L2gzPmA7XG4gICAgY29uc3QgcHJpbWFyeSA9IGA8aDI+UHJpbWFyeTwvaDI+PGg0PiR7b2JqZWN0LnByaW1hcnl9PC9oND5gO1xuICAgIGNvbnN0IHNlY29uZGFyeSA9IGA8aDI+U2Vjb25kYXJ5PC9oMj48aDQ+JHtvYmplY3Quc2Vjb25kYXJ5fTwvaDQ+YDtcbiAgICAkKCcjbGFuZ3VhZ2UnKS5hcHBlbmQodGl0bGUsIHByaW1hcnkpXG4gICAgaWYgKG9iamVjdC5zZWNvbmRhcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAkKCcjbGFuZ3VhZ2UnKS5hcHBlbmQoc2Vjb25kYXJ5KTtcbiAgICB9IFxufVxuXG5hcHAuZGlzcGxheUFpcnBvcnRzID0gKG9iamVjdCkgPT4ge1xuICAgICQoJyNhaXJwb3J0JykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPkNsb3Nlc3QgQWlycG9ydDwvaDM+YDtcbiAgICBjb25zdCBuYW1lID0gYDxoND4ke29iamVjdC5uYW1lfTwvaDQ+YDtcbiAgICAkKCcjYWlycG9ydCcpLmFwcGVuZCh0aXRsZSwgbmFtZSk7XG59XG5cbi8vIG1ldGhvZCB0byBkaXNwbGF5IHRvdXJzXG4vLyBpIHJlYWxpemVkIHdoZW4gdGhlcmUncyBhIGxvdCBvZiByZXN1bHRzLCBpdCdzIG5vdCBpZGVhbCBmb3IgbW9iaWxlIHVzZXJzXG4vLyBzbyBpIHRyaWVkIHNvbWUgc2ltcGxlIFwicGFnaW5hdGlvblwiIHdoZW4gdGhlIHNjcmVlbiB3aWR0aCBpcyBsZXNzIHRoYW4gNjAwcHhcbi8vIGNyZWF0ZSAyIHZhcmlhYmxlcywgb25lIHRvIGFjdCBhcyBhIFwiY291bnRlclwiIGFuZCBvbmUgdG8gZGljdGF0ZSByZXN1bHRzIHBlciBwYWdlXG4vLyB3aGVuIHVzZXIgY2xpY2tzICdsb2FkIG1vcmUnLCBpdCBhcHBlbmRzIHRoZSBuZXh0IHRocmVlIHJlc3VsdHMsIHJlbW92ZXMgdGhlIGJ1dHRvbiwgYW5kIGFwcGVuZHMgYSBuZXcgYnV0dG9uIGF0IHRoZSBlbmQgb2YgdGhlIG5ldyByZXN1bHRzXG5hcHAuZGlzcGxheVRvdXJzID0gKGFycmF5KSA9PiB7XG4gICAgJCgnI3RvdXJzJykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPlRvcCBUb3VyczwvaDM+YDtcbiAgICAkKCcjdG91cnMnKS5hcHBlbmQodGl0bGUpO1xuICAgIFxuICAgIGlmICgkKHdpbmRvdykud2lkdGgoKSA8PSA2MDApIHtcdFxuICAgICAgICBsZXQgY291bnRlciA9IDA7XG4gICAgICAgIGxldCByZXN1bHRzUGVyUGFnZSA9IDM7XG4gICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgcmVzdWx0c1BlclBhZ2U7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7YXJyYXlbaV0ubmFtZX08aDI+YFxuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7YXJyYXlbaV0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBgPGEgY2xhc3M9XCJodnItdW5kZXJsaW5lLWZyb20tY2VudGVyXCIgaHJlZj1cIiR7YXJyYXkudXJsfVwiPkJvb2sgTm93PC9hPmA7XG5cbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKGA8ZGl2PmApLmFwcGVuZChuYW1lLCBsaW5rKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0gICAgXG5cbiAgICAgICAgY29uc3QgbG9hZE1vcmUgPSBgPGJ1dHRvbiBjbGFzcz1cImxvYWRNb3JlIGh2ci1ncm93LXNoYWRvd1wiPkxvYWQgTW9yZTwvYnV0dG9uPmA7XG4gICAgICAgICQoJyN0b3VycycpLmFwcGVuZChsb2FkTW9yZSk7XG4gICAgICAgICQoJyN0b3VycycpLm9uKCdjbGljaycsICcubG9hZE1vcmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICBjb3VudGVyKz0zO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCAoY291bnRlciArIHJlc3VsdHNQZXJQYWdlKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmBcbiAgICAgICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgIHNyYz1cIiR7YXJyYXlbaV0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKGA8ZGl2PmApLmFwcGVuZChuYW1lLCBsaW5rKTtcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChsb2FkTW9yZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGlmIHNjcmVlbiB3aWR0aCBpcyBub3QgbGVzcyB0aGFuIDYwMHB4LCBhcHBlbmQgZWxlbWVudHMgbm9ybWFsbHlcblx0fSBlbHNlIHtcbiAgICAgICAgYXJyYXkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7aXRlbS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7aXRlbS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHtpdGVtLnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGxpbmspO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vLyBtZXRob2QgdG8gZGlzcGxheSBwb2ludHMgb2YgaW50ZXJlc3Rcbi8vIHNhbWUgXCJwYWdpbmF0aW9uXCIgc3lzdGVtIGFzIHRvdXJzXG5hcHAuZGlzcGxheVBPSXMgPSAoYXJyYXkpID0+IHtcbiAgICAkKCcjcG9pJykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPlBvaW50cyBvZiBJbnRlcmVzdDwvaDM+YDtcbiAgICAkKCcjcG9pJykuYXBwZW5kKHRpdGxlKTtcbiAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgPD0gNjAwKSB7XHRcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuICAgICAgICBsZXQgcmVzdWx0c1BlclBhZ2UgPSAzO1xuICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IHJlc3VsdHNQZXJQYWdlOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7YXJyYXlbaV0uZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuXG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSAgICBcblxuICAgICAgICBjb25zdCBsb2FkTW9yZSA9IGA8YnV0dG9uIGNsYXNzPVwibG9hZE1vcmUgaHZyLWdyb3ctc2hhZG93XCI+TG9hZCBNb3JlPC9idXR0b24+YDtcbiAgICAgICAgJCgnI3BvaScpLmFwcGVuZChsb2FkTW9yZSk7XG5cbiAgICAgICAgJCgnI3BvaScpLm9uKCdjbGljaycsICcubG9hZE1vcmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICBjb3VudGVyKz0zO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCAoY291bnRlciArIHJlc3VsdHNQZXJQYWdlKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJChgPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj5gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgIFxuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZWxzZSBqdXN0IGFwcGVuZCBhbGwgdGhlIHJlc3VsdHMgbm9ybWFsbHlcblx0fSBlbHNlIHsgICAgXG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2l0ZW0ubmFtZX08aDI+YDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHtpdGVtLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7aXRlbS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0pO1xuICAgIH0gICAgXG59XG5cbmFwcC5kaXNwbGF5V2VhdGhlciA9IChvYmplY3QpID0+IHtcbiAgICAkKCcjd2VhdGhlcicpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGxldCBkZWdyZWVzID0gJyc7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPldlYXRoZXI8L2gzPmA7XG4gICAgY29uc3QgaWNvbiA9IGA8Y2FudmFzIGlkPVwiJHtvYmplY3QuaWNvbn1cIiB3aWR0aD1cIjgwXCIgaGVpZ2h0PVwiODBcIj48L2NhbnZhcz5gO1xuICAgIGlmIChhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUgPT09ICdVUycpIHtcbiAgICAgICAgZGVncmVlcyA9ICdGJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBkZWdyZWVzID0gJ0MnO1xuICAgIH1cbiAgICBjb25zdCBodG1sID0gYDxoMj5DdXJyZW50bHk6PC9oMj4gXG4gICAgPGg0PiR7b2JqZWN0LmN1cnJlbnRUZW1wfcKwJHtkZWdyZWVzfTwvaDQ+XG4gICAgICAgIDxwIGNsYXNzPVwid2VhdGhlclRleHRcIj4ke29iamVjdC5jb25kaXRpb25zfTwvcD5gXG4gICAgJCgnI3dlYXRoZXInKS5hcHBlbmQodGl0bGUsIGljb24sIGh0bWwpO1xuICAgIGFwcC5sb2FkSWNvbnMoKTtcbn1cblxuYXBwLnJhbmRvbUhlcm8gPSAoKSA9PiB7XG4gICAgbGV0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCkgKyAxXG4gICAgJCgnLnNwbGFzaFBhZ2UnKS5jc3Moe1xuICAgICAgICAnYmFja2dyb3VuZCc6IGBsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwwLjMpLCByZ2JhKDAsMCwwLDAuMykpLCB1cmwoXCJwdWJsaWMvYXNzZXRzL2hlcm8ke2l9LmpwZ1wiKWAsXG4gICAgICAgICdiYWNrZ3JvdW5kLXBvc2l0aW9uJzogJ2NlbnRlcicsXG5cdCAgICAnYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJ1x0XG4gICAgfSk7XG59XG5cbmFwcC5sb2FkSWNvbnMgPSAoKSA9PiB7XG4gICAgdmFyIGljb25zID0gbmV3IFNreWNvbnMoe1wiY29sb3JcIjogXCJibGFja1wifSk7XG4gICAgaWNvbnMuc2V0KFwiY2xlYXItZGF5XCIsIFNreWNvbnMuQ0xFQVJfREFZKTtcbiAgICBpY29ucy5zZXQoXCJjbGVhci1uaWdodFwiLCBTa3ljb25zLkNMRUFSX05JR0hUKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LWRheVwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfREFZKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LW5pZ2h0XCIsIFNreWNvbnMuUEFSVExZX0NMT1VEWV9OSUdIVCk7XG4gICAgaWNvbnMuc2V0KFwiY2xvdWR5XCIsIFNreWNvbnMuQ0xPVURZKTtcbiAgICBpY29ucy5zZXQoXCJyYWluXCIsIFNreWNvbnMuUkFJTik7XG4gICAgaWNvbnMuc2V0KFwic2xlZXRcIiwgU2t5Y29ucy5TTEVFVCk7XG4gICAgaWNvbnMuc2V0KFwic25vd1wiLCBTa3ljb25zLlNOT1cpO1xuICAgIGljb25zLnNldChcIndpbmRcIiwgU2t5Y29ucy5XSU5EKTtcbiAgICBpY29ucy5zZXQoXCJmb2dcIiwgU2t5Y29ucy5GT0cpO1xuICAgIGljb25zLnBsYXkoKTtcbn1cblxuYXBwLmV2ZW50cyA9ICgpID0+IHtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcbiAgIFxuICAgICQoJ2Zvcm0nKS5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgJCgnLmNvbnRlbnQnKS5lbXB0eSgpO1xuICAgICAgICAkKCcuY29udGVudCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmFwcGVuZChgPGkgY2xhc3M9XCJmYXMgZmEtcGxhbmUgaHZyLWljb24gbG9hZGVyXCI+PC9pPmApO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZGVzdGluYXRpb24gPSAkKCcjZGVzdGluYXRpb24nKS52YWwoKTtcbiAgICAgICAgaWYgKGRlc3RpbmF0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICQoJyNzcGxhc2hQYWdlJykudG9nZ2xlKGZhbHNlKTtcbiAgICAgICAgICAgICQoJyNjb250ZW50UGFnZScpLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgICQoJ2Zvcm0nKS5yZW1vdmVDbGFzcygnc3BsYXNoU2VhcmNoRm9ybScpO1xuICAgICAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykucmVtb3ZlQ2xhc3MoJ3NwbGFzaFNlYXJjaEJhcicpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdEJ1dHRvbicpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hCdXR0b24nKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRCdXR0b24nKS5hZGRDbGFzcygnY29udGVudFNlYXJjaEJ1dHRvbicpO1xuICAgICAgICAgICAgJCgnZm9ybScpLmFkZENsYXNzKCdjb250ZW50U2VhcmNoRm9ybScpO1xuICAgICAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hCYXInKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbk5hbWUnKS50ZXh0KGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIGFwcC5nZXREZXN0aW5hdGlvbkluZm8oZGVzdGluYXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGFwcC5kZXN0aW5hdGlvbiA9IHt9O1xuICAgICAgICBhcHAud2VhdGhlciA9IHt9O1xuICAgICAgICBhcHAuY3VycmVuY3k9IHt9O1xuICAgICAgICBhcHAuUE9JcyA9IFtdO1xuICAgICAgICBhcHAuZXhjaGFuZ2VSYXRlO1xuICAgICAgICBhcHAudG91cnMgPSBbXTtcbiAgICAgICAgYXBwLmFpcnBvcnQgPSB7fTtcbiAgICAgICAgYXBwLmxhbmd1YWdlcyA9IHt9O1xuICAgICAgICAkKCcjZGVzdGluYXRpb24nKS52YWwoJycpO1xuICAgIH0pO1xuXG4gICAgJCgnI3NlYXJjaE1lbnUnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnLmNvbnRlbnRTZWFyY2hGb3JtJykudG9nZ2xlKCk7XG4gICAgfSk7XG59XG5cbmFwcC5pbml0ID0gKCkgPT4ge1xuICAgIGFwcC5yYW5kb21IZXJvKCk7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ2Rlc3RpbmF0aW9uJyk7XG4gICAgJCgnI2NvbnRlbnRQYWdlJykudG9nZ2xlKGZhbHNlKTtcbiAgICBhcHAuZXZlbnRzKCk7XG59XG5cbiQoZnVuY3Rpb24gKCkge1xuICAgIGFwcC5pbml0KCk7XG59KTsiXX0=
