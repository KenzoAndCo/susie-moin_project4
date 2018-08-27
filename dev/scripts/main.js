// create empty object to store all methods
const app = {};

// create empty objects/arrays on app object to store the information to be used later on
app.user = {};
app.destination = {};
app.weather = {};
app.currency= {};
app.POIs = [];
app.exchangeRate;
app.tours = [];
app.airport = {};
app.language = {};
app.sygicKey = 'MOmJoKEgCz2GyFIO9dOcS5scrkSq8CkB1lPYLHe8';

// method to init Googlde Autocomplete;
// takes parameter of an id to target specific input tags
app.initAutocomplete = (id) => {
    new google.maps.places.Autocomplete(document.getElementById(id));
}

// most of the APIs we are requesting data from accept location info in the form of lat lng coords
// so we enter the user's input into Google geocoder to get lat and lng coords to use in other API requests
app.getDestinationInfo = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
        // if there is no error, filter the result so that the component is a "country"
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
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
}


// ajax call to get weather
// takes lat and lng coords as parameters
app.getWeather = (latitude, longitude) => {
    $.ajax({
        url: `https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/${latitude},${longitude}`,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    })
    .then((res) => {
        // take result and pull desired information into app.weather object
        app.weather.conditions = res.daily.summary;
        app.weather.currentTemp = Math.round(res.currently.temperature);
        app.weather.icon = res.daily.icon;
        app.displayWeather(app.weather);
        
    });
}

// i found that the points of interest and tours request works better with a city code instead of lat and lng coords
// method to get city code from lat and lng to use in other ajax requests
app.getCityCode = (latitude, longitude) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/detect-parents`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': app.sygicKey,
        },
        data: {
            'location': `${latitude},${longitude}`
        }
    })
    .then((res) => {
        const data = res.data.places[0];

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            const cityCode = data.parent_ids[0];
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } else {
        // if the result is a city, just use that id in the other rquests
            const cityCode = data.id;  
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } 
    });
}

// method to get POIs (points of interest);
app.getPOIs = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': app.sygicKey,
        },
        data: {
            'tags_not': 'Airport',
            'parents': cityCode,
            'level': 'poi',
            'limit': 20,
        }
    }).then((res)=> {
        const points = res.data.places;

        // we only want results that have an image and a descriptions (perex)
        const filteredPoints = points.filter((place)=> {
            return place.thumbnail_url && place.perex
        });

        // if there are no results that have an image and a description, call the displayError function
        if (filteredPoints.length === 0) {
            app.displayError('poi', 'points of interest');
        } else {
            // take the first 3 items and push their properties onto the app.POIs object
            filteredPoints.forEach((point)=> {
                const place = {
                    'name': point.name,
                    'description': point.perex,
                    'photo': point.thumbnail_url,
                };
                app.POIs.push(place);
            });
            app.displayPOIs(app.POIs);
        }
    });
}
//method to get closest airport
app.getAirports = (lat, lng) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': app.sygicKey,
        },
        data: {
            'location': `${lat},${lng}`,
            'tags': 'Airport',
        }
    }) .then ((res) => {
        // push the properties onto app.airport object
        app.airport.name = res.data.places[0].name;
        app.airport.description = res.data.places[0].perex;
        app.airport.photo = res.data.places[0].thumbnail_url;

        // call displayAirports using properties from ajax request
        app.displayAirports(app.airport);
    });
}

// method to get language
app.getLanguage = (country) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }) .then((res) => {
        app.language.primary = res[0].languages[0].name;
        if (res[0].languages.length > 1) {
            app.language.secondary = res[0].languages[1].name;
        }
        app.displayLanguage(app.language);
    });

}

// 
app.getTours = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/tours/viator`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': app.sygicKey,
        },
        data: {
            'parent_place_id': cityCode
        }
   }).then((res) => {
        const list = res.data.tours;
        const tours = list.filter((place)=> {
            return place.photo_url && place.url
        });
        if (tours.length === 0) {
            app.displayError('tours', 'tours');
        } else {
            for (let i = 0; i < tours.length; i ++) {
                const tour = {
                    name: tours[i].title,
                    photo: tours[i].photo_url,
                    url: tours[i].url
                };
                app.tours.push(tour);
            }
            app.displayTours(app.tours);
        }
    });
}

