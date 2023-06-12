//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "meowdogcat",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
    email: String,
    password: String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
   
  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));






app.get("/", (req, res) => {
    res.render("home");
});

////googlestuff////
app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
);
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});
////googlestuff////


app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});
app.get("/secrets", (req, res) => {
  User.find({secret: {$ne: null}},)
  .then(foundUsers=>{
    if (foundUsers,err){
        console.log(err);
        
    }else{
    if (foundUsers) {
    res.render("secrets", {usersWithSecrets :foundUsers});
} 
    }
  });
 

});
app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});
app.get("/submit", (req, res) => {
   
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});
app.post("/submit",function(req, res){
const submittedSecret =req.body.secret;
console.log(req.user.id);

User.findById(req.user.id)
.then(foundUser=>{
    if (foundUser,err){
        console.log(err);
        
    }else{
        foundUser.secret =submittedSecret;
        foundUser.save();
        res.redirect("/secrets");
    };
})

});
app.post("/register", (req, res) => {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/reqister");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })
});


app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    })
});



app.listen(port, function () {
    console.log("Server started successfully");
});
