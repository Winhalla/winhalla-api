const videoAdEventHandler = require("./utils/videoAdEventHandler");
const inGame = require("./utils/inGame");
const express = require('express');
const http = require("http")
const app = express();
const cors = require('cors');
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client("570988062830-7qhtde1a94vjj76gsm3a9mvus4gmj88t.apps.googleusercontent.com")

//configuring server
require("dotenv").config();
const mongoose = require("mongoose");
const user = require("./models/userSchema.js"),
    config = require("./models/config"),
    linkIps = require("./models/linkIps"),
    link = require("./models/links"),
    preUser = require("./models/pre-user"),
    check = require("./utils/checkEveryMin.js"),
    {getNewChallenges, checkChallengesProgress} = require("./utils/dailyChallenge"),
    logins = require('./models/logins'),
    bcrypt = require("bcrypt"),
//Defining routes
    ffaRoutes = require("./routes/gamemodes/lobbyFFA.js"),
    getFFARoutes = require("./routes/gamemodes/getFFA.js"),
    soloRoutes = require("./routes/solo/getSolo.js"),
    exitRoutes = require("./routes/gamemodes/exit.js"),
    notificationRoutes = require("./routes/deleteNotification.js"),
    shopRoutes = require("./routes/shop.js"),
    linkRoutes = require("./routes/friendLink.js"),
    adminRoutes = require("./routes/admin"),
    pollRoutes = require("./routes/sendPollResponse"),
    informationRoutes = require("./routes/informations"),
    clanRoutes = require("./routes/clan.js"),
    authRoutes = require("./routes/auth"),
    leaderboardRoutes = require("./routes/leaderboard"),
    admobRoutes = require("./routes/admob"),
    getBIDbyUsername = require("./routes/brawlhalla/name"),
    statsRoute = require("./routes/brawlhalla/global"),
    guidesRoutes = require("./routes/guides");
const mailer = require('nodemailer')
const SteamStrategy = require("passport-steam");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local')
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const leaderboard = require("./models/leaderboard");
const loginToken = require("./models/loginTokens")

mongoose.connect(
    process.env.DB,
    {useNewUrlParser: true, useUnifiedTopology: true},
    (err) => {
        if (err) {
            return console.log(err);
        }
        console.log("Connected to database");
    }
);

let throttler = []

app.use((req, res, next) => {
    if (req.path === "/lottery/enter" || req.path.includes("/deleteNotification")) return next()
    let i = throttler.findIndex(e => e.ip === req.ip)
    let user1 = throttler[i]
    if (user1) {
        if (Date.now() - 900 * 1000 > user1.timestamp) {
            user1.requests = 1
            user1.timestamp = Date.now()
        } else if (user1.requests >= 75) {
            return res.status(429).send("Too many requests, please try again in a few minutes")
        } else user1.requests += 1
        throttler[i] = user1
        next()
    } else {
        throttler.push({ip: req.ip, requests: 1, timestamp: Date.now()})
        next()
    }
})
app.set('x-powered-by', false)
app.use(express.json());
app.use(express.urlencoded({extended: true}));
process.mailer = mailer.createTransport({
    pool: true,
    from: "Winhalla <postmaster@winhalla.app>",
    host: "SSL0.OVH.NET", // hostname
    secure: false, // use SSL
    port: 587,
    transportMethod: "SMTP",
    auth: {
        user: "postmaster@winhalla.app",
        pass: process.env.EMAIL_PWD,
    },
});
app.use(cors({origin: process.env.WEBSITE, credentials: true}));

//OAUTH STEAM + SESSIONS
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        name: "auth",
        cookie: {
            maxAge: 365 * 2 * 86400 * 1000,
            sameSite: "strict",
        },
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({mongooseConnection: mongoose.connection}),
    })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(
    new SteamStrategy(
        {
            returnURL: "http://localhost:4000/auth/redirect/steam",
            realm: "http://localhost:4000/",
            apiKey: process.env.STEAM_API_KEY,
        },
        function (identifier, profile, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {
                // To keep the example simple, th e user's Steam profile is returned to
                // represent the logged-in user.  In a typical application, you would want
                // to associate the Steam account with a user record in your database,
                // and return that user instead.
                profile.identifier = identifier;
                done(null, {
                    id: "steam" + profile._json.steamid,
                    name: profile.displayName,
                    picture: profile._json.avatarfull,
                    pictureMini: profile._json.avatarmedium
                })
            });
        }
    )
);
passport.use(new GoogleStrategy({
        clientID: "334736102140-hirk5qt92q932mdltr29574pgno6ettv.apps.googleusercontent.com",
        clientSecret: process.env.GOOGLE_API_KEY,
        callbackURL: "http://localhost:4000/auth/redirect/google"
    },
    function (accessToken, refreshToken, profile, done) {
        done(null, {
            id: "google" + profile._json.sub,
            name: profile.displayName,
            email: profile._json.email,
            picture: profile._json.picture,
            pictureMini: profile._json.picture
        })
    }
));
passport.use(new LocalStrategy(
    async function (username, password, done) {
        const userCreds = await logins.findOne({username: username})
        if (!userCreds) return done(null, false)
        if (await bcrypt.compare(password, userCreds.password)) {
            done(null, {
                id: "email" + userCreds._id.toString(),
                name: userCreds.username,
                picture: "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/b5/b599127509772f2125568318a38f24e64881de61_full.jpg",
                pictureMini: "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/b5/b599127509772f2125568318a38f24e64881de61_medium.jpg"
            })
        } else done(null, false)
    }
));
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});
app.use(
    async (req, res, next) => {
        if (req.user) return next()
        const user = await loginToken.findOne({_id: req.headers.authorization})
        if (!user) return next()
        delete user._id
        req.user = user
        req.user.type = "app"
        next()
    }
)
/*app.get('/', function (req, res) {
    console.log('Ping received get');
    console.log('ACHIVEMENT UNLOCKED')
    res.sendStatus(200);
});*/
process.bans = []

