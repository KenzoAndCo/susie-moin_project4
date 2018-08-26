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
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': `${latitude},${longitude}`
        }
    })
    .then((res) => {
        console.log(res);
        const data = res.data.places[0];
        console.log(data);

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            const cityCode = data.parent_ids[0];
            console.log(data.parent_ids[0]);
            console.log(cityCode);
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
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
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
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
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
        console.log(res);
        app.language.primary = res[0].languages[0].name;
        if (res[0].languages.length > 1) {
            app.language.secondary = res[0].languages[1].name;
        }
        app.displayLanguage(app.language);
    });

}

app.getTours = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/tours/viator`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parent_place_id': cityCode
        }
   }).then((res) => {
        console.log(res);
        const list = res.data.tours;
        console.log(tours);
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
            console.log(app.tours);
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
        console.log(res);
        app.currency.exchangeRate = res[`${userCurrency}_${destinationCurrency}`];
        console.log(app.currency.exchangeRate);

        $('#currency').append(`<h2>The conversion rate is ${app.currency.exchangeRate.toFixed(2)}</h2>`)

    });
}

app.displayError = (divID, topic) => {
    const title = `<h1>${topic}</h1>`;
    console.log('error');
    $(`#${divID}`).append(title, `<h2>Sorry, we don't have detailed information about ${topic} in this area. Try your search again in a nearby city or related area.</h2>`);
}


app.displayCurrency = (object) => {
    const title = `<h3>Currency</h3>`;
    const html = `<h2>The currency used is ${object.symbol} ${object.code}</h2>`;
    const input = `<form id="userCurrency"><input type="text" id="user" placeholder="Enter your location to convert."><input type="submit"></form>`;
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
            console.log(app.user.countryCode);
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
        console.log(app.user.code);
        app.convertCurrency(app.user.code, app.currency.code);
    });
}


app.displayLanguage = (object) => {
    console.log(object.name, object.nativeName);
    const title = `<h3>Language</h3>`;
    const primary = `<h2>Primary</h2><h4>${object.primary}</h4>`;
    const secondary = `<h2>Secondary</h2><h4>${object.secondary}</h4>`;
    $('#language').append(title, primary)
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    } 
}

app.displayAirports = (object) => {
    const title = `<h3>Closest Airport</h3>`;
    const name = `<h2>${object.name}</h2>`;
    const desc = `<p>${object.description}</p>`;
    const photo = `<img src="${object.photo}"/>`;
    $('#airport').append(title, name, photo, desc);
}

app.displayRestaurants = (array) => {
    const title = `<h3>Restaurants</h3>`;
    $('#restaurants').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        const photo = `<img src="${item.photo}">`;
        $('#restaurants').append(name, photo, desc);
    });
}

app.displayTours = (array) => {
    const title = `<h3>Top Tours</h3>`;
    $('#tours').append(title);
    
    if ($(window).width() <= 600) {	
        let counter = 0;
        let resultsPerPage = 3;
        for (let i = counter; i < resultsPerPage; i++) {
            const name = `<h2>${array[i].name}<h2>`
            const photo = `<img src="${array[i].photo}">`;
            const link = `<a href="${array.url}">Book Now</a>`;
            $('#tours').append(name, photo, link);
        }    

        const loadMore = `<button class='loadMore'>Load More</button>`;
        $('#tours').append(loadMore);
        $('#tours').on('click', '.loadMore', function() {
            this.remove();
            counter++;
            for (let i = counter; i < (counter + resultsPerPage); i++) {
                const name = `<h2>${array[i].name}<h2>`
                const photo = `<img src="${array[i].photo}">`;
                const link = `<a href="${array.url}">Book Now</a>`;
                $('#tours').append(name, photo, link);
            }
            $('#tours').append(loadMore);
        });
	} else {
        array.forEach((item) => {
            const name = `<h2>${item.name}<h2>`;
            const photo = `<img src="${item.photo}">`;
            const link = `<a href="${item.url}">Book Now</a>`;
            $('#tours').append(name, photo, link);
        });
    }
}

app.displayPOIs = (array) => {
    const title = `<h3>Points of Interest</h3>`;
    $('#poi').append(title);
    if ($(window).width() <= 600) {	
        let counter = 0;
        let resultsPerPage = 3;
        for (let i = counter; i < resultsPerPage; i++) {
            const name = `<h2>${array[i].name}<h2>`
            const photo = `<img src="${array[i].photo}">`;
            const link = `<a href="${array.url}">Book Now</a>`;
            $('#poi').append(name, photo, link);
        }    

        const loadMore = `<button class='loadMore'>Load More</button>`;
        $('#poi').append(loadMore);
        $('#poi').on('click', '.loadMore', function() {
            this.remove();
            counter++;
            for (let i = counter; i < (counter + resultsPerPage); i++) {
                const name = `<h2>${array[i].name}<h2>`
                const photo = `<img src="${array[i].photo}">`;
                const link = `<a href="${array.url}">Book Now</a>`;
                $('#poi').append(name, photo, link);
            }
            $('#poi').append(loadMore);
        });
	} else {    
        array.forEach((item) => {
            const name = `<h2>${item.name}<h2>`;
            const desc = `<p>${item.description}</p>`;
            const photo = `<img src="${item.photo}">`;
            $('#poi').append(name, photo, desc);
        });
    }    
}

app.displayWeather = (object) => {
    const title = `<h3>Weather</h3>`;
    const icon = `<canvas id="${object.icon}" width="128" height="128"></canvas>`;
    const html = `<h4>Current temp: ${object.currentTemp}</h4>
        <p class="weatherText">${object.conditions}</p>`
    $('#weather').append(title, icon, html);
    app.loadIcons();
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
        $('#splashPage').toggle(false);
        $('#contentPage').toggle(true);
        $('form').removeClass('splashPageSearch');
        $('#destination').removeClass('splashSearchBar');
        $('form').addClass('contentSearchForm');
        $('#destination').addClass('contentSearchBar');
        e.preventDefault();
        $('div').empty();
        const destination = $('#destination').val();
        if (destination.length > 0) {
            app.getDestinationInfo(destination);
        }
        $('#destination').val('');
        app.destination = {};
        app.weather = {};
        app.currency= {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
    });
}

app.init = () => {
    app.events();
}

$(function () {
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    console.log("ready!");
    app.init();
});