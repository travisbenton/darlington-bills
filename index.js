const config = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  storageBucket: "",
  messagingSenderId: ""
};

const $container = $('#bills');
firebase.initializeApp(config);
let roommate = localStorage.getItem('roommate');

function setUser(name) {
  $('.bill-roommate').text(`${name}'s`);
}

function getUser() {
  const data = window.data;
  // set user
  if (!roommate) {
    $('.user-overlay').css('transform', 'translateY(0)');
    const $node = $('.roommate-list');
    Object.keys(data.users).map(roomie => 
      $node.append(`<div data-roomie=${roomie} class="roomie"><span>${roomie}</span></div>`)
    ).join('');
  } else {
    setUser(roommate);
    render(data);
  }
}

function render() {
  const data = window.data;
  const months = Object.keys(data.bills);
  
  $container.empty();
  // sort months
  months.sort((a, b) => {
      const aDate = a.split('-');
      const bDate = b.split('-');
      const aCompare = new Date(parseInt(aDate[1], 10), parseInt(aDate[0], 10) - 1, 1);
      const bCompare = new Date(parseInt(bDate[1], 10), parseInt(bDate[0], 10) - 1, 1);
      return bCompare - aCompare;
    })
  months.map((month, i) => {
    const bills = Object.keys(data.bills[month]);
    let total = 0;
    $container.append(`
      <li>
        <div class="bill-month">${month}</div>
        ${bills.length ? 
          `<ul>${ bills.map((bill, j) => {
            const last = j === bills.length - 1;
            const eachOwed = (parseInt(data.bills[month][bill], 10)/Object.keys(data.users).length).toFixed(2);
            const isRent = bill === 'rent';
            total += parseInt(eachOwed, 10);
            let html = `<li class="bill-item ${i === 0 ? '' : 'hide'}">
                            <div class="bill-amount"><a href="https://cash.me/$travisbenton/${eachOwed}">$${eachOwed}</a></div>
                            <div class="bill-name">${bill}</div>
                          </li>`;
            if (last) {
              total += parseInt(data.users[roommate].rent, 10);
              html += `<li class="bill-item ${i === 0 ? '' : 'hide'}">
                          <div class="bill-amount"><a href="https://cash.me/$travisbenton/${data.users[roommate].rent}">$${data.users[roommate].rent}</a></div>
                          <div class="bill-name">rent</div>
                        </li>
                        <li class="bill-item ${i === 0 ? '' : 'hide'}">
                          <div class="bill-amount"><a href="https://cash.me/$travisbenton/${total}">$${total}</a></div>
                          <div class="bill-name">total</div>
                        </li>`;
            }
            return html;
          }).join('')}</ul>` : 
          ''
        }
      </li>
    `);
  });
}

fetchData();
$container.html('LOADING');

function fetchData() {
  firebase.database().ref('api/').once('value').then(resp => {
    window.data = resp.val();
    getUser(data);
  });
}

$('body').on('click', '.bill-month', e => {
  $(e.currentTarget).parent().find('.bill-item').toggleClass('hide');
});

$('body').on('click', '[data-roomie]', e => {
  const thisRoommate = $(e.currentTarget).data().roomie;
  localStorage.setItem('roommate', thisRoommate);
  roommate = thisRoommate;
  render(data);
  setUser(thisRoommate);
  $('.user-overlay').css('transform', 'translateY(-100%)');
})