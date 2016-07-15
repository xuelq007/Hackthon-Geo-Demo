/* global geolocator */

(function app() {
  'use strict';

  var showHomePage = function showHomePage(toShow) {
        var homeContainer = document.getElementById('home-container'),
            contentContainer = document.getElementById('content-container'),
            header = document.getElementById('header'),
            homeSty = toShow ? 'block' : 'none',
            contentSty = toShow ? 'none' : 'block';
        if (homeContainer) {
          homeContainer.style.display = homeSty;
        }
        if (contentContainer) {
          contentContainer.style.display = contentSty;
        }
        if (header && homeSty === 'none') {
          header.classList.add('content-header');
        }
      },

      showContentView = function showContentView(type) {
        var contentContainer = document.getElementById('content-container');

        if (type === 'map') {
          contentContainer.classList.add('map-view');
          contentContainer.classList.remove('list-view');
        }
        else if (type === 'list') {
          contentContainer.classList.remove('map-view');
          contentContainer.classList.add('list-view');
        }
      },

      syncSearchText = function syncSearchText() {
        var searchInContentPage = document.querySelector('.content-container .addressInput'),
            searchInHomePage = document.querySelector('.home-container .addressInput');
        if (searchInContentPage.value.trim() === '') {
          searchInContentPage.value = searchInHomePage.value;
          document.querySelector('.content-container .search-bar .clearInput').style.visibility = 'visible';
        }
      },

      onKey = function onKey(e) {
        if (e.target.click && e.keyCode === 13) {
          e.target.click();
        }
      };

  window.coords = window.coords || {};

  if (geolocator) {
    geolocator.config({
      google: {
        key: 'AIzaSyAQ9aheR4s14JpBquPMk8bVf1mQ4pVh0tg',
      },
    });

    geolocator.locate({
      enableHighAccuracy: true,
      timeout: 1000,
      maximumAge: 0,
      desiredAccuracy: 30,
      fallbackToIP: true,
    }, function response(err, location) {
      if (!err) {
        window.coords.latitude = location.coords.latitude;
        window.coords.longitude = location.coords.longitude;
      }
    });
  }

  window.getAjax = function getAjax(url, success, failure) {
    var xhr = new XMLHttpRequest();

    if (!xhr) {
      return;
    }

    xhr.open('GET', url, true);

    xhr.onreadystatechange = function onreadystatechange() {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      if (xhr.status === 200) {
        success(xhr.response);
      }
      else {
        failure(xhr.response);
      }
    };

    xhr.send();
  };

  document.addEventListener('geo.details', function detailView() {
    var actionBar = document.getElementById('action-bar');
    if (actionBar) {
      actionBar.classList.add('details-view');
    }
  });

  document.addEventListener('geo.cards', function detailView() {
    var actionBar = document.getElementById('action-bar');
    if (actionBar) {
      actionBar.classList.remove('details-view');
    }
  });

  document.addEventListener('searchPhoto', function searchPhoto(e) {
    var url = '',
        args = e.detail;

    if (args.type === 'byTag') {
      url = '/flickr/photo/search?tags=' + args.data + '&sort=interestingness-desc&extras=geo,owner_name,description,date_taken,tags,views,count_faves,url_c,url_n&per_page=20';
    }
    else {
      url = '/flickr/photo/search?lat=' + args.data.lat + '&lon=' + args.data.lon + '&sort=interestingness-desc&extras=geo,owner_name,description,date_taken,tags,views,count_faves,url_c,url_n&per_page=20';
    }

    window.getAjax(url, function success(data) {
      var event = new CustomEvent('geo.cards', { detail: JSON.parse(data) });
      document.dispatchEvent(event);
    }, function failure(err) {
      console.log('err', err);
    });

    showHomePage(false);
    showContentView('list');
    syncSearchText();
  });

  window.addEventListener('DOMContentLoaded', function appDCL() {
    var geoIcon = document.getElementById('geo-icon'),
        listIcon = document.getElementById('listIcon'),
        mapIcon = document.getElementById('mapIcon');
    if (geoIcon) {
      geoIcon.addEventListener('click', function click() {
        var url = '';
        if (window.coords && window.coords.latitude && window.coords.longitude) {
          url = '/flickr/photo/search?lat=' + window.coords.latitude + '&lon=' + window.coords.longitude + '&sort=interestingness-desc&extras=geo,owner_name,description,date_taken,tags,views,count_faves,url_c,url_n&per_page=20';

          window.getAjax(url, function success(data) {
            var event = new CustomEvent('geo.cards', { detail: JSON.parse(data) });
            document.dispatchEvent(event);
          }, function failure(err) {
            console.log('err', err);
          });

          showHomePage(false);
          showContentView('map');
        }
        else {
          alert('Wait for a second and retry, or search the place instead.');
        }
      });

      geoIcon.addEventListener('keypress', function keypress(e) {
        onKey(e);
      });
    }

    if (listIcon) {
      listIcon.addEventListener('click', function listIconClick() {
        showContentView('list');
      });
      listIcon.addEventListener('keypress', function keypress(e) {
        onKey(e);
      });
    }

    if (mapIcon) {
      mapIcon.addEventListener('click', function mapIconClick() {
        showContentView('map');
      });
      mapIcon.addEventListener('keypress', function keypress(e) {
        onKey(e);
      });
    }
  }
  );
}());
