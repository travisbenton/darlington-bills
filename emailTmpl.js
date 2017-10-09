module.exports = (roommates, roommate, type, date, payload, prevBills) => {
  const USER_SCOPED_BILLS = ['rent'];
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
  const name = roommate[0].toUpperCase() + roommate.slice(1);
  let total = 0;

  return `
    <head>
      <meta name="viewport" content="width=device-width">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>IT'S RENT DAY!</title>
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
