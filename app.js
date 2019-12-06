const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const LocalStrategy = require('passport-local').Strategy;
const multer = require("multer");
const path = require("path");
const User = require("./models/User");
const Images = require("./models/Images");
const port = 3000;
const app = express();

let transporter = nodemailer.createTransport({
    pool: true,
    service: "Gmail",
    secure: false, // use SSL
    auth: {
        user: "testnodeappmail@gmail.com",
        pass: "123321asddsa"
    },
    tls: {
        rejectUnauthorized: false
    }
});


mongoose.connect("mongodb://localhost:27017/imagesapp", (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log("DB connected.")
    }
})
app.use(express.static("public"));

app.use(cookieParser())

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "theImad",
    resave: false,
    saveUninitialized: false
}));




//init passport

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    function (username, password, done) {
        User.getUserByEmail(username, function (err, user) {
            if (err) throw err;
            if (!user) {
                return done(null, false, { message: 'Unknown User' });
            }
            User.comparePassword(password, user.password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password' });
                }
            });
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.getUserById(id, function (err, user) {
        done(err, user);
    });
});
//sending user object to every route.
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

const storage = multer.diskStorage({ // notice you are calling the multer.diskStorage() method here, not multer()
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
        req.session.filename = req.user._id + '-' + Date.now() + path.extname(file.originalname);
        cb(null, req.session.filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000000 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('myImage');

function checkFileType(file, cb) {
    //Allow ext
    const filetypes = /jpeg|jpg|png|gif/;
    //check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    //check mime
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

app.get("/", (req, res) => {
    res.render("index");
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect("/home");
    }
);

app.get("/register", (req, res) => {
    res.render("register")
})

app.post("/register", (req, res) => {
    const password = req.body.password;
    const password2 = req.body.password2;
    if (password === password2) {
        var newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        });

        User.createUser(newUser, async function (err, user) {
            if (err) {
                console.log(err)
            } else {
                var mailOptions = {
                    from: "Pixavue <testnodeappmail@gmail.com>", // sender address
                    to: user.email, // list of receivers
                    subject: `Thank your for registering.`, // Subject line
                    html: `<p>Hi ${user.name},</p>
                    <p>Thank you for registering.</p>
                    <p>Regards,</p>
                    <p>Team Pixavue.</p>`
                };
                // send mail with defined transport object
                await transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                        console.log(err)
                    } else
                        console.log(info);
                })
                // console.log("User Created!")
                res.redirect("/login");
            }
        })
    } else {
        console.log("Password doesn't match")
    }
})

app.get("/home", isLoggdIn, (req, res) => {
    Images.find({userId: req.user._id})
        .then((images)=>{
            res.render("home", {images})
        })
        .catch((err) => {
            console.log(err)
            res.redirect("/")
        })
})

app.get("/upload", isLoggdIn, (req, res) => {
    res.render("upload")
})

app.post("/upload", isLoggdIn, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log(err)
            res.redirect('/')
        } else {
            if (req.file == undefined) {
                res.redirect('/upload')
            } else {
                Images.create({
                    userId: req.user._id,
                    description: req.body.description,
                    name: req.body.name,
                    fileName: req.session.filename
                }).then(() => {
                    res.redirect("/home")
                })
                .catch(err => {
                    console.log(err)
                    res.redirect("/upload")
                })
            }
        }
    });
})

app.get("/getdetails/:id", (req, res)=>{
    Images.findById(req.params.id)
        .then((image)=>{
            res.render("imagedetails", {image});
        })
        .catch(err=>{
            console.log(err);
            res.redirect("/home");
        })
})

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

function isLoggdIn(req, res, next) {
    if (req.user) {
        return next();
    }
    // req.flash("error", "Login First!");
    res.redirect('/login');
}

app.listen(port, () => {
    console.log("App is listening");
})