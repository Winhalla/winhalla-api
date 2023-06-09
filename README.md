# Winhalla API
This repo is the source code for [Winhalla](https://winhalla.app) as of 04/04/2023
All commit history has been deleted due to old commits containing sensitive credentials
---------

## Technical data
Made with NodeJS and express in javascript (I used to be a typescript hater)  
Tech details :
* ExpressJS http REST API (with express-sessions)
* Socket.io for realtime
* Nodemailer for mail sending (custom html rendering)
* MongoDB as database
* 3rd party auth from Google, Apple and Steam (a big PITA that one) 
* API data retrieval from Brawlhalla, Steam, Google and Apple
* TOTP password auth for admin page (was removed in a previous release though)

To understand more why all this code is here, you should take a look at the [live app](https://play.google.com/store/apps/details?id=com.winhalla.app)  
This is my first more-than-100-line project ever, that has been updated and refactored countless times.  
It has an embarrassing amount of code duplications, misoptimisation and an absence of documentation, that would take days to fix. As the gain would be close to zero since the project is no longer maintained, I decided to leave the project as is.  
Also the absence of types in JS is horrible to deal with when refactoring. I'll never start any project without typescript from now on  

---
### Quick explanation of the code if you're brave enough to go here.
**Index.js**  
Entry point of the app, supposed to be the setup of the http server, but in the course of the last-minute commits, became home to multiple endpoints as well.

---

**models/***  
All files here represent MongoDB schemas for different document types. Some are here but were never used.

---
**requests/***  
An ancient reliquary of http requests to the [Brawlhalla API](https://dev.brawlhalla.com), these files are not used anymore and have been replaced by **utils/functions/callBrawlhallaApi.js**

---
**routes/***  
(Poorly organised) endpoints. They are the core of the app. Most are self-explanatory in their name, I'll go through the ones that aren't.  

**friendLink.js**: This is the referral link system.  
**sponsorships.js**: Track sponsorships results.  
**gamemodes/**\*: All things matches-related (see app) lobbyFFA.js for matchmaking, getFFA for inside the match and exit.js to exit the match. All other files are unused and were abandoned WIPs  
**solo/***: All things quest-related  

---
**utils/***   
Functions that are either here because routes files would be too long and unreadable or because they are used multiple times. I'll go through the most important ones

**callBrawlhallaApi.js**: Used to call the Brawlhalla API to get player's stats. This is used on so many places centralizing here was important.  
**checkEveryMin.js**: Basically a cron job, multiple functions here run every 1-5m to check for match end or quest end.  
**dailyChallenge.js**: 4 functions called by endpoints in index.js   
**ffaEnd.js**: calculate rewards at end of match and close match  
**solo/***: different utils to manage quests lifecycle  

---
### A last word.
This code is not meant to be run by anyone, as adapting it to allow anyone to run it in standalone would take a long time, and would have absolutely no use.
It's merely a showcase of my coding abilities when I started programming.