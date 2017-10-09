#!/usr/bin/env node
const firebase = require('firebase');
const Base64 = require('js-base64/base64.js').Base64;
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const CONFIG = require('./config.js');
require('firebase/database');

const {
  FIREBASE_CONFIG = {
    apiKey: process.env.FIREBASE_CONFIG_APIKEY,
    authDomain: process.env.FIREBASE_CONFIG_AUTHDOMAIN,
    databaseURL: process.env.FIREBASE_CONFIG_DATABASEURL,
    storageBucket: process.env.FIREBASE_CONFIG_STORAGEBUCKET,
    messagingSenderId: process.env.FIREBASE_CONFIG_MESSAGINGSENDERID
  },
  OAUTH_CONFIG = process.env.OAUTH_CONFIG.split(',')
} = CONFIG;

const ROOMMATE_ADDRESSES = {
  adam: 'asgilroy@gmail.com',
  reba: 'rebeccaannn@gmail.com',
  sarah: 'sarahjeanbigelow@gmail.com',
  travis: 'travisryanbenton@gmail.com',
  ifttt: 'trigger@applet.ifttt.com'
};

const STATIC_MONTHLY_BILLS = {
  rent: '2100.00',
  cable: '65.03'
};
const USER_SCOPED_BILLS = ['rent'];
const BILL_EMAIL_ADDRESSES = {
  utilities: 'do-not-reply@coautilities.com',
  gas: 'ebill@texasgasservice.com'
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

firebase.initializeApp(FIREBASE_CONFIG);

// firebase actions
function saveOwedBill(type, total, date, cb) {
  firebase.database().ref(`api/`).once('value')
    .then(resp => {

      // if I get the email later in the month, assume its for the following month
      const month = date.getDate() < 10 ? date.getMonth() + 1 : date.getMonth() + 2;
      const billDate = `${month}-${date.getFullYear()}`;
      const prevBillDate = `${(month-1)}-${date.getFullYear()}`;
      const bills = resp.val().bills[billDate];
      const prevBills = resp.val().bills[prevBillDate];
      const roommates = resp.val().users;
      const newBill = Object.assign({}, STATIC_MONTHLY_BILLS, { [type]: total });
      const updates = Object.assign({}, bills, newBill);
      const sendEmail = Object.keys(BILL_EMAIL_ADDRESSES).every(bill => (updates || {})[bill] || (updates || {})[type]) &&
        Object.keys(bills).length !== Object.keys(updates).length;

      if (!bills) {
        firebase.database().ref(`api/bills/${billDate}/`).set(newBill);
      } else if (!(bills || {})[type]) {
        firebase.database().ref(`api/bills/${billDate}/${type}`).set(total);
      }

      if (sendEmail) {
        // Object.keys(roommates).forEach(roommate => {
        //   console.log(`Sending email to ${roommate}`);
        //   cb(roommates, roommate, type, total, billDate, updates, prevBills);
        // });
        console.log('Sending email to ifttt');
        cb(roommates, 'travis', type, total, billDate, updates, prevBills);
        cb(roommates, 'ifttt', type, total, billDate, updates, prevBills);
      } else {
        console.log('Saved to Firebase but did not send email. We\'re either still waiting on a bill or else we\'ve already sent an email for the month')
      }
    });
};

function saveTokens(tokens) {
  firebase.database().ref('tokens/').set({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
}

console.log('Loading Firebase...');

// google api
firebase.database().ref('tokens/').once('value').then(resp => {
  console.log('Firebase loaded');

  const ACCESS_TOKEN = resp.val().access_token;
  const REFRESH_TOKEN = resp.val().refresh_token;
  const scope = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose'
  ];
  const oauth2Client = new google.auth.OAuth2(...OAUTH_CONFIG);
  const gmail = google.gmail('v1');

  function setCreds(access_token, refresh_token) {
    oauth2Client.setCredentials({
      access_token,
      refresh_token,
      token_type: 'Bearer'
    });
  }

  function updateCreds(emails, cb) {
    oauth2Client.refreshAccessToken((err, tokens) => {
      if (err) {
        console.log(err);
        return false;
      }
      saveTokens(tokens);
      setCreds(tokens.access_token, tokens.refresh_token);
      cb(BILL_EMAIL_ADDRESSES.utilities);
    });
  }

  function parseEmail(message) {
    const parts = message.payload.parts;
    let part;

    if (!parts) {
      part = {};
      part.body = message.payload.body
    } else {
      part = parts.filter(part => part.mimeType == 'text/html')[0];

      // in the case there are no text/html parts, check for
      // multipart/alternative... sort of a gross workaround
      if (!part) {
        part = message.payload.parts.filter(part => part.mimeType == 'multipart/alternative')[0].parts.filter(part => part.mimeType == 'text/html')[0];
      }
    }

    return new Buffer(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  function sendMessage(auth, roommates, roommate, type, price, date, payload, prevBills) {
    let email = '';
    const headers = {
      // 'To': 'travisryanbenton@gmail.com',
      To: ROOMMATE_ADDRESSES[roommate],
      'Subject': 'Darlington Bills',
      'Reply-to': 'travisryanbenton@gmail.com',
      'From': 'travisryanbenton@gmail.com',
      'Content-type': 'text/html',
      ifttt: 'trigger@applet.ifttt.com'
    }
    const message = () => {
      const name = roommate[0].toUpperCase() + roommate.slice(1);
      let total = 0;

      return `
        <head style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
          <meta name="viewport" content="width=device-width" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
          <title style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">IT'S RENT DAY!</title>
          <link rel="stylesheet" type="text/css" href="stylesheets/email.css" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
        </head>
        <body bgcolor="#FFFFFF" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;-webkit-font-smoothing: antialiased;-webkit-text-size-adjust: none;height: 100%;width: 100%!important;">
          <table class="body-wrap" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;width: 100%;">
            <tbody style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
              <tr style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
                <td style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;"></td>
                <td class="container" bgcolor="#FFFFFF" style="margin: 0 auto!important;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;display: block!important;max-width: 600px!important;clear: both!important;">
                  <div class="content" style="margin: 0 auto;padding: 15px;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;max-width: 600px;display: block;">
                    <table style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;width: 100%;">
                      <tbody style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
                        <tr style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
                          <td style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;">
                            <h3 style="margin: 0;padding: 0;font-family: &quot;HelveticaNeue-Light&quot;, &quot;Helvetica Neue Light&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, &quot;Lucida Grande&quot;, sans-serif;line-height: 1.1;margin-bottom: 15px;color: #000;font-weight: 500;font-size: 27px;">Hey ${name === 'Ifttt' ? 'Everyone' : name}</h3>
                            <p class="lead" style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;margin-bottom: 10px;font-weight: normal;font-size: 17px;line-height: 1.6;">Some bills came in for ${MONTHS[date.split('-')[0]-1]}.</p>
                            <p style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;margin-bottom: 10px;font-weight: normal;font-size: 16px;line-height: 1.6;">
                              ${Object.keys(payload).map(type => {
                                let difference = 0;
                                let billAmt;

                                if (roommate === 'ifttt' && USER_SCOPED_BILLS.indexOf(type) !== -1) {
                                  return '';
                                }
                                else if (USER_SCOPED_BILLS.indexOf(type) !== -1) {
                                  billAmt = parseInt(roommates[roommate][type], 10);
                                }
                                else {
                                  billAmt = parseInt(payload[type], 10)/4;
                                  difference = billAmt - (parseInt(prevBills[type], 10)/4);
                                }

                                let change = '';

                                if (difference) {
                                  change = difference && difference > 0 ?
                                    `<span style="font-size: 11px;">(<span style="color: green">+$${difference}</span> from last month)</span>` :
                                    `<span style="font-size: 11px;">(<span style="color: red">-$${Math.abs(difference)}</span> from last month)</span>`;
                                }

                                total += billAmt;
                                return roommate === 'ifttt' ?
                                  `$${billAmt} for ${type} ${change}<br>` :
                                  `<a style="color: black;" href="https://cash.me/$travisbenton/${billAmt}">$${billAmt}</a> for ${type} ${change}<br>`;
                              }).join('')}
                              ______________________<br />
                              <b>${roommate === 'ifttt' ? '' : '<a style="color: black;" href="https://cash.me/$travisbenton/${total}">'}$${total}${roommate === 'ifttt' ? '' : '</a>'} Total ${roommate === 'ifttt' ? '(Not including rent)' : ''}<br></b>
                            </p>
                            ${roommate === 'ifttt' ? '' : '<a href="https://cash.me/$travisbenton/${total}" class="btn" style="margin: 0;padding: 10px 16px;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;color: #FFF;text-decoration: none;background-color: #666;font-weight: bold;margin-right: 10px;text-align: center;cursor: pointer;display: inline-block;">Pay Now</a><br />'}
                            <p style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;margin-bottom: 10px;font-weight: normal;font-size: 14px;line-height: 1.6;"><img src="http://travisbenton.github.io/images/${Math.floor(Math.random()*25)}.gif" style="margin: 5px 0 0 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;max-width: 100%;"></p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
                <td style="margin: 0;padding: 0;font-family: &quot;Helvetica Neue&quot;, &quot;Helvetica&quot;, Helvetica, Arial, sans-serif;"></td>
              </tr>
            </tbody>
          </table>
        </body>
      `
    }

    console.log('sending email with these headers:');
    console.log(headers);

    for (let header in headers) {
      email += header += ": "+headers[header]+"\r\n";
    }
    email += "\r\n" + message();
    const base64EncodedEmail = Base64.encodeURI(email);

    gmail.users.messages.send({
      auth,
      userId: 'me',
      prettyPrint: true,
      resource: {
        raw: base64EncodedEmail
      }
    }, (err, msg) => {
      if (err) {
        console.log(err);
      } else {
        console.log(msg);
        console.log('email sent!');
      }
    });
  }

  function parseBill(type, message, auth) {
    const html = parseEmail(message);
    const totalOwed = ((parseFloat(html.split('$')[1].split('<')[0], 10))).toFixed(2);
    const date = new Date(parseInt(message.internalDate, 10));

    console.log('email found, saving to firebase')

    saveOwedBill(type, totalOwed, date,
      (roommates, roommate, type, price, date, payload, prevBills) => {
        sendMessage(auth, roommates, roommate, type, price, date, payload, prevBills);
      }
    );
  }

  function parseBills(emails, type) {
    gmail.users.messages.get({
      auth: oauth2Client,
      'userId': 'me',
      'id': emails.messages[0].id,
      'format': 'full'
    }, (err, message) => parseBill(type, message, oauth2Client));
  }

  function listRecentEmailsByAccount(account, type) {
    gmail.users.messages.list({
      auth: oauth2Client,
      userId : 'me',
      q : `from:${account}`
    }, (err, resp) => {
      if (err) {
        console.log('error!');
        console.log(err);
        return updateCreds(resp, () => listRecentEmailsByAccount(account, type));
      }
      console.log('parsing bill emails');
      return parseBills(resp, type);
    });
  }

  setCreds(ACCESS_TOKEN, REFRESH_TOKEN);
  Object.keys(BILL_EMAIL_ADDRESSES).forEach(type =>
    listRecentEmailsByAccount(BILL_EMAIL_ADDRESSES[type], type)
  );
});
