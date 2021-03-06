"use strict";


define([
    'jquery',
    'underscore',
    'backbone',
    'modules/gmaps',
    'text!templates/mapTemplate.html',
], function($, _, Backbone, gmaps, mapTemplate){

    var MapView = Backbone.View.extend({

        el: '#map-container',

        initialize: function(options){
            this.choice = options[2];

            _.bindAll(
                this, 'render', 'loadTemplate', 'loadMap',
                'setPositions', 'initGeoMap', 'geoSuccess', 'geoError', 'initSearchMap'
            );
        },

        render: function(){
            console.log('Render MapView');
            var that = this;

            this.loadTemplate();
            this.map = this.loadMap();

            gmaps.event.addListenerOnce(this.map, 'idle', function(){
                // Init map based on choice of user
                if (that.choice === 'geo'){
                    that.initGeoMap();
                }

                if (that.choice === 'search'){
                    that.initSearchMap();
                }
            });
        },

        loadTemplate: function(){
            var compiledTemplate = _.template(mapTemplate);
            this.$el.html(compiledTemplate());
        },

        loadMap: function(){
            var defaultLat = 52.295627;
            var defaultLon = 5.162350
            var map = new gmaps.Map($('#map')[0], {
                center: {
                    lat: defaultLat,
                    lng: defaultLon
                },
                zoom: 15,
                disableDefaultUI: true
            });

            this.setPositions(defaultLat, defaultLon);

            return map;
        },

        setPositions: function(lat, lon){
            $('#show-flyovers').data('lat', lat);
            $('#show-flyovers').data('lon', lon);
        },

        initGeoMap: function(){
            // Check geolocation support.
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(this.geoSuccess, this.geoError);
            } else {
                // not supported
                $('.map-errors').append("Your browser doesn't support geolocation.");
            }
        },

        geoSuccess: function(position){
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            this.map.setCenter(pos);
            this.setPositions(position.coords.latitude, position.coords.longitude);
        },

        geoError: function(){
            $('.map-errors').append('Your browser likely has geolocation disabled.');
        },

        initSearchMap: function(){
            var that = this;

            var input = $('#search-input');
            input.css('display', 'inline-block');

            var searchBox = new gmaps.places.SearchBox(input[0]);
            this.map.controls[gmaps.ControlPosition.TOP_LEFT].push(input[0]);

            this.map.addListener('bounds_changed', function(){
                searchBox.setBounds(that.map.getBounds());
            });

            // Listen for the event fired when the user selects a prediction and retrieve
            // more details for that place.
            var markers = [];
            searchBox.addListener('places_changed', function() {
                var places = searchBox.getPlaces();

                if (places.length == 0) {
                    return;
                }

                // Clear out the old markers.
                markers.forEach(function(marker) {
                    marker.setMap(null);
                });
                markers = [];

                // For each place, get the icon, name and location.
                var bounds = new google.maps.LatLngBounds();
                places.forEach(function(place) {
                    var icon = {
                        url: place.icon,
                        size: new google.maps.Size(71, 71),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(17, 34),
                        scaledSize: new google.maps.Size(25, 25)
                    };

                    var geometry = place.geometry;

                    // Create a marker for each place.
                    markers.push(new google.maps.Marker({
                        map: that.map,
                        icon: icon,
                        title: place.name,
                        position: geometry.location
                    }));

                    that.setPositions(geometry.location.lat(), geometry.location.lng());

                    if (geometry.viewport) {
                        // Only geocodes have viewport.
                        bounds.union(geometry.viewport);
                    } else {
                        bounds.extend(geometry.location);
                    }
                });
                that.map.fitBounds(bounds);
            });
        },
    });

    return MapView;
});