app.getCurrency = (countryCode) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res) => {
        app.currency.code = res[0].currencies[0].code;
        app.currency.symbol = res[0].currencies[0].symbol;
        app.displayCurrency(app.currency);
    });
}    

app.convertCurrency = (userCurrency, destinationCurrency) => {
    $.ajax({
        url: `https://free.currencyconverterapi.com/api/v6/convert`,
        method: 'GET',
        dataType: 'json',
        data: {
            q: `${userCurrency}_${destinationCurrency},${destinationCurrency}_${userCurrency}`,
            compact: 'ultra'
        }
    }).then((res) => {
        app.currency.exchangeRate = res[`${userCurrency}_${destinationCurrency}`];

        $('#currency h2').text(`$1 ${userCurrency} = ${app.currency.symbol} ${app.currency.exchangeRate.toFixed(2)} ${destinationCurrency}`)

    });
}

app.displayError = (divID, topic) => {
    $(`#${divId}`).find('i').toggle(false);
    const title = `<h3>${topic}</h3>`;
    $(`#${divID}`).append(title, `<h2>Sorry, we don't have detailed information about ${topic} in this area. Try your search again in a related city or nearby region.</h2>`);
}

app.displayCurrency = (object) => {
    $('#currency').find('i').toggle(false);
    const title = `<h3>Currency</h3>`;
    const html = `<h2>The currency used is ${object.symbol} ${object.code}</h2>`;
    const input = `<form id="userCurrency"><input class="userCurrency  type="search" id="user" placeholder="Enter your location."><button class="submit">Convert</button></form>`;
    $('#currency').append(title,html, input);
    app.getUserInfo();
}

app.getUserInfo = () => {
    app.initAutocomplete('user');
    $('#userCurrency').on('submit', function(e) {
        e.preventDefault();
        const userLocation = $('#user').val();
        app.getUserLocation(userLocation);
    });
}

app.getUserLocation = (location) => {
    new google.maps.places.Autocomplete(document.getElementById('user'));
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
        } else {
            alert('Sorry, something went wrong.' + status)
        }
    app.getUserCurrency(app.user.countryCode);
    });    
}

app.getUserCurrency = (countryCode) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res) => {
        app.user.code = res[0].currencies[0].code;
        app.convertCurrency(app.user.code, app.currency.code);
    });
}


app.displayLanguage = (object) => {
    $('#language').find('i').toggle(false);
    const title = `<h3>Language</h3>`;
    const primary = `<h2>Primary</h2><h4>${object.primary}</h4>`;
    const secondary = `<h2>Secondary</h2><h4>${object.secondary}</h4>`;
    $('#language').append(title, primary)
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    } 
}

app.displayAirports = (object) => {
    $('#airport').find('i').toggle(false);
    const title = `<h3>Closest Airport</h3>`;
    const name = `<h4>${object.name}</h4>`;
    $('#airport').append(title, name);
}

// method to display tours
// i realized when there's a lot of results, it's not ideal for mobile users
// so i tried some simple "pagination" when the screen width is less than 600px
// create 2 variables, one to act as a "counter" and one to dictate results per page
// when user clicks 'load more', it appends the next three results, removes the button, and appends a new button at the end of the new results
app.displayTours = (array) => {
    $('#tours').find('i').toggle(false);
    const title = `<h3>Top Tours</h3>`;
    $('#tours').append(title);
    
    if ($(window).width() <= 600) {	
        let counter = 0;
        let resultsPerPage = 3;
        for (let i = counter; i < resultsPerPage; i++) {
            const div = $('<div class="clearfix hvr-shadow">');
            const name = `<h2>${array[i].name}<h2>`
            const photo = `<img class="hvr-grow-shadow" src="${array[i].photo}">`;
            const link = `<a class="hvr-underline-from-center" href="${array.url}">Book Now</a>`;

            const text = $(`<div>`).append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        }    

        const loadMore = `<button class="loadMore hvr-grow-shadow">Load More</button>`;
        $('#tours').append(loadMore);
        $('#tours').on('click', '.loadMore', function() {
            this.remove();
            counter+=3;
            for (let i = counter; i < (counter + resultsPerPage); i++) {
                const div = $('<div class="clearfix hvr-shadow">');
                const name = `<h2>${array[i].name}<h2>`
                const photo = `<img class="hvr-grow-shadow"  src="${array[i].photo}">`;
                const link = `<a class="hvr-underline-from-center" href="${array.url}">Book Now</a>`;
                
                const text = $(`<div>`).append(name, link);
                div.append(photo, text);
                $('#tours').append(div);
            }
            $('#tours').append(loadMore);
        });

        // if screen width is not less than 600px, append elements normally
	} else {
        array.forEach((item) => {
            const div = $('<div class="clearfix hvr-shadow">');
            const name = `<h2>${item.name}<h2>`;
            const photo = `<img class="hvr-grow-shadow" src="${item.photo}">`;
            const link = `<a class="hvr-underline-from-center" href="${item.url}">Book Now</a>`;
            const text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        });
    }
}

