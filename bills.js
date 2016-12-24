const firebase = require('firebase');
var Base64 = require('./node_modules/js-base64/base64.js').Base64;
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const config = require('./config');
require('firebase/database');

firebase.initializeApp(config.FIREBASE_CONFIG);

// firebase actions
function saveOwedBill(type, total, date, cb) {
  firebase.database().ref(`api/`).once('value')
    .then(resp => {
      const bills = resp.val().bills[date];
      const roommates = resp.val().users;

      function dispatchEmails (payload) {
        // Object.keys(roommates).forEach(roommate => {
        //   cb(roommates, roommate, type, total, date, payload);
        // });
        cb(roommates, 'travis', type, total, date, payload);
      }

      if (!bills) {
        const payload = Object.assign(config.STATIC_MONTHLY_BILLS, { [type]: total });
        firebase.database().ref(`api/bills/${date}/`).set(payload);
        dispatchEmails(payload);
      } else if (!(bills || {})[type]) {
        firebase.database().ref(`api/bills/${date}/${type}`).set(total);
        dispatchEmails();
      }
    });
};

function saveTokens(tokens) {
  firebase.database().ref('tokens/').set({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
}

// google api
firebase.database().ref('tokens/').once('value').then(resp => {
  const ACCESS_TOKEN = resp.val().access_token;
  const REFRESH_TOKEN = resp.val().refresh_token;
  const scope = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose'
  ];
  const oauth2Client = new google.auth.OAuth2(...config.OAUTH_CONFIG);
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
      cb(config.EMAIL_ADDRESSES.utilities);
    }); 
  }

  function parseEmail(message) {
    let part = message.payload.parts.filter(part => part.mimeType == 'text/html')[0];
    // in the case there are no text/html parts, check for 
    // multipart/alternative... sort of a gross workaround
    if (!part) {
      part = message.payload.parts.filter(part => part.mimeType == 'multipart/alternative')[0].parts.filter(part => part.mimeType == 'text/html')[0];
    }
    return new Buffer(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  function sendMessage(auth, roommates, roommate, type, price, date, payload) {
    let email = '';
    const headers = {
      // 'To': 'travisryanbenton@gmail.com',
      To: config.ROOMMATE_ADDRESSES[roommate],
      'Subject': 'Darlington Bills',
      'Reply-to': 'travisryanbenton@gmail.com',
      'From': 'travisryanbenton@gmail.com',
      'Content-type': 'text/html'
    }
    const message = () => {
      const name = roommate[0].toUpperCase() + roommate.slice(1);
      if (payload) {
        let total = 0;
        return `
          Hi ${name}, some bills came in for ${date}:<br/>
          ${Object.keys(payload).map(type => {
            let billAmt;

            if (config.USER_SCOPED_BILLS.indexOf(type) !== -1) {
              billAmt = parseInt(roommates[roommate][type], 10);
            } else {
              billAmt = parseInt(payload[type], 10)/4;
            }

            total += billAmt;
            return `<a href="https://cash.me/$travisbenton/${billAmt}">$${billAmt} for ${type}</a><br>`
          }).join('')}
          Or you could pay the total ($${total}) by clicking <a href="https://cash.me/$travisbenton/${total}">here</a>
        `
      }

      return `
        Hi ${name}. A bill came in for ${type} this month (${date}). The total is $${price}<br />
        <a href="https://cash.me/$travisbenton/${price}">Click here to pay</a>
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
    // if I get the email later in the month, assume its for the following month
    const month = date.getDate() < 10 ? date.getMonth() : date.getMonth() + 1;
    const billDate = `${month}-${date.getFullYear()}`;

    console.log('---------=======--------');
    console.log(`${type} bill for the month of ${month}: $${totalOwed}`);
    console.log('---------=======--------');

    saveOwedBill(type, totalOwed, billDate, 
      (roommates, roommate, type, price, date, payload) => {
        console.log('===================')
        console.log(roommates)
        console.log(roommate)
        console.log('===================')
        sendMessage(auth, roommates, roommate, type, price, date, payload);
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
        return updateCreds(resp, () => listRecentEmailsByAccount(account, type));
      }
      return parseBills(resp, type);
    });
  }

  setCreds(ACCESS_TOKEN, REFRESH_TOKEN);
  Object.keys(config.EMAIL_ADDRESSES).forEach(type => 
    listRecentEmailsByAccount(config.EMAIL_ADDRESSES[type], type)
  );
});