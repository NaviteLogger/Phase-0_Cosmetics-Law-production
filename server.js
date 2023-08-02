//Import required modules
const express = require('express');
const path = require('path');
// For connecting to the MySQL database
const mysql = require('mysql2');
// For parsing the request body
const bodyParser = require('body-parser');
// For sending emails
const nodemailer = require('nodemailer');
// For authentication
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
//For logging requests
const morgan = require('morgan');
//For file manipulation
const fs = require('fs');

//Load environment variables from the .env file
require('dotenv').config();

//Create the Express application
const app = express();

//Create a connection to the MySQL database
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

//Parse JSON bodies (as sent by HTML forms)
app.use(bodyParser.json());

//Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

//Set up the view engine
app.set('view engine', 'ejs');

//Serve static files from the 'styles' directory
app.use('/styles', express.static(path.join(__dirname, 'styles')));

//Serve static files from the 'photos' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

//Serve static files from the 'pages' directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

//Serve static files from the 'scripts' directory
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

//Serve static files from the 'fonts' directory
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

//Include the session middleware for user's session management
app.use(
  session({
    secret: 'secret', //This is to be changed in production: we need a more secure secret
    resave: false,
    saveUninitialized: false,
    cookie: { expires: false }
}));

//Passport initialization
app.use(passport.initialize());
app.use(passport.session());
//Enables flash messages
app.use(flash());

//Set up the morgan logger
// Define a custom morgan format that includes the IP address
morgan.token('client-ip', (req) => {
  return req.ip || '-';
});

//Define a new morgan token 'date' for the timestamps
morgan.token('date', (req, res, tz) => {
  return new Date().toISOString();
});

// Use the custom morgan format to log requests, including the IP address
app.use(morgan(':date :client-ip - :method :url :status :response-time ms'));


//Set up the nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SENDGRID_USERNAME,
    pass: process.env.SENDGRID_API_KEY,
  }
});

//Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error('An error occurred while connecting to the DB:', err);
    throw err;
  }
  console.log('Successfully connected to the MYSQL database!');
});

//Select the 'CosmeticsLawDB' database
connection.query('USE CosmeticsLawDB', (error, results, fields) => {
  if (error)
  {
    return done(error);
  }
  console.log('Selecting CosmeticsLawDB by default was successful');
});

//Render the home page from the default domain
app.get('/', (req, res) => {
  console.log('Home page rendered');
  res.redirect('/pages/indexPage.html'); // Redirect to main page
});

//Render the home page from the 'pages' directory
app.get('/pages/indexPage.html', (req, res) => {
  console.log('Home page rendered');
  res.redirect('/pages/indexPage.html'); // Redirect to main page
});

//Sets up the local passport strategy for authenticating users
passport.use(
  new LocalStrategy(
    {
      // By default, local strategy uses username and password, we will override usernameField with email
      usernameField: 'email',
      passwordField: 'password',
    },
    // This function is called when a user tries to sign in
    (email, password, done) => {
      //First, check if the given email exists in the database
      connection.query('SELECT * FROM Clients WHERE email = ?', [email], function (error, results) {
        if (error)
        {
          return done(error);
        }

        //If the given email does not exist in the database, return an error message
        if (results.length === 0) // 3 equals signs are used to check if the value and type are the same
        {
          console.log('Given email: ' + email + ' does not exist in the database.');
          return done(null, false, { message: 'Given email does not exist in the database.' });
        }
          else //Now we know that the given email exists in the database
        {
          //Let's console.log it for debugging purposes
          console.log('Given email: ' + email + ' exists in the database.');
          //Now it is time to compare the given password with the password stored in the database
          bcrypt.compare(password, results[0].password, function (error, response) {
            //Console.log it for debugging purposes
            console.log(results[0]);
            if (error)
            {
              return done(error);
            }
            else if (response) //If the passwords match, return the 'user' object
            {
              return done(null, results[0]);
            }
            else //If the passwords do not match, return an error message
            {
              console.log('User entered an incorrect password');
              return done(null, false, { message: 'Incorrect password entered.' });
            }        
          });
        }
      });
    }
  )
);

//This is the function that is called when a user tries to log in - it will serialize (store) the user in the session
//The result of the serializeUser method is attached to the session as javascript
//object: req.session.passport.user = { client_id: '...', email: '...' }.
passport.serializeUser((user, done) => {
  //Console.log it for debugging purposes
  console.log('Serializing the user: user.client_id: ' + user.client_id + ' user.email: ' + user.email);
  done(null, { id: user.client_id, email: user.email }); //Keeps the client_id and email in the session for further use
});

