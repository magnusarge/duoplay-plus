/**
 * content.js
 * Duoplay Plus
 * Author: Magnus Arge
 * Created: 16.11.2023
 */
//const seenImagePath =  chrome.runtime.getURL("./images/seen-yes.png");
//const unseenImagePath =  chrome.runtime.getURL("./images/seen-not.png");

let episodes = document.querySelectorAll('a.show-seasons__episode'), i;
const currentTitle = getCurrentTitle();
let availableEpisodes = [];
let unseenEpisodes = [];
getSeenEpisodes();

function redirect(episode) {
  window.location.href = "https://duoplay.ee/" +
    currentTitle.id + "/" +
    currentTitle.slug + "?ep=" +
    episode;
}

function setSeenIcons() {

  for (i = 0; i < episodes.length; ++i) {

    const episode = episodes[i];
    const episodeNumber = getCurrentEpisodeFromString(episode.href);

    availableEpisodes.push(episodeNumber);

    const seenLink = document.createElement("a");
    seenLink.href = "#";

    const seenButton = document.createElement("div");
    seenButton.classList.add("seen-button");

    if (episodeIsSeen(episodeNumber)) seenButton.classList.add("seen");

    seenLink.appendChild(seenButton);
    episode.appendChild(seenLink);

    seenLink.onclick = function() {
      toggleEpisodeSeen(episodeNumber, seenButton);
    };

  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

function titleInfo() {
  let info = "Show: " + currentTitle.name +
    "\nTitle id: " + currentTitle.id + 
    "\nSlug: " + currentTitle.slug +
    "\nEpisodes count: " + currentTitle.episodesCount +
    "\nSeasons count: " + currentTitle.seasonsCount +
    "\nAutoplay: " + currentTitle.autoplay;
  return info;
}

function getCurrentTitle() {
  let currentTitleInfo = {
    name: getCurrentTitleName(),
    id: getCurrentTitleId(),
    slug: getCurrentTitleSlug(),
    episodesCount: getEpisodesCount(),
    seasonsCount: getSeasonsCount(),
    seenEpisodes: [],
    autoplay: getCurrentEpisodeFromWindowsLocation() < 1 ? true : false
  }

  //currentTitleInfo.autoplay = getCurrentEpisodeFromWindowsLocation() < 1 ? true : false;

  return currentTitleInfo;
}

function getSeenEpisodes() {

  function setupSeenStorage(result) {
    let val = [];
    if ( result[currentTitle.id] || result[currentTitle.id] == [] ) {
        val = result[currentTitle.id];
    } else chrome.storage.local.set({[currentTitle.id]: val});

    currentTitle.seenEpisodes = val;
    // console.log("getSeenEpisodes("+currentTitle.id+") = " + val);

    setSeenIcons();

    availableEpisodes.sort(function(a, b){return a - b});
    unseenEpisodes = getUnseenEpisodes();
    unseenEpisodes.sort(function(a, b){return a - b});

    // console.log("Viimane vaadatud episood: " + Math.max(...currentTitle.seenEpisodes));
    // console.log("Esimene nägemata episood: " + Math.min(...unseenEpisodes));

    if (currentTitle.autoplay && unseenEpisodes.length > 0) { // Redirect only if there is no episode number in address bar
      
      const firstUnseenEpisode = Math.min(...unseenEpisodes);

      if (currentTitle.seenEpisodes.length > 0) {
        
        const lastSeenEpisode = Math.max(...currentTitle.seenEpisodes);

        let largerUnseen = (arr, num) => arr.filter(n => n > num);
        const afterLastSeenEpisodes = largerUnseen(unseenEpisodes, lastSeenEpisode);

        if ( afterLastSeenEpisodes.length > 0 )
          redirect(Math.min(...afterLastSeenEpisodes)); // Go to episode after last unseen
        else
          redirect(firstUnseenEpisode);
      } else {
        redirect(firstUnseenEpisode);
      }
    } else {
      // Scroll to
      var activeEpisode = document.querySelector(".show-seasons__episode--active");
      var topPos = activeEpisode.offsetTop;
      activeEpisode.parentElement.scrollTop = topPos;

    }
    
  }

  if (currentTitle.id != 0 && currentTitle.slug.length > 0 && currentTitle.episodesCount > 0 ) {
    let gettingSeen = chrome.storage.local.get([currentTitle.id]);
    gettingSeen.then(setupSeenStorage, onError);
  }
}

function getUnseenEpisodes() {

  const difference = availableEpisodes.reduce((result, element) => { 
    if (currentTitle.seenEpisodes.indexOf(element) === -1) { 
        result.push(element); 
    } 
    return result; 
  }, []);

  difference.sort(function(a, b){return a - b});

  return difference;
}

function setSeenValue(seenEpisodes) {
  seenEpisodes = removeDuplicates(seenEpisodes);
  if (seenEpisodes != undefined) seenEpisodes.sort(function(a, b){return a - b});
  chrome.storage.local.set({ [currentTitle.id]: seenEpisodes }).then(() => {
    // console.log("Seen episodes after setSeenValue(): " + seenEpisodes);
  });
}

function removeDuplicates(array) {
  let uniqueValuesOnly = [...new Set(array)];
  let symDifference = uniqueValuesOnly.filter(x => !array.includes(x))
    .concat(array.filter(x => !uniqueValuesOnly.includes(x)));
  if ( symDifference.length > 0 ) {
    // console.log("Removed dublicate values: " + symDifference);
  }
  return uniqueValuesOnly;
}

function toggleEpisodeSeen(episodeId, seenButton) {
  if (episodeIsSeen(episodeId)) {
    // console.log("Starting to remove seen from episode "+episodeId);
    markEpisodeAsNotSeen(episodeId, seenButton);
  } else {
    // console.log("Marking episode "+episodeId+" as seen.");
    markEpisodeAsSeen(episodeId, seenButton);
  }
}

function markEpisodeAsNotSeen(episodeId, seenButton) {
  const index = currentTitle.seenEpisodes.indexOf(episodeId);
  // console.log("Index of seen episode in array: "+index);
  currentTitle.seenEpisodes.splice(index, 1);
  seenButton.classList.remove("seen");
  // console.log("Seen episodes: " + currentTitle.seenEpisodes);
  setSeenValue(currentTitle.seenEpisodes);
}

function markEpisodeAsSeen(episodeId, seenButton) {
  if (episodeId && episodeId > 0 ) {
    currentTitle.seenEpisodes.push(episodeId);
    if ( seenButton != false )
      seenButton.classList.add("seen");
    setSeenValue(currentTitle.seenEpisodes);
  }
}

function episodeIsSeen(episodeId) {
  // console.log("Seen "+episodeId);
  return currentTitle.seenEpisodes.includes(episodeId);
}

function getCurrentTitleName() {
  const titleParts = document.title.split(" - Duoplay");
  if ( titleParts.length == 2 ) return titleParts[0];
  else if ( document.title.length > 0 ) return "Ei ole valitud.";
  else return "Viga pealkirja leidmisel!"
}

function getCurrentTitleId() {
  const currentUrlParts = window.location.href.split("/");
  if (currentUrlParts[3]) return currentUrlParts[3];
  else return 0;
}

function getCurrentTitleSlug() {
  const currentUrlParts = window.location.href.split("/");
  let slug = "";
  if (currentUrlParts[4]) {
    const slugParts = currentUrlParts[4].split("?");
    if (slugParts[0]) slug = slugParts[0];
  }
  return slug;
}

function getEpisodesCount() {
  let episodes = document.querySelectorAll('a.show-seasons__episode'), i;
  return episodes.length;
}

function getSeasonsCount() {
  const seasons = document.querySelector('select.show-seasons__title');
  let seasonsCount = 0;
  if ( seasons ) {
    seasonsCount = seasons.childElementCount;
  }
  return seasonsCount;
}

function getCurrentEpisodeFromWindowsLocation() {
  const currentUrlParts = window.location.href.split("/");
  if ( currentUrlParts[4] )
    return getCurrentEpisodeFromString(currentUrlParts[4]);
  else return 0;
}

function getCurrentEpisodeFromString(episodeString) {
  const episodeStringParts = episodeString.split("=");
  let episodeNumber = 0;
  if ( episodeStringParts[1] ) episodeNumber = episodeStringParts[1];

  return episodeNumber;
}




