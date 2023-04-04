const axios = require("axios");
module.exports = {
    "hammer": [{"legend": "bodvar", "weapon": "weaponone"}, {"legend": "cassidy", "weapon": "weapontwo"}, {
        "legend": "gnash",
        "weapon": "weaponone"
    }, {"legend": "scarlet", "weapon": "weaponone"}, {"legend": "sentinel", "weapon": "weaponone"}, {
        "legend": "teros",
        "weapon": "weapontwo"
    }, {"legend": "kor", "weapon": "weapontwo"}, {"legend": "yumiko", "weapon": "weapontwo"}, {
        "legend": "thor",
        "weapon": "weaponone"
    }, {"legend": "magyar", "weapon": "weaponone"}],
    "sword": [{"legend": "bodvar", "weapon": "weapontwo"}, {"legend": "hattori", "weapon": "weaponone"}, {
        "legend": "sir roland",
        "weapon": "weapontwo"
    }, {"legend": "thatch", "weapon": "weaponone"}, {"legend": "asuri", "weapon": "weapontwo"}, {
        "legend": "koji",
        "weapon": "weapontwo"
    }, {"legend": "jhala", "weapon": "weapontwo"}, {"legend": "val", "weapon": "weapontwo"}, {
        "legend": "sidra",
        "weapon": "weapontwo"
    }, {"legend": "jiro", "weapon": "weaponone"}, {"legend": "jaeyun", "weapon": "weaponone"}],
    "pistol": [{"legend": "cassidy", "weapon": "weaponone"}, {"legend": "lord vraxx", "weapon": "weapontwo"}, {
        "legend": "thatch",
        "weapon": "weapontwo"
    }, {"legend": "ada", "weapon": "weaponone"}, {"legend": "lucien", "weapon": "weapontwo"}, {
        "legend": "barraza",
        "weapon": "weapontwo"
    }, {"legend": "diana", "weapon": "weapontwo"}, {"legend": "cross", "weapon": "weaponone"}, {
        "legend": "nix",
        "weapon": "weapontwo"
    }, {"legend": "isaiah", "weapon": "weapontwo"}, {"legend": "reno", "weapon": "weaponone"}],
    "rocketLance": [{"legend": "orion", "weapon": "weaponone"}, {"legend": "lord vraxx", "weapon": "weaponone"}, {
        "legend": "sir roland",
        "weapon": "weaponone"
    }, {"legend": "scarlet", "weapon": "weapontwo"}, {"legend": "ulgrim", "weapon": "weapontwo"}, {
        "legend": "artemis",
        "weapon": "weaponone"
    }, {"legend": "vector", "weapon": "weaponone"}],
    "spear": [{"legend": "orion", "weapon": "weapontwo"}, {"legend": "gnash", "weapon": "weapontwo"}, {
        "legend": "queen nai",
        "weapon": "weaponone"
    }, {"legend": "hattori", "weapon": "weapontwo"}, {"legend": "ada", "weapon": "weapontwo"}, {
        "legend": "brynn",
        "weapon": "weapontwo"
    }, {"legend": "wu shang", "weapon": "weapontwo"}, {"legend": "mirage", "weapon": "weapontwo"}, {
        "legend": "kaya",
        "weapon": "weaponone"
    }, {"legend": "dusk", "weapon": "weaponone"}],
    "katar": [{"legend": "queen nai", "weapon": "weapontwo"}, {"legend": "sentinel", "weapon": "weapontwo"}, {
        "legend": "lucien",
        "weapon": "weaponone"
    }, {"legend": "asuri", "weapon": "weaponone"}, {"legend": "ember", "weapon": "weapontwo"}, {
        "legend": "ragnir",
        "weapon": "weaponone"
    }, {"legend": "caspian", "weapon": "weapontwo"}, {"legend": "lin fei", "weapon": "weaponone"}, {
        "legend": "mako",
        "weapon": "weaponone"
    }],
    "axe": [{"legend": "teros", "weapon": "weaponone"}, {"legend": "brynn", "weapon": "weaponone"}, {
        "legend": "barraza",
        "weapon": "weaponone"
    }, {"legend": "azoth", "weapon": "weapontwo"}, {"legend": "ulgrim", "weapon": "weaponone"}, {
        "legend": "jhala",
        "weapon": "weaponone"
    }, {"legend": "ragnir", "weapon": "weapontwo"}, {"legend": "xull", "weapon": "weapontwo"}, {
        "legend": "rayman",
        "weapon": "weapontwo"
    }, {"legend": "volkov", "weapon": "weaponone"}],
    "gauntlets": [{"legend": "kor", "weapon": "weaponone"}, {"legend": "wu shang", "weapon": "weaponone"}, {
        "legend": "val",
        "weapon": "weaponone"
    }, {"legend": "cross", "weapon": "weapontwo"}, {"legend": "mordex", "weapon": "weapontwo"}, {
        "legend": "caspian",
        "weapon": "weaponone"
    }, {"legend": "zariel", "weapon": "weaponone"}, {"legend": "rayman", "weapon": "weaponone"}, {
        "legend": "petra",
        "weapon": "weaponone"
    }, {"legend": "onyx", "weapon": "weaponone"}],
    "bow": [{"legend": "ember", "weapon": "weaponone"}, {"legend": "azoth", "weapon": "weaponone"}, {
        "legend": "koji",
        "weapon": "weaponone"
    }, {"legend": "diana", "weapon": "weaponone"}, {"legend": "yumiko", "weapon": "weaponone"}, {
        "legend": "kaya",
        "weapon": "weapontwo"
    }, {"legend": "zariel", "weapon": "weapontwo"}, {"legend": "vector", "weapon": "weapontwo"},{"legend": "munin", "weapon": "weaponone"}],
    "cannon": [{"legend": "sidra", "weapon": "weaponone"}, {"legend": "xull", "weapon": "weaponone"}, {
        "legend": "isaiah",
        "weapon": "weaponone"
    }, {"legend": "lin fei", "weapon": "weapontwo"}, {"legend": "onyx", "weapon": "weapontwo"}],
    "orb": [{"legend": "dusk", "weapon": "weapontwo"}, {"legend": "fait", "weapon": "weapontwo"}, {
        "legend": "thor",
        "weapon": "weapontwo"
    }, {"legend": "petra", "weapon": "weapontwo"}, {"legend": "reno", "weapon": "weapontwo"}],
    "scythe": [{"legend": "mirage", "weapon": "weaponone"}, {"legend": "nix", "weapon": "weaponone"}, {
        "legend": "mordex",
        "weapon": "weaponone"
    }, {"legend": "artemis", "weapon": "weapontwo"}, {"legend": "jiro", "weapon": "weapontwo"}, {
        "legend": "fait",
        "weapon": "weaponone"
    }, {"legend": "volkov", "weapon": "weapontwo"},{"legend": "munin", "weapon": "weapontwo"}],
    "greatsword": [{"legend": "jaeyun", "weapon": "weapontwo"}, {"legend": "mako", "weapon": "weapontwo"}, {
        "legend": "magyar",
        "weapon": "weapontwo"
    }]
}