// method to display points of interest
// same "pagination" system as tours
app.displayPOIs = (array) => {
    $('#poi').find('i').toggle(false);
    const title = `<h3>Points of Interest</h3>`;
    $('#poi').append(title);
    if ($(window).width() <= 600) {	
        let counter = 0;
        let resultsPerPage = 3;
        for (let i = counter; i < resultsPerPage; i++) {
            const div = $(`<div class="clearfix hvr-shadow">`);
            const name = `<h2>${array[i].name}<h2>`;
            const desc = `<p>${array[i].description}</p>`;
            const photo = `<img class="hvr-grow-shadow" src="${array[i].photo}">`;
            const text = $('<div>').append(name, desc);

            div.append(photo, text);
            $('#poi').append(div);
        }    

        const loadMore = `<button class="loadMore hvr-grow-shadow">Load More</button>`;
        $('#poi').append(loadMore);

        $('#poi').on('click', '.loadMore', function() {
            this.remove();
            counter+=3;
            for (let i = counter; i < (counter + resultsPerPage); i++) {
                const div = $(`<div class="clearfix hvr-shadow">`);
                const name = `<h2>${array[i].name}<h2>`;
                const desc = `<p>${array[i].description}</p>`;
                const photo = `<img class="hvr-grow-shadow" src="${array[i].photo}">`;
                const text = $('<div>').append(name, desc);
    
                div.append(photo, text);
                $('#poi').append(div);
            }
            $('#poi').append(loadMore);
        });
        // else just append all the results normally
	} else {    
        array.forEach((item) => {
            const div = $(`<div class="clearfix hvr-shadow">`);
            const name = `<h2>${item.name}<h2>`;
            const desc = `<p>${item.description}</p>`;
            const photo = `<img class="hvr-grow-shadow" src="${item.photo}">`;
            const text = $('<div>').append(name, desc);
            div.append(photo, text);
            $('#poi').append(div);
        });
    }    
}

app.displayWeather = (object) => {
    $('#weather').find('i').toggle(false);
    let degrees = '';
    const title = `<h3>Weather</h3>`;
    const icon = `<canvas id="${object.icon}" width="80" height="80"></canvas>`;
    if (app.destination.countryCode === 'US') {
        degrees = 'F';
    } else {
        degrees = 'C';
    }
    const html = `<h2>Currently:</h2> 
    <h4>${object.currentTemp}°${degrees}</h4>
        <p class="weatherText">${object.conditions}</p>`
    $('#weather').append(title, icon, html);
    app.loadIcons();
}

app.randomHero = () => {
    let i = Math.floor(Math.random() * 10) + 1
    $('.splashPage').css({
        'background': `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("public/assets/hero${i}.jpg")`,
        'background-position': 'center',
	    'background-size': 'cover'	
    });
}

app.loadIcons = () => {
    var icons = new Skycons({"color": "black"});
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
}

app.events = () => {
    app.initAutocomplete('destination');
   
    $('form').on('submit', (e) => {
        $('.content').empty();
        $('.content').each(function() {
            $(this).append(`<i class="fas fa-plane hvr-icon loader"></i>`);
        });
        const destination = $('#destination').val();
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
        app.currency= {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
        $('#destination').val('');
    });

    $('#searchMenu').on('click', function() {
        $('.contentSearchForm').toggle();
    });
}

app.init = () => {
    app.randomHero();
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    app.events();
}

$(function () {
    app.init();
});