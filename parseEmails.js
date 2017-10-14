module.exports = (gmail, oauth2Client, cb, account, type) => {
  // function parseBill(type, message, auth) {
  //   const html = parseEmail(message);
  //   const totalOwed = ((parseFloat(html.split('$')[1].split('<')[0], 10))).toFixed(2);
  //   const date = new Date(parseInt(message.internalDate, 10));
  //
  //   console.log('email found, saving to firebase')
  //
  //   cb(type, totalOwed, date,
  //     (roommates, roommate, type, price, date, payload, prevBills) => {
  //       sendMessage(auth, roommates, roommate, type, price, date, payload, prevBills);
  //     }
  //   );
  // }
  //
  // function parseBills(emails, type) {
  //   gmail.users.messages.get({
  //     auth: oauth2Client,
  //     'userId': 'me',
  //     'id': emails.messages[0].id,
  //     'format': 'full'
  //   }, (err, message) => parseBill(type, message, oauth2Client));
  // }
  //
  // gmail.users.messages.list({
  //   auth: oauth2Client,
  //   userId : 'me',
  //   q : `from:${account}`
  // }, (err, resp) => {
  //   if (err) {
  //     console.log('error!');
  //     console.log(err);
  //     return updateCreds(resp, () => listRecentEmailsByAccount(account, type));
  //   }
  //   console.log('parsing bill emails');
  //   return parseBills(resp, type);
  // });
}
