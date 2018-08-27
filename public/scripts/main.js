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
app.sygicKey = 'MOmJoKEgCz2GyFIO9dOcS5scrkSq8CkB1lPYLHe8';

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
            'x-api-key': app.sygicKey
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
            'x-api-key': app.sygicKey
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
            'x-api-key': app.sygicKey
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
            'x-api-key': app.sygicKey
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
    $('#' + divId).find('i').toggle(false);
    var title = '<h3>' + topic + '</h3>';
    $('#' + divID).append(title, '<h2>Sorry, we don\'t have detailed information about ' + topic + ' in this area. Try your search again in a related city or nearby region.</h2>');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjtBQUNBLElBQUksUUFBSixHQUFlLDBDQUFmOztBQUVBO0FBQ0E7QUFDQSxJQUFJLGdCQUFKLEdBQXVCLFVBQUMsRUFBRCxFQUFRO0FBQzNCLFFBQUksT0FBTyxJQUFQLENBQVksTUFBWixDQUFtQixZQUF2QixDQUFvQyxTQUFTLGNBQVQsQ0FBd0IsRUFBeEIsQ0FBcEM7QUFDSCxDQUZEOztBQUlBO0FBQ0E7QUFDQSxJQUFJLGtCQUFKLEdBQXlCLFVBQUMsUUFBRCxFQUFjO0FBQ25DLFFBQU0sV0FBVyxJQUFJLE9BQU8sSUFBUCxDQUFZLFFBQWhCLEVBQWpCO0FBQ0EsYUFBUyxPQUFULENBQWlCO0FBQ2IsbUJBQVc7QUFERSxLQUFqQixFQUVHLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7QUFDcEI7QUFDQSxZQUFJLFVBQVUsT0FBTyxJQUFQLENBQVksY0FBWixDQUEyQixFQUF6QyxFQUE2QztBQUN6QyxnQkFBTSxvQkFBb0IsUUFBUSxDQUFSLEVBQVcsa0JBQVgsQ0FBOEIsTUFBOUIsQ0FBcUMsVUFBQyxTQUFELEVBQWU7QUFDMUUsdUJBQU8sVUFBVSxLQUFWLENBQWdCLENBQWhCLE1BQXVCLFNBQTlCO0FBQ0gsYUFGeUIsQ0FBMUI7QUFHQTtBQUNB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KCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vIGNyZWF0ZSBlbXB0eSBvYmplY3QgdG8gc3RvcmUgYWxsIG1ldGhvZHNcbmNvbnN0IGFwcCA9IHt9O1xuXG4vLyBjcmVhdGUgZW1wdHkgb2JqZWN0cy9hcnJheXMgb24gYXBwIG9iamVjdCB0byBzdG9yZSB0aGUgaW5mb3JtYXRpb24gdG8gYmUgdXNlZCBsYXRlciBvblxuYXBwLnVzZXIgPSB7fTtcbmFwcC5kZXN0aW5hdGlvbiA9IHt9O1xuYXBwLndlYXRoZXIgPSB7fTtcbmFwcC5jdXJyZW5jeT0ge307XG5hcHAuUE9JcyA9IFtdO1xuYXBwLmV4Y2hhbmdlUmF0ZTtcbmFwcC50b3VycyA9IFtdO1xuYXBwLmFpcnBvcnQgPSB7fTtcbmFwcC5sYW5ndWFnZSA9IHt9O1xuYXBwLnN5Z2ljS2V5ID0gJ01PbUpvS0VnQ3oyR3lGSU85ZE9jUzVzY3JrU3E4Q2tCMWxQWUxIZTgnO1xuXG4vLyBtZXRob2QgdG8gaW5pdCBHb29nbGRlIEF1dG9jb21wbGV0ZTtcbi8vIHRha2VzIHBhcmFtZXRlciBvZiBhbiBpZCB0byB0YXJnZXQgc3BlY2lmaWMgaW5wdXQgdGFnc1xuYXBwLmluaXRBdXRvY29tcGxldGUgPSAoaWQpID0+IHtcbiAgICBuZXcgZ29vZ2xlLm1hcHMucGxhY2VzLkF1dG9jb21wbGV0ZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufVxuXG4vLyBtb3N0IG9mIHRoZSBBUElzIHdlIGFyZSByZXF1ZXN0aW5nIGRhdGEgZnJvbSBhY2NlcHQgbG9jYXRpb24gaW5mbyBpbiB0aGUgZm9ybSBvZiBsYXQgbG5nIGNvb3Jkc1xuLy8gc28gd2UgZW50ZXIgdGhlIHVzZXIncyBpbnB1dCBpbnRvIEdvb2dsZSBnZW9jb2RlciB0byBnZXQgbGF0IGFuZCBsbmcgY29vcmRzIHRvIHVzZSBpbiBvdGhlciBBUEkgcmVxdWVzdHNcbmFwcC5nZXREZXN0aW5hdGlvbkluZm8gPSAobG9jYXRpb24pID0+IHtcbiAgICBjb25zdCBnZW9jb2RlciA9IG5ldyBnb29nbGUubWFwcy5HZW9jb2RlcigpO1xuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xuICAgICAgICAnYWRkcmVzcyc6IGxvY2F0aW9uXG4gICAgfSwgKHJlc3VsdHMsIHN0YXR1cykgPT4ge1xuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBlcnJvciwgZmlsdGVyIHRoZSByZXN1bHQgc28gdGhhdCB0aGUgY29tcG9uZW50IGlzIGEgXCJjb3VudHJ5XCJcbiAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xuICAgICAgICAgICAgY29uc3QgYWRkcmVzc0NvbXBvbmVudHMgPSByZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50cy5maWx0ZXIoKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gb3V0IG9mIHRoZSByZXN1bHRzIG9mIHRoZSBmaWx0ZXIsIGdldCB0aGUgaW5mbyBhbmQgcG9wdWxhdGUgdGhlIGFwcC5kZXN0aW5hdGlvbiBvYmplY3RcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24uY291bnRyeU5hbWUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5sb25nX25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24ubGF0ID0gcmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbi5sYXQoKTtcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5sbmcgPSByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZygpO1xuICAgICAgICAgICAgYXBwLmdldFdlYXRoZXIoYXBwLmRlc3RpbmF0aW9uLmxhdCwgYXBwLmRlc3RpbmF0aW9uLmxuZyk7XG4gICAgICAgICAgICBhcHAuZ2V0Q3VycmVuY3koYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRDaXR5Q29kZShhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcbiAgICAgICAgICAgIGFwcC5nZXRMYW5ndWFnZShhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUpO1xuICAgICAgICAgICAgYXBwLmdldEFpcnBvcnRzKGFwcC5kZXN0aW5hdGlvbi5sYXQsIGFwcC5kZXN0aW5hdGlvbi5sbmcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0KFwiU29tZXRoaW5nIHdlbnQgd3JvbmcuXCIgKyBzdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuLy8gYWpheCBjYWxsIHRvIGdldCB3ZWF0aGVyXG4vLyB0YWtlcyBsYXQgYW5kIGxuZyBjb29yZHMgYXMgcGFyYW1ldGVyc1xuYXBwLmdldFdlYXRoZXIgPSAobGF0aXR1ZGUsIGxvbmdpdHVkZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0L2VhMmY3YTdiYWIzZGFhY2M5ZjU0ZjE3NzgxOWZhMWQzLyR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbnAnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAndW5pdHMnOiAnYXV0bydcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAvLyB0YWtlIHJlc3VsdCBhbmQgcHVsbCBkZXNpcmVkIGluZm9ybWF0aW9uIGludG8gYXBwLndlYXRoZXIgb2JqZWN0XG4gICAgICAgIGFwcC53ZWF0aGVyLmNvbmRpdGlvbnMgPSByZXMuZGFpbHkuc3VtbWFyeTtcbiAgICAgICAgYXBwLndlYXRoZXIuY3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKHJlcy5jdXJyZW50bHkudGVtcGVyYXR1cmUpO1xuICAgICAgICBhcHAud2VhdGhlci5pY29uID0gcmVzLmRhaWx5Lmljb247XG4gICAgICAgIGFwcC5kaXNwbGF5V2VhdGhlcihhcHAud2VhdGhlcik7XG4gICAgICAgIFxuICAgIH0pO1xufVxuXG4vLyBpIGZvdW5kIHRoYXQgdGhlIHBvaW50cyBvZiBpbnRlcmVzdCBhbmQgdG91cnMgcmVxdWVzdCB3b3JrcyBiZXR0ZXIgd2l0aCBhIGNpdHkgY29kZSBpbnN0ZWFkIG9mIGxhdCBhbmQgbG5nIGNvb3Jkc1xuLy8gbWV0aG9kIHRvIGdldCBjaXR5IGNvZGUgZnJvbSBsYXQgYW5kIGxuZyB0byB1c2UgaW4gb3RoZXIgYWpheCByZXF1ZXN0c1xuYXBwLmdldENpdHlDb2RlID0gKGxhdGl0dWRlLCBsb25naXR1ZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9kZXRlY3QtcGFyZW50c2AsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiBhcHAuc3lnaWNLZXksXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICdsb2NhdGlvbic6IGAke2xhdGl0dWRlfSwke2xvbmdpdHVkZX1gXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlcy5kYXRhLnBsYWNlc1swXTtcblxuICAgICAgICAvLyB3ZSBzcGVjaWZpY2FsbHkgd2FudCB0byB0YXJnZXQgY2l0aWVzXG4gICAgICAgIC8vIGlmIHRoYXQgcmVzdWx0IGlzIGEgbGV2ZWwgc21hbGxlciB0aGFuIGEgY2l0eSwgdGFyZ2V0IHRoZSBuZXh0IHBhcmVudCBJRFxuICAgICAgICBpZiAoZGF0YS5sZXZlbCAhPT0gJ2NpdHknKSB7XG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEucGFyZW50X2lkc1swXTtcbiAgICAgICAgICAgIGFwcC5nZXRQT0lzKGNpdHlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRUb3VycyhjaXR5Q29kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHRoZSByZXN1bHQgaXMgYSBjaXR5LCBqdXN0IHVzZSB0aGF0IGlkIGluIHRoZSBvdGhlciBycXVlc3RzXG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEuaWQ7ICBcbiAgICAgICAgICAgIGFwcC5nZXRQT0lzKGNpdHlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRUb3VycyhjaXR5Q29kZSk7XG4gICAgICAgIH0gXG4gICAgfSk7XG59XG5cbi8vIG1ldGhvZCB0byBnZXQgUE9JcyAocG9pbnRzIG9mIGludGVyZXN0KTtcbmFwcC5nZXRQT0lzID0gKGNpdHlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi9wbGFjZXMvbGlzdGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiBhcHAuc3lnaWNLZXksXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICd0YWdzX25vdCc6ICdBaXJwb3J0JyxcbiAgICAgICAgICAgICdwYXJlbnRzJzogY2l0eUNvZGUsXG4gICAgICAgICAgICAnbGV2ZWwnOiAncG9pJyxcbiAgICAgICAgICAgICdsaW1pdCc6IDIwLFxuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKT0+IHtcbiAgICAgICAgY29uc3QgcG9pbnRzID0gcmVzLmRhdGEucGxhY2VzO1xuXG4gICAgICAgIC8vIHdlIG9ubHkgd2FudCByZXN1bHRzIHRoYXQgaGF2ZSBhbiBpbWFnZSBhbmQgYSBkZXNjcmlwdGlvbnMgKHBlcmV4KVxuICAgICAgICBjb25zdCBmaWx0ZXJlZFBvaW50cyA9IHBvaW50cy5maWx0ZXIoKHBsYWNlKT0+IHtcbiAgICAgICAgICAgIHJldHVybiBwbGFjZS50aHVtYm5haWxfdXJsICYmIHBsYWNlLnBlcmV4XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyByZXN1bHRzIHRoYXQgaGF2ZSBhbiBpbWFnZSBhbmQgYSBkZXNjcmlwdGlvbiwgY2FsbCB0aGUgZGlzcGxheUVycm9yIGZ1bmN0aW9uXG4gICAgICAgIGlmIChmaWx0ZXJlZFBvaW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5RXJyb3IoJ3BvaScsICdwb2ludHMgb2YgaW50ZXJlc3QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRha2UgdGhlIGZpcnN0IDMgaXRlbXMgYW5kIHB1c2ggdGhlaXIgcHJvcGVydGllcyBvbnRvIHRoZSBhcHAuUE9JcyBvYmplY3RcbiAgICAgICAgICAgIGZpbHRlcmVkUG9pbnRzLmZvckVhY2goKHBvaW50KT0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ25hbWUnOiBwb2ludC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiBwb2ludC5wZXJleCxcbiAgICAgICAgICAgICAgICAgICAgJ3Bob3RvJzogcG9pbnQudGh1bWJuYWlsX3VybCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFwcC5QT0lzLnB1c2gocGxhY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhcHAuZGlzcGxheVBPSXMoYXBwLlBPSXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vL21ldGhvZCB0byBnZXQgY2xvc2VzdCBhaXJwb3J0XG5hcHAuZ2V0QWlycG9ydHMgPSAobGF0LCBsbmcpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9saXN0YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ3gtYXBpLWtleSc6IGFwcC5zeWdpY0tleSxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ2xvY2F0aW9uJzogYCR7bGF0fSwke2xuZ31gLFxuICAgICAgICAgICAgJ3RhZ3MnOiAnQWlycG9ydCcsXG4gICAgICAgIH1cbiAgICB9KSAudGhlbiAoKHJlcykgPT4ge1xuICAgICAgICAvLyBwdXNoIHRoZSBwcm9wZXJ0aWVzIG9udG8gYXBwLmFpcnBvcnQgb2JqZWN0XG4gICAgICAgIGFwcC5haXJwb3J0Lm5hbWUgPSByZXMuZGF0YS5wbGFjZXNbMF0ubmFtZTtcbiAgICAgICAgYXBwLmFpcnBvcnQuZGVzY3JpcHRpb24gPSByZXMuZGF0YS5wbGFjZXNbMF0ucGVyZXg7XG4gICAgICAgIGFwcC5haXJwb3J0LnBob3RvID0gcmVzLmRhdGEucGxhY2VzWzBdLnRodW1ibmFpbF91cmw7XG5cbiAgICAgICAgLy8gY2FsbCBkaXNwbGF5QWlycG9ydHMgdXNpbmcgcHJvcGVydGllcyBmcm9tIGFqYXggcmVxdWVzdFxuICAgICAgICBhcHAuZGlzcGxheUFpcnBvcnRzKGFwcC5haXJwb3J0KTtcbiAgICB9KTtcbn1cblxuLy8gbWV0aG9kIHRvIGdldCBsYW5ndWFnZVxuYXBwLmdldExhbmd1YWdlID0gKGNvdW50cnkpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxuICAgICAgICB9XG4gICAgfSkgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAubGFuZ3VhZ2UucHJpbWFyeSA9IHJlc1swXS5sYW5ndWFnZXNbMF0ubmFtZTtcbiAgICAgICAgaWYgKHJlc1swXS5sYW5ndWFnZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgYXBwLmxhbmd1YWdlLnNlY29uZGFyeSA9IHJlc1swXS5sYW5ndWFnZXNbMV0ubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBhcHAuZGlzcGxheUxhbmd1YWdlKGFwcC5sYW5ndWFnZSk7XG4gICAgfSk7XG5cbn1cblxuLy8gXG5hcHAuZ2V0VG91cnMgPSAoY2l0eUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3RvdXJzL3ZpYXRvcmAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiBhcHAuc3lnaWNLZXksXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICdwYXJlbnRfcGxhY2VfaWQnOiBjaXR5Q29kZVxuICAgICAgICB9XG4gICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgY29uc3QgbGlzdCA9IHJlcy5kYXRhLnRvdXJzO1xuICAgICAgICBjb25zdCB0b3VycyA9IGxpc3QuZmlsdGVyKChwbGFjZSk9PiB7XG4gICAgICAgICAgICByZXR1cm4gcGxhY2UucGhvdG9fdXJsICYmIHBsYWNlLnVybFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRvdXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYXBwLmRpc3BsYXlFcnJvcigndG91cnMnLCAndG91cnMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG91cnMubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG91ciA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdG91cnNbaV0udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgIHBob3RvOiB0b3Vyc1tpXS5waG90b191cmwsXG4gICAgICAgICAgICAgICAgICAgIHVybDogdG91cnNbaV0udXJsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhcHAudG91cnMucHVzaCh0b3VyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFwcC5kaXNwbGF5VG91cnMoYXBwLnRvdXJzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5hcHAuZ2V0Q3VycmVuY3kgPSAoY291bnRyeUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAuY3VycmVuY3kuY29kZSA9IHJlc1swXS5jdXJyZW5jaWVzWzBdLmNvZGU7XG4gICAgICAgIGFwcC5jdXJyZW5jeS5zeW1ib2wgPSByZXNbMF0uY3VycmVuY2llc1swXS5zeW1ib2w7XG4gICAgICAgIGFwcC5kaXNwbGF5Q3VycmVuY3koYXBwLmN1cnJlbmN5KTtcbiAgICB9KTtcbn0gICAgXG5cbmFwcC5jb252ZXJ0Q3VycmVuY3kgPSAodXNlckN1cnJlbmN5LCBkZXN0aW5hdGlvbkN1cnJlbmN5KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9mcmVlLmN1cnJlbmN5Y29udmVydGVyYXBpLmNvbS9hcGkvdjYvY29udmVydGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHE6IGAke3VzZXJDdXJyZW5jeX1fJHtkZXN0aW5hdGlvbkN1cnJlbmN5fSwke2Rlc3RpbmF0aW9uQ3VycmVuY3l9XyR7dXNlckN1cnJlbmN5fWAsXG4gICAgICAgICAgICBjb21wYWN0OiAndWx0cmEnXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgYXBwLmN1cnJlbmN5LmV4Y2hhbmdlUmF0ZSA9IHJlc1tgJHt1c2VyQ3VycmVuY3l9XyR7ZGVzdGluYXRpb25DdXJyZW5jeX1gXTtcblxuICAgICAgICAkKCcjY3VycmVuY3kgaDInKS50ZXh0KGAkMSAke3VzZXJDdXJyZW5jeX0gPSAke2FwcC5jdXJyZW5jeS5zeW1ib2x9ICR7YXBwLmN1cnJlbmN5LmV4Y2hhbmdlUmF0ZS50b0ZpeGVkKDIpfSAke2Rlc3RpbmF0aW9uQ3VycmVuY3l9YClcblxuICAgIH0pO1xufVxuXG5hcHAuZGlzcGxheUVycm9yID0gKGRpdklELCB0b3BpYykgPT4ge1xuICAgICQoYCMke2RpdklkfWApLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz4ke3RvcGljfTwvaDM+YDtcbiAgICAkKGAjJHtkaXZJRH1gKS5hcHBlbmQodGl0bGUsIGA8aDI+U29ycnksIHdlIGRvbid0IGhhdmUgZGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgJHt0b3BpY30gaW4gdGhpcyBhcmVhLiBUcnkgeW91ciBzZWFyY2ggYWdhaW4gaW4gYSByZWxhdGVkIGNpdHkgb3IgbmVhcmJ5IHJlZ2lvbi48L2gyPmApO1xufVxuXG5hcHAuZGlzcGxheUN1cnJlbmN5ID0gKG9iamVjdCkgPT4ge1xuICAgICQoJyNjdXJyZW5jeScpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5DdXJyZW5jeTwvaDM+YDtcbiAgICBjb25zdCBodG1sID0gYDxoMj5UaGUgY3VycmVuY3kgdXNlZCBpcyAke29iamVjdC5zeW1ib2x9ICR7b2JqZWN0LmNvZGV9PC9oMj5gO1xuICAgIGNvbnN0IGlucHV0ID0gYDxmb3JtIGlkPVwidXNlckN1cnJlbmN5XCI+PGlucHV0IGNsYXNzPVwidXNlckN1cnJlbmN5ICB0eXBlPVwic2VhcmNoXCIgaWQ9XCJ1c2VyXCIgcGxhY2Vob2xkZXI9XCJFbnRlciB5b3VyIGxvY2F0aW9uLlwiPjxidXR0b24gY2xhc3M9XCJzdWJtaXRcIj5Db252ZXJ0PC9idXR0b24+PC9mb3JtPmA7XG4gICAgJCgnI2N1cnJlbmN5JykuYXBwZW5kKHRpdGxlLGh0bWwsIGlucHV0KTtcbiAgICBhcHAuZ2V0VXNlckluZm8oKTtcbn1cblxuYXBwLmdldFVzZXJJbmZvID0gKCkgPT4ge1xuICAgIGFwcC5pbml0QXV0b2NvbXBsZXRlKCd1c2VyJyk7XG4gICAgJCgnI3VzZXJDdXJyZW5jeScpLm9uKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgdXNlckxvY2F0aW9uID0gJCgnI3VzZXInKS52YWwoKTtcbiAgICAgICAgYXBwLmdldFVzZXJMb2NhdGlvbih1c2VyTG9jYXRpb24pO1xuICAgIH0pO1xufVxuXG5hcHAuZ2V0VXNlckxvY2F0aW9uID0gKGxvY2F0aW9uKSA9PiB7XG4gICAgbmV3IGdvb2dsZS5tYXBzLnBsYWNlcy5BdXRvY29tcGxldGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VzZXInKSk7XG4gICAgY29uc3QgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcbiAgICBnZW9jb2Rlci5nZW9jb2RlKHtcbiAgICAgICAgJ2FkZHJlc3MnOiBsb2NhdGlvblxuICAgIH0sIChyZXN1bHRzLCBzdGF0dXMpID0+IHtcbiAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xuICAgICAgICAgICAgY29uc3QgYWRkcmVzc0NvbXBvbmVudHMgPSByZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50cy5maWx0ZXIoKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXBwLnVzZXIuY291bnRyeUNvZGUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5zaG9ydF9uYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZy4nICsgc3RhdHVzKVxuICAgICAgICB9XG4gICAgYXBwLmdldFVzZXJDdXJyZW5jeShhcHAudXNlci5jb3VudHJ5Q29kZSk7XG4gICAgfSk7ICAgIFxufVxuXG5hcHAuZ2V0VXNlckN1cnJlbmN5ID0gKGNvdW50cnlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9yZXN0Y291bnRyaWVzLmV1L3Jlc3QvdjIvbmFtZS8ke2NvdW50cnlDb2RlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGZ1bGxUZXh0OiB0cnVlXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgYXBwLnVzZXIuY29kZSA9IHJlc1swXS5jdXJyZW5jaWVzWzBdLmNvZGU7XG4gICAgICAgIGFwcC5jb252ZXJ0Q3VycmVuY3koYXBwLnVzZXIuY29kZSwgYXBwLmN1cnJlbmN5LmNvZGUpO1xuICAgIH0pO1xufVxuXG5cbmFwcC5kaXNwbGF5TGFuZ3VhZ2UgPSAob2JqZWN0KSA9PiB7XG4gICAgJCgnI2xhbmd1YWdlJykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPkxhbmd1YWdlPC9oMz5gO1xuICAgIGNvbnN0IHByaW1hcnkgPSBgPGgyPlByaW1hcnk8L2gyPjxoND4ke29iamVjdC5wcmltYXJ5fTwvaDQ+YDtcbiAgICBjb25zdCBzZWNvbmRhcnkgPSBgPGgyPlNlY29uZGFyeTwvaDI+PGg0PiR7b2JqZWN0LnNlY29uZGFyeX08L2g0PmA7XG4gICAgJCgnI2xhbmd1YWdlJykuYXBwZW5kKHRpdGxlLCBwcmltYXJ5KVxuICAgIGlmIChvYmplY3Quc2Vjb25kYXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgJCgnI2xhbmd1YWdlJykuYXBwZW5kKHNlY29uZGFyeSk7XG4gICAgfSBcbn1cblxuYXBwLmRpc3BsYXlBaXJwb3J0cyA9IChvYmplY3QpID0+IHtcbiAgICAkKCcjYWlycG9ydCcpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5DbG9zZXN0IEFpcnBvcnQ8L2gzPmA7XG4gICAgY29uc3QgbmFtZSA9IGA8aDQ+JHtvYmplY3QubmFtZX08L2g0PmA7XG4gICAgJCgnI2FpcnBvcnQnKS5hcHBlbmQodGl0bGUsIG5hbWUpO1xufVxuXG4vLyBtZXRob2QgdG8gZGlzcGxheSB0b3Vyc1xuLy8gaSByZWFsaXplZCB3aGVuIHRoZXJlJ3MgYSBsb3Qgb2YgcmVzdWx0cywgaXQncyBub3QgaWRlYWwgZm9yIG1vYmlsZSB1c2Vyc1xuLy8gc28gaSB0cmllZCBzb21lIHNpbXBsZSBcInBhZ2luYXRpb25cIiB3aGVuIHRoZSBzY3JlZW4gd2lkdGggaXMgbGVzcyB0aGFuIDYwMHB4XG4vLyBjcmVhdGUgMiB2YXJpYWJsZXMsIG9uZSB0byBhY3QgYXMgYSBcImNvdW50ZXJcIiBhbmQgb25lIHRvIGRpY3RhdGUgcmVzdWx0cyBwZXIgcGFnZVxuLy8gd2hlbiB1c2VyIGNsaWNrcyAnbG9hZCBtb3JlJywgaXQgYXBwZW5kcyB0aGUgbmV4dCB0aHJlZSByZXN1bHRzLCByZW1vdmVzIHRoZSBidXR0b24sIGFuZCBhcHBlbmRzIGEgbmV3IGJ1dHRvbiBhdCB0aGUgZW5kIG9mIHRoZSBuZXcgcmVzdWx0c1xuYXBwLmRpc3BsYXlUb3VycyA9IChhcnJheSkgPT4ge1xuICAgICQoJyN0b3VycycpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5Ub3AgVG91cnM8L2gzPmA7XG4gICAgJCgnI3RvdXJzJykuYXBwZW5kKHRpdGxlKTtcbiAgICBcbiAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgPD0gNjAwKSB7XHRcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuICAgICAgICBsZXQgcmVzdWx0c1BlclBhZ2UgPSAzO1xuICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IHJlc3VsdHNQZXJQYWdlOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmBcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gJChgPGRpdj5gKS5hcHBlbmQobmFtZSwgbGluayk7XG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChkaXYpO1xuICAgICAgICB9ICAgIFxuXG4gICAgICAgIGNvbnN0IGxvYWRNb3JlID0gYDxidXR0b24gY2xhc3M9XCJsb2FkTW9yZSBodnItZ3Jvdy1zaGFkb3dcIj5Mb2FkIE1vcmU8L2J1dHRvbj5gO1xuICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICAkKCcjdG91cnMnKS5vbignY2xpY2snLCAnLmxvYWRNb3JlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgY291bnRlcis9MztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgKGNvdW50ZXIgKyByZXN1bHRzUGVyUGFnZSk7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gXG4gICAgICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiICBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHthcnJheS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJChgPGRpdj5gKS5hcHBlbmQobmFtZSwgbGluayk7XG4gICAgICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBpZiBzY3JlZW4gd2lkdGggaXMgbm90IGxlc3MgdGhhbiA2MDBweCwgYXBwZW5kIGVsZW1lbnRzIG5vcm1hbGx5XG5cdH0gZWxzZSB7XG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2l0ZW0ubmFtZX08aDI+YDtcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2l0ZW0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBgPGEgY2xhc3M9XCJodnItdW5kZXJsaW5lLWZyb20tY2VudGVyXCIgaHJlZj1cIiR7aXRlbS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBsaW5rKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgcG9pbnRzIG9mIGludGVyZXN0XG4vLyBzYW1lIFwicGFnaW5hdGlvblwiIHN5c3RlbSBhcyB0b3Vyc1xuYXBwLmRpc3BsYXlQT0lzID0gKGFycmF5KSA9PiB7XG4gICAgJCgnI3BvaScpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5Qb2ludHMgb2YgSW50ZXJlc3Q8L2gzPmA7XG4gICAgJCgnI3BvaScpLmFwcGVuZCh0aXRsZSk7XG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcbiAgICAgICAgbGV0IHJlc3VsdHNQZXJQYWdlID0gMztcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKGA8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPmApO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7YXJyYXlbaV0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcblxuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0gICAgXG5cbiAgICAgICAgY29uc3QgbG9hZE1vcmUgPSBgPGJ1dHRvbiBjbGFzcz1cImxvYWRNb3JlIGh2ci1ncm93LXNoYWRvd1wiPkxvYWQgTW9yZTwvYnV0dG9uPmA7XG4gICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xuXG4gICAgICAgICQoJyNwb2knKS5vbignY2xpY2snLCAnLmxvYWRNb3JlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgY291bnRlcis9MztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgKGNvdW50ZXIgKyByZXN1bHRzUGVyUGFnZSk7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHthcnJheVtpXS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcbiAgICBcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGxvYWRNb3JlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGVsc2UganVzdCBhcHBlbmQgYWxsIHRoZSByZXN1bHRzIG5vcm1hbGx5XG5cdH0gZWxzZSB7ICAgIFxuICAgICAgICBhcnJheS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKGA8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPmApO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHtpdGVtLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7aXRlbS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2l0ZW0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgJCgnI3BvaScpLmFwcGVuZChkaXYpO1xuICAgICAgICB9KTtcbiAgICB9ICAgIFxufVxuXG5hcHAuZGlzcGxheVdlYXRoZXIgPSAob2JqZWN0KSA9PiB7XG4gICAgJCgnI3dlYXRoZXInKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBsZXQgZGVncmVlcyA9ICcnO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5XZWF0aGVyPC9oMz5gO1xuICAgIGNvbnN0IGljb24gPSBgPGNhbnZhcyBpZD1cIiR7b2JqZWN0Lmljb259XCIgd2lkdGg9XCI4MFwiIGhlaWdodD1cIjgwXCI+PC9jYW52YXM+YDtcbiAgICBpZiAoYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlID09PSAnVVMnKSB7XG4gICAgICAgIGRlZ3JlZXMgPSAnRic7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZGVncmVlcyA9ICdDJztcbiAgICB9XG4gICAgY29uc3QgaHRtbCA9IGA8aDI+Q3VycmVudGx5OjwvaDI+IFxuICAgIDxoND4ke29iamVjdC5jdXJyZW50VGVtcH3CsCR7ZGVncmVlc308L2g0PlxuICAgICAgICA8cCBjbGFzcz1cIndlYXRoZXJUZXh0XCI+JHtvYmplY3QuY29uZGl0aW9uc308L3A+YFxuICAgICQoJyN3ZWF0aGVyJykuYXBwZW5kKHRpdGxlLCBpY29uLCBodG1sKTtcbiAgICBhcHAubG9hZEljb25zKCk7XG59XG5cbmFwcC5yYW5kb21IZXJvID0gKCkgPT4ge1xuICAgIGxldCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTApICsgMVxuICAgICQoJy5zcGxhc2hQYWdlJykuY3NzKHtcbiAgICAgICAgJ2JhY2tncm91bmQnOiBgbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsMC4zKSwgcmdiYSgwLDAsMCwwLjMpKSwgdXJsKFwicHVibGljL2Fzc2V0cy9oZXJvJHtpfS5qcGdcIilgLFxuICAgICAgICAnYmFja2dyb3VuZC1wb3NpdGlvbic6ICdjZW50ZXInLFxuXHQgICAgJ2JhY2tncm91bmQtc2l6ZSc6ICdjb3ZlcidcdFxuICAgIH0pO1xufVxuXG5hcHAubG9hZEljb25zID0gKCkgPT4ge1xuICAgIHZhciBpY29ucyA9IG5ldyBTa3ljb25zKHtcImNvbG9yXCI6IFwiYmxhY2tcIn0pO1xuICAgIGljb25zLnNldChcImNsZWFyLWRheVwiLCBTa3ljb25zLkNMRUFSX0RBWSk7XG4gICAgaWNvbnMuc2V0KFwiY2xlYXItbmlnaHRcIiwgU2t5Y29ucy5DTEVBUl9OSUdIVCk7XG4gICAgaWNvbnMuc2V0KFwicGFydGx5LWNsb3VkeS1kYXlcIiwgU2t5Y29ucy5QQVJUTFlfQ0xPVURZX0RBWSk7XG4gICAgaWNvbnMuc2V0KFwicGFydGx5LWNsb3VkeS1uaWdodFwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfTklHSFQpO1xuICAgIGljb25zLnNldChcImNsb3VkeVwiLCBTa3ljb25zLkNMT1VEWSk7XG4gICAgaWNvbnMuc2V0KFwicmFpblwiLCBTa3ljb25zLlJBSU4pO1xuICAgIGljb25zLnNldChcInNsZWV0XCIsIFNreWNvbnMuU0xFRVQpO1xuICAgIGljb25zLnNldChcInNub3dcIiwgU2t5Y29ucy5TTk9XKTtcbiAgICBpY29ucy5zZXQoXCJ3aW5kXCIsIFNreWNvbnMuV0lORCk7XG4gICAgaWNvbnMuc2V0KFwiZm9nXCIsIFNreWNvbnMuRk9HKTtcbiAgICBpY29ucy5wbGF5KCk7XG59XG5cbmFwcC5ldmVudHMgPSAoKSA9PiB7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ2Rlc3RpbmF0aW9uJyk7XG4gICBcbiAgICAkKCdmb3JtJykub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICQoJy5jb250ZW50JykuZW1wdHkoKTtcbiAgICAgICAgJCgnLmNvbnRlbnQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hcHBlbmQoYDxpIGNsYXNzPVwiZmFzIGZhLXBsYW5lIGh2ci1pY29uIGxvYWRlclwiPjwvaT5gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gJCgnI2Rlc3RpbmF0aW9uJykudmFsKCk7XG4gICAgICAgIGlmIChkZXN0aW5hdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkKCcjc3BsYXNoUGFnZScpLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICAkKCcjY29udGVudFBhZ2UnKS50b2dnbGUodHJ1ZSk7XG4gICAgICAgICAgICAkKCdmb3JtJykucmVtb3ZlQ2xhc3MoJ3NwbGFzaFNlYXJjaEZvcm0nKTtcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbicpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hCYXInKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRCdXR0b24nKS5yZW1vdmVDbGFzcygnc3BsYXNoU2VhcmNoQnV0dG9uJyk7XG4gICAgICAgICAgICAkKCcjc3VibWl0QnV0dG9uJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hCdXR0b24nKTtcbiAgICAgICAgICAgICQoJ2Zvcm0nKS5hZGRDbGFzcygnY29udGVudFNlYXJjaEZvcm0nKTtcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbicpLmFkZENsYXNzKCdjb250ZW50U2VhcmNoQmFyJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCcjZGVzdGluYXRpb25OYW1lJykudGV4dChkZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBhcHAuZ2V0RGVzdGluYXRpb25JbmZvKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBhcHAuZGVzdGluYXRpb24gPSB7fTtcbiAgICAgICAgYXBwLndlYXRoZXIgPSB7fTtcbiAgICAgICAgYXBwLmN1cnJlbmN5PSB7fTtcbiAgICAgICAgYXBwLlBPSXMgPSBbXTtcbiAgICAgICAgYXBwLmV4Y2hhbmdlUmF0ZTtcbiAgICAgICAgYXBwLnRvdXJzID0gW107XG4gICAgICAgIGFwcC5haXJwb3J0ID0ge307XG4gICAgICAgIGFwcC5sYW5ndWFnZXMgPSB7fTtcbiAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykudmFsKCcnKTtcbiAgICB9KTtcblxuICAgICQoJyNzZWFyY2hNZW51Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJy5jb250ZW50U2VhcmNoRm9ybScpLnRvZ2dsZSgpO1xuICAgIH0pO1xufVxuXG5hcHAuaW5pdCA9ICgpID0+IHtcbiAgICBhcHAucmFuZG9tSGVybygpO1xuICAgIGFwcC5pbml0QXV0b2NvbXBsZXRlKCdkZXN0aW5hdGlvbicpO1xuICAgICQoJyNjb250ZW50UGFnZScpLnRvZ2dsZShmYWxzZSk7XG4gICAgYXBwLmV2ZW50cygpO1xufVxuXG4kKGZ1bmN0aW9uICgpIHtcbiAgICBhcHAuaW5pdCgpO1xufSk7Il19