async function initConfig() {
    process.bans = await config.findOne({name: "IDs BANNED"})
    process.bans = process.bans.value.map(e => e.id)
    process.leaderboard = await leaderboard.findOne({name: "weekly players"})
    process.dbConfig = await config.find()
}

const isConfigInitialized = initConfig()

app.use(function (req, res, next) {
    if (!req.user) return next()
    if (process.bans.some(e => e == req.user.id)) {
        return res.status(401).send("User banned from the app for suspicion of hack or abuse")
    }
    next();
});
app.post("/preRegistration", async (req, res) => {
    if (!req.query.source || req.query.source === "undefined") req.query.source = "unknown"
    try {
        await preUser.create({_id: req.query.email, source: req.query.source})
    } catch (e) {
        return res.status(409).send("Already used email")
    }
    res.sendStatus(204)
})
app.get("/account", async function (req, res) {
    if (!req.user) return res.send(null)
    let user1
    if (req.user.type === "app")
        user1 = await user.findOne(
            {steamId: req.user.id, accountType:"v2"},
        );
    else
        user1 = await user.findOne(
            {steamId: req.user.id},
        );

    // Daily challenges
    if (user1 && (user1?.dailyChallenge?.lastRefresh < Date.now() - 57600000 || !user1?.dailyChallenge?.lastRefresh)) {
        user1 = await getNewChallenges(user1);
    }

    if (!user1) return res.send({steam: req.user, user: null})
    let sentUser = {...user1._doc, inGame: await inGame(user1.steamId)}
    res.send({user: sentUser, steam: req.user})
});

app.get("/GMStatus", async (req, res) => {
    res.send(process.dbConfig.find(e => e.name === "GAMEMODES STATUS"));
});

app.get("/linkConfig", async (req, res) => {
    res.send(process.dbConfig.find(e => e.name === "LINKS CONFIG").value)
})
app.post("/linkCheckpoint/:link", async (req, res) => {
    console.log("test")
    if (await link.exists({_id: req.params.link})) {
        await linkIps.updateOne(
            {ip: req.ip},
            {
                $setOnInsert: {
                    ip: req.ip,
                    createdAt: Date.now(),
                    link: req.params.link
                },
            },
            {upsert: true},
        )
    }
    res.sendStatus(200)
})

app.use("/auth", authRoutes);
//app.use("/api/global", globalRoutes);
//app.use("/api/name", nameRoutes);
app.use("/lobby", ffaRoutes);
app.use("/", getFFARoutes);
//app.use("/", get1v1Routes);
app.use("/", soloRoutes);
app.use("/", notificationRoutes);
app.use("/", exitRoutes);
app.use("/", shopRoutes);
app.use("/", pollRoutes);
app.use("/", informationRoutes);
app.use("/clan", clanRoutes);
app.use("/feltrom", adminRoutes);
app.use("/leaderboard", leaderboardRoutes)
app.use("/stats/username", getBIDbyUsername)
app.use("/admob", admobRoutes)
app.use("/stats", statsRoute)
app.use("/", guidesRoutes)
app.use("/assets",express.static('assets'))
let server = http.createServer(app)


const io = require("socket.io")(server, {cors: {origin: process.env.WEBSITE}});


process.socketio = io
process.advideo = {}
process.socketio.on("connection", (socket) => {
    socket.emit("connection", "connection etablished")
    socket.on("match connection", (id) => {

        socket.join(id)
        socket.emit("join match", "joined match " + id)
    })
    socket.on("advideo", async (state) => {
        await videoAdEventHandler(state, socket, state ? state.goal : null)
    })
});
setInterval(() => {
    Object.keys(process.advideo).forEach((e) => {
        if (!process.advideo[e]) return
        if (process.advideo[e].timestamp < Date.now() / 1000 - 30) {
            delete process.advideo[e]
        }
    })
}, 30000)
/*async function test() {
    const user = require("./models/userSchema")
    console.log(await user.updateOne({steamId: "steam76561198417157310"}, {
        $inc: {
            coins: -100,
            "coinLogs.total.redeemed": 100
        },
        $set: {lastPayout: Date.now()},
        $push: {
            "coinLogs.history": {
                type: "redeem",
                displayName: "Paypal credit",
                data: {reward: 100, name: "Coins redeemed"},
                timestamp: Date.now(),
            }
        }
    }))
}*/
isConfigInitialized.then(() => {
    server.listen(4000)
    console.log("HTTPS API SERVER RUNNING")
    // const callBrawlhallaApi = require('./utils/functions/callBrawlhallaApi')
    // let i=await callBrawlhallaApi([{BID:2,name:"2"},{BID:3,name:"3"},{BID:23536587367,name:"4"}],"stats",null,false)
    // test()
})
let nb = 0
check()