//This is the function that is called when a user tries to access a page - it will deserialize (retrieve) the user from the session
passport.deserializeUser((user, done) => {
  //Retrive the id and email from the session
  const { id, email } = user;

  //Console.log it for debugging purposes
  console.log('Deserializing the user: ' + id + ' ' + email);

  //Query the database to find the user with the given id
  connection.query('SELECT * FROM Clients WHERE client_id = ?', [id], (error, rows) => {
    //If the user is not found, return an error message, otherwise return the user object
    done(error, rows[0]);
  });
});

//This is the function that will deal with the login request
app.post('/login', (req, res, next) => {
  //Console.log it for debugging purposes
  console.log('Received a request to login, calling passport.authenticate');
  //Call the authenticate function of passport, using the 'local' strategy
  passport.authenticate('local', (error, user, info) => {
    if (error)
    {
      return next(error);
    }

    //If there is an error with the user object, return the error message
    if (!user)
    {
      console.log('Info: ' + info.message); // Log the info.message containing the error message

      //Return the appropriate error message
      if(info.message === 'Given email does not exist in the database.')
      {
        return res.json({ status: 'not_found', message: 'Podany adres email nie istnieje w bazie danych' });
      }
        else if(info.message === 'Incorrect password entered.')
      {
        return res.json({ status: 'incorrect_password', message: 'Podano niepoprawne hasło' });
      }
        else
      {
          return res.json({ status: 'unknown_error', message: info.message });
      }
    }

    //If there are no error with the user object, log the user in
    req.logIn(user, (error) => {
      if (error)
      {
        return next(error);
      }
      return res.json({ status: 'logged_in', message: 'Zalogowano do serwisu' });
    });
  })(req, res, next); //Call the authenticate function
});

//This is the function which checks if the user is authenticated
function checkAuthentication(req, res, next) {
  console.log('Checking authentication, calling checkAuthentication()');
  console.log('User is authenticated: ' + req.isAuthenticated());
  if (req.isAuthenticated()) //If the user is authenticated (the res.isAuthenticated() status is true), call next()
  {
    //if user is looged in, req.isAuthenticated() will return true 
    console.log('User is authenticated');
    return next(); //As this will act as a middleware, we must call next() to pass the request to the next function
  }
    else 
  {
    console.log('User is not authenticated');
    res.sendFile(path.join(__dirname, '/pages/NotLoggedInPage.html')); //If the user is not authenticated, redirect the user to the login page
  }
}

//This is the function that will check if the user's mail is verified
function checkEmailConfirmation(req, res, next) {
  const email = req.session.passport.user.email; 

  console.log('Checking email confirmation for: ' + email + ', calling checkEmailConfirmation()');

  //Query the database to find the user with the given email
  connection.query('SELECT * FROM Email_Verifications WHERE client_id = (SELECT client_id FROM Clients WHERE email = ?)', [email], (error, results) => {
    if (error) {
      console.log('Error while querying the database', error);
    }

    if (results[0].is_verified === 1) {
      console.log('Email: ' + email + ' is verified');
      return next();
    }
      else
    {
      console.log('Email: ' + email + ' is not yet verified');
      res.sendFile(path.join(__dirname, 'protected', 'EmailVerificationPage.html'));
      //res.json({ status: 'not_verified', message: 'Email nie został potwierdzony' });  
    }
  });
}

app.post('/verifyEmailAddress', (req, res) => {
  const email = req.body.email;
  const emailVerificationCode = req.body.emailVerificationCode;

  console.log('Verifying email: ', email);
  
  //Check if the input code is correct
  connection.query('SELECT verification_code FROM Email_Verifications WHERE client_id = (SELECT client_id FROM Clients WHERE email = ?)', [email], (error, results) => {
    if (error) 
    {
      console.log('Error while querying the database', error);
    }

    //Console.log it for debugging purposes
    console.log('Email verification code from the database: ' + results[0].verification_code);

    if (results[0].verification_code == emailVerificationCode) //The results[0] is an array of objects, so we need to access the first element of the array
    {
      console.log('Email verification code is correct');
      //Update the database to set the is_verified column to 1
      connection.query('UPDATE Email_Verifications SET is_verified = 1 WHERE client_id = (SELECT client_id FROM Clients WHERE email = ?)', [email], (error, results) => {
        if (error) 
        {
          console.log('Error while querying the database', error);
        }
        console.log('Email: ' + email + ' is now verified');
        res.json({ status: 'email_verified', message: 'Email został potwierdzony' });
      });
    }
      else
    {
      console.log('Email verification code: ' + emailVerificationCode + ' does not match the email: ' + email);
      res.json({ status: 'incorrect_code', message: 'Podany kod weryfikacyjny nie pasuje do adresu email'});
    }
  });
});

//This is the function that will deal with the request to a protected page,
//although at first it is the app.get('checkIfAuthenticated') function that will be called
app.get('/clientsPortalPage', checkAuthentication, checkEmailConfirmation, async (req, res) => {
  
  //Access the user email stored in the session
  const userEmail = req.session.passport.user.email;

  //Console.log it for debugging purposes
  console.log("Received a request to the client's portal: ", userEmail);
  /*
  Using that email let's retrieve the client_id from the database
  and then use that client_id to retrieve the agreement_id from the
  Agreements_Ownerships table
  */
  await new Promise((resolve, reject) => {
    /*
    This long query will return the agreement_name of the agreements
    that are owned by the client with the given email: I needed to 
    join the Agreements and Agreements_Ownerships tables on the agreement_id field
    (the agreement_id key exists in both tables). 
    This allows me to select the agreement_name from the Agreements table for each 
    agreement_id that the client owns in the Agreements_Ownerships table
    */
    connection.query(`
      SELECT Agreements.agreement_name
      FROM Agreements 
      INNER JOIN Agreements_Ownerships ON Agreements.agreement_id = Agreements_Ownerships.agreement_id 
      WHERE Agreements_Ownerships.client_id = (SELECT client_id FROM Clients WHERE email = ?)
      `, [userEmail], (error, results) => {
        if (error)
        {
          console.log('Error while querying the database', error);
        }

        if (results.length === 0) //The user has no agreements assigned to his account
        {
          console.log('Found no agreements associated with the account: ' + userEmail);
        }
          else
        {
          console.log('Found the following agreements associated with the account: ' + userEmail);
          results.forEach((row) => {
          console.log(row.agreement_name)
          });
          resolve(results);
        }
    });
  });

  //Console.log it for debugging purposes
  console.log("Received a request to the client's portal, agreements' lookup query run successfully: ", userEmail);

  //Send the client's portal page, iff the user is authenticated
  res.render('ClientsPortalPage', { agreements: results, email: userEmail });
});

//Handle registration requests
app.post('/register', async (req, res) => {
  try {

    //Convert the incoming request body to JSON and extract the email and password values
    const { email, repeatedEmail, password, repeatedPassword } = req.body;

    console.log('Incoming registration email: ' + email);

    //This section of the code will deal with email and password validation from the server side:

    //Regular expression for email validation
    let emailRegularExpression = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/i;

    //Regular expression for SQL Injection prevention
    let sqlInjectionPrevention = /[<>"'/\\|?=*]/;

    //Define max length of the email and password
    const MaxLength = 50;

    //Check if the email is valid
    if (!emailRegularExpression.test(email) || !emailRegularExpression.test(repeatedEmail))
    {
      res.json({ message: 'Adres email zawiera niedozwolone znaki!' });
    }

    //Check if the email is within acceptable length
    if (email.length > MaxLength || email.length < 1 || repeatedEmail.length > MaxLength || repeatedEmail.length < 1) 
    {
      res.json({ message: 'Email must be between 1 and 50 characters long!' }); 
    }

    //Check if the password is within acceptable length
    if (password.length > MaxLength || password.length < 1 || repeatedPassword.length > MaxLength || repeatedPassword.length < 1)
    {
      res.json({ message: 'Password must be between 1 and 50 characters long!' });
    }

    //Check if the password is valid
    if (sqlInjectionPrevention.test(password) || sqlInjectionPrevention.test(repeatedPassword))
    {
      res.json({ message: 'Hasło zawiera niedozwolone znaki!' });
    }    

    //Check if the email and repeated email are the same
    if (email !== repeatedEmail)
    {
      res.json({ message: 'Podano różne adresy email!' });
    }

    //Check if the password and repeated password are the same
    if (password !== repeatedPassword)
    {
      res.json({ message: 'Podano różne hasła!' });
    }

    /*
    At this point the email and password are valid
    We are ready to insert email and password into the database here    
    First, we need to check if the user already exists in the database
    */

    //Check if the user exists in the 'Clients' table
    const results = await new Promise((resolve, reject) => {
      connection.query('SELECT * FROM Clients WHERE email = ?', [email], function (error, results, fields) {
        if (error) 
        {
          reject(error);
        } 
          else 
        {
          console.log("The user's lookup query involving: " + email +" was successful");
          //'resolve' is the function that will be called if the query is successful,
          //returing the results of the query as 'results'
          resolve(results);
        }
      });
    });

    //Check if the user exists in the 'Clients' table
    if (results.length > 0)
    {
      console.log('User already exists in the database');
      //Provide feedback if the user already exists in the database (judging by the email)
      res.json({ message: 'Posiadasz już konto na naszym portalu, zaloguj się zamiast rejestracji' });
    }
      else
    {
      console.log('User ' + email + ' does not exist in the database');
      //At this point we are ready to insert the user into the database
      //First we need to generate salt and hash the password
      async function hashPassword(plainPassword) {
        //Generate a salt
        const salt = await bcrypt.genSalt(10);

        //Hash the password
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        console.log('The password has been hashed');
        //The password is hashed and ready to be inserted into the database
        return hashedPassword;
      }

      //Generate salt and hash the password
      const hashedPassword = await hashPassword(password);

      //Let's insert the email and hashed password into the 'Clients' table
      await new Promise((resolve, reject) => {
        connection.query('INSERT INTO Clients (email, password) VALUES (?, ?)', [email, hashedPassword], function (error, results, fields) {
          if (error)
          {
            reject(error);
          }
            else
          {
            console.log("The query was successful: email and hashed password were inserted into the Clients table");
            //This 'resolve' resolves the promise withouy returning anything,
            //because we don't need to return anything here, program flow will continue
            resolve();
          }
        });
      });

      //Send a confirmation email to the user
      //First we need to generate a random 6-digit number that will serve as a verification code
      let verificationCode = Math.floor(100000 + Math.random() * 900000);
      //The tinyint(1) variable will be responsible for handling the email verification status
      let isVerified = 0;  

      //Also, we need to insert the current date into the Email_Verifications table
      const currentDate = new Date();

      //Format it so that it can be inserted into the mysql database
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); //January is 0!
      const day = String(currentDate.getDate()).padStart(2, '0'); //.padStart() method is used to add a leading zero if the day is a single digit number
      
      const mysqlFormattedDate = `${year}-${month}-${day}`;
      console.log("Today's date is: " + mysqlFormattedDate + " (in the mysql date format");

      //Insert the client_id into the 'EmailVerifications' table
      await new Promise((resolve, reject) => {
        connection.query('INSERT INTO Email_Verifications (client_id, verification_code, is_verified, account_created_date) VALUES ((SELECT client_id FROM Clients WHERE email = ?), ?, ?, ?)', [email, verificationCode, isVerified, mysqlFormattedDate], function (error, results, fields) {
          if (error)
          {
            reject(error);
          }
            else
          {
            console.log('The query was successful: client_id, verification_code and is_verified inserted into the EmailVerifications table');
            resolve();
          }
        });
      });

      //Set up the email options
      const mailOptions = {
        from: 'kacprzakmarek92@gmail.com',
        to: email,
        subject: 'Potwierdzenie rejestracji adresu email',
        text: 'Twój kod potwierdzający adres email to: ' + verificationCode,
        html: '<strong>Twój kod potwierdzający adres email to: ' + verificationCode + '</strong>',
      };

      //Send test email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error)
        {
          console.log('Error occurred while sending email:' + error.message);
        }
          else
        {
          console.log('Email sent successfully!', info.response);
        }
      });

      res.json({ message: 'Rejestracja przebiegła pomyślnie, sprawdź swoją skrzynkę pocztową w celu potwierdzenia adresu email' });

    }
  } catch (error) {
    console.error('An error occurred during registration:', error);
  }
});  

//Handle the incoming GET request to the OfferPage
app.get('/offerPage', async (req, res) => { //if there is a href='/offerPage' in the html file, then this function will be executed
  console.log('GET request to the OfferPage');

  await new Promise((resolve, reject) => {
    connection.query('SELECT * FROM Agreements', function (error, results, fields) {
      if (error)
      {
        reject(error);
      }
        else
      {
        console.log('The query was successful: all the offers were retrieved from the Offers table');
        res.render('OfferPage', { files: results });
        resolve();
      }
    });
  });
});

//Prevent the idling of the db connection
setInterval(function () {
  connection.query('SELECT 1');
}, 60000);

//Start the server
const port = 80;
app.listen(port, () => {
  console.log('Server is starting');
  console.log(`Server is running on port ${port}`);
});