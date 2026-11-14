// ============================================================
//  customer.js
//  Mga page na nakikita ng customer:
//    - Services          (listahan ng presyo)
//    - Book Appointment  (dito nagbo-book)
//    - My Appointments   (mga booking niya at feedback)
//    - Promos            (mga promo code)
// ============================================================


// ------------------------------------------------------------
//  SERVICES
// ------------------------------------------------------------

async function showServicesPage() {
  var services = await runServer("getServices");
  var barbers = await runServer("getBarbers");

  // Talahanayan ng presyo.
  var serviceRows = "";
  for (var i = 0; i < services.length; i++) {
    serviceRows += "<tr>" +
      "<td>" + escapeHtml(services[i][0]) + "</td>" +
      '<td class="right">' + peso(services[i][1]) + "</td>" +
      "</tr>";
  }

  var priceTable = '<div class="empty">No services listed yet.</div>';
  if (serviceRows != "") {
    priceTable =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Service</th>" + '<th class="right">Price</th></tr></thead>' +
        "<tbody>" + serviceRows + "</tbody>" +
      "</table></div>";
  }

  // Mga card ng barbero kasama ang rating nila.
  var barberCards = "";
  for (var j = 0; j < barbers.length; j++) {
    var barber = barbers[j];
    var specialty = "";

    if (barber.specialty) {
      specialty = '<div class="stat-foot">' + escapeHtml(barber.specialty) + "</div>";
    }

    barberCards +=
      '<div class="stat">' +
        '<div class="stat-label">' + escapeHtml(barber.name) + "</div>" +
        '<div style="margin-top:6px;">' + starsHtml(barber.rating, barber.ratingCount) + "</div>" +
        specialty +
      "</div>";
  }

  var barberSection = '<div class="empty">No active barbers yet.</div>';
  if (barberCards != "") {
    barberSection = '<div class="stat-grid">' + barberCards + "</div>";
  }

  setContent(
    '<div class="card">' +
      '<div class="card-head">' +
        "<h3>Price list</h3>" +
        '<button class="btn" id="goBookBtn" type="button">Book Appointment</button>' +
      "</div>" +
      priceTable +
    "</div>" +

    '<h3 class="section-title">Our barbers and their ratings</h3>' +
    '<p class="muted small" style="margin:4px 0 14px;">Ratings come from the feedback of previous customers.</p>' +
    barberSection
  );

  document.getElementById("goBookBtn").onclick = function () {
    goToPage("book");
  };
}


// ------------------------------------------------------------
//  BOOK APPOINTMENT
// ------------------------------------------------------------

// Mga bagay na kailangang matandaan habang pinupunan ang form.
var bookingDaysOff = [];     // mga araw na day off ng napiling barbero
var appliedPromo = null;     // resulta ng huling na-apply na promo code
var servicePrices = {};      // presyo ng bawat serbisyo


async function showBookPage() {
  var services = await runServer("getServices");
  var barbers = await runServer("getBarbers");

  if (barbers.length == 0) {
    setContent('<div class="empty">There are no active barbers yet. Please check back later.</div>');
    return;
  }

  // Bagong page, kaya linisin ang mga naunang napili.
  bookingDaysOff = [];
  appliedPromo = null;
  servicePrices = {};

  // Dropdown ng serbisyo, at itago ang presyo para sa kalkulasyon.
  var serviceOptions = '<option value="">-- Choose a service --</option>';
  for (var i = 0; i < services.length; i++) {
    var name = services[i][0];
    var price = Number(services[i][1]);

    servicePrices[name] = price;
    serviceOptions += '<option value="' + escapeHtml(name) + '">' +
                      escapeHtml(name) + " — " + peso(price) + "</option>";
  }

  // Dropdown ng barbero, may nakalagay na rating para may basehan
  // ang customer sa pagpili.
  var barberOptions = '<option value="">-- Choose a barber --</option>';
  for (var j = 0; j < barbers.length; j++) {
    var barber = barbers[j];
    var ratingText = "no rating yet";

    if (barber.rating) {
      ratingText = "★ " + barber.rating.toFixed(1) + " (" + barber.ratingCount + ")";
    }

    barberOptions += '<option value="' + escapeHtml(barber.name) + '">' +
                     escapeHtml(barber.name) + " — " + ratingText + "</option>";
  }

  // Ang mapipiling oras ay galing sa Shop Settings ng admin.
  var step = shopSettings.slotHours;
  if (step < 1) {
    step = 1;
  }

  var timeOptions = "";
  for (var hour = shopSettings.openHour; hour <= shopSettings.closeHour; hour += step) {
    var value = pad2(hour) + ":00";
    timeOptions += '<option value="' + value + '">' + formatTime(value) + "</option>";
  }

  var openText = formatTime(pad2(shopSettings.openHour) + ":00");
  var closeText = formatTime(pad2(shopSettings.closeHour) + ":00");

  setContent(
    '<div class="card">' +
      '<div class="field-row">' +
        "<div>" +
          '<label for="bookService">Service</label>' +
          '<select id="bookService">' + serviceOptions + "</select>" +
        "</div>" +
        "<div>" +
          '<label for="bookBarber">Barber</label>' +
          '<select id="bookBarber">' + barberOptions + "</select>" +
          '<div class="field-hint" id="barberNote"></div>' +
        "</div>" +
      "</div>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="bookDate">Date</label>' +
          '<input id="bookDate" type="date" min="' + todayStr() + '">' +
          '<div class="field-hint" id="dateNote"></div>' +
        "</div>" +
        "<div>" +
          '<label for="bookTime">Time</label>' +
          '<select id="bookTime">' + timeOptions + "</select>" +
          '<div class="field-hint">The shop is open from ' + openText + " to " + closeText + ".</div>" +
        "</div>" +
      "</div>" +

      '<label for="promoCode">Promo code <span class="muted">(optional)</span></label>' +
      '<div class="btn-row" style="align-items:stretch;">' +
        '<input id="promoCode" type="text" placeholder="e.g. SUPREMO10" style="flex:1;min-width:180px;text-transform:uppercase;">' +
        '<button class="btn secondary" id="applyPromoBtn" type="button">Apply</button>' +
      "</div>" +
      '<div id="promoMsg" class="msg"></div>' +

      '<div class="notice" id="summaryBox" style="margin-top:18px;">Choose a service to see the total.</div>' +

      '<div class="btn-row form-actions">' +
        '<button class="btn" id="bookBtn" type="button">Book appointment</button>' +
        '<button class="btn ghost" id="cancelBookBtn" type="button">Cancel</button>' +
      "</div>" +
      '<div id="bookMsg" class="msg"></div>' +
    "</div>"
  );

  // Kapag nagpalit ng serbisyo, kailangang i-apply ulit ang promo
  // kasi baka hindi na pala ito pwede sa bagong napili.
  document.getElementById("bookService").onchange = function () {
    clearAppliedPromo();
  };

  document.getElementById("bookBarber").onchange = loadBarberDaysOff;

  document.getElementById("bookDate").onchange = function () {
    checkIfDayOff();
    clearAppliedPromo();
  };

  document.getElementById("applyPromoBtn").onclick = applyPromoCode;
  document.getElementById("bookBtn").onclick = submitBooking;

  document.getElementById("cancelBookBtn").onclick = function () {
    goToPage("services");
  };

  updateBookingSummary();
}


// Ipinapakita ang babayaran, may promo man o wala.
function updateBookingSummary() {
  var box = document.getElementById("summaryBox");
  var service = document.getElementById("bookService").value;

  if (service == "") {
    box.className = "notice";
    box.textContent = "Choose a service to see the total.";
    return;
  }

  var price = servicePrices[service];
  if (!price) {
    price = 0;
  }

  if (appliedPromo) {
    box.className = "notice good";
    box.innerHTML =
      "<div>Price: <s class=\"muted\">" + peso(price) + "</s></div>" +
      '<div>Promo <span class="promo-code">' + escapeHtml(appliedPromo.code) + "</span> — " +
      peso(appliedPromo.discount) + " off</div>" +
      '<div class="strong" style="margin-top:4px;font-size:16px;">You pay: ' +
      peso(appliedPromo.finalPrice) + "</div>";
  } else {
    box.className = "notice";
    box.innerHTML = '<div class="strong" style="font-size:16px;">You pay: ' + peso(price) + "</div>";
  }
}


// Binabaklas ang naka-apply na promo kapag may binago sa form.
function clearAppliedPromo() {
  if (appliedPromo) {
    appliedPromo = null;
    setMsg(document.getElementById("promoMsg"),
           "The promo was reset. Apply it again if you still want to use it.");
  }
  updateBookingSummary();
}


// Kinukuha ang mga day off ng napiling barbero.
async function loadBarberDaysOff() {
  var barberName = document.getElementById("bookBarber").value;
  var note = document.getElementById("barberNote");

  bookingDaysOff = [];
  note.textContent = "";

  if (barberName == "") {
    checkIfDayOff();
    return;
  }

  try {
    bookingDaysOff = await runServer("getBarberDaysOffByName", barberName);

    if (bookingDaysOff.length == 0) {
      note.textContent = "No scheduled days off.";
    } else {
      var dates = [];
      for (var i = 0; i < bookingDaysOff.length; i++) {
        dates.push(formatDate(bookingDaysOff[i]));
      }
      note.textContent = "Days off: " + dates.join(", ");
    }
  } catch (error) {
    console.log(error);
  }

  checkIfDayOff();
}


// Day off ba ng barbero ang napiling petsa? Kapag oo, hindi
// pwedeng pindutin ang Book.
function checkIfDayOff() {
  var date = document.getElementById("bookDate").value;
  var barberName = document.getElementById("bookBarber").value;
  var note = document.getElementById("dateNote");
  var bookBtn = document.getElementById("bookBtn");

  var isDayOff = false;
  for (var i = 0; i < bookingDaysOff.length; i++) {
    if (bookingDaysOff[i] == date) {
      isDayOff = true;
    }
  }

  if (date == "" || !isDayOff) {
    note.textContent = "";
    note.style.color = "";
    bookBtn.disabled = false;
    return;
  }

  note.textContent = barberName + " is off on this date. Please pick another day or another barber.";
  note.style.color = "var(--red)";
  bookBtn.disabled = true;
}


// Sinusuri ang promo code sa server bago mag-book.
async function applyPromoCode() {
  var msg = document.getElementById("promoMsg");
  var input = document.getElementById("promoCode");
  var service = document.getElementById("bookService").value;
  var date = document.getElementById("bookDate").value;

  var code = input.value.trim().toUpperCase();
  input.value = code;

  if (code == "") {
    appliedPromo = null;
    setMsg(msg, "No promo code entered.");
    updateBookingSummary();
    return;
  }

  if (service == "") {
    setMsg(msg, "Choose a service first.", "error");
    return;
  }

  if (date == "") {
    date = todayStr();
  }

  setMsg(msg, "Checking promo...");

  try {
    var result = await runServer("checkPromo", { code: code, service: service, date: date });

    if (result.success) {
      appliedPromo = result;
      setMsg(msg, "Promo applied! You saved " + peso(result.discount) + ".", "ok");
    } else {
      appliedPromo = null;
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    appliedPromo = null;
    showError(msg, error);
  }

  updateBookingSummary();
}


// Ipinapadala ang booking sa server.
async function submitBooking() {
  var msg = document.getElementById("bookMsg");
  var bookBtn = document.getElementById("bookBtn");

  var service = document.getElementById("bookService").value;
  var barber = document.getElementById("bookBarber").value;
  var date = document.getElementById("bookDate").value;
  var time = document.getElementById("bookTime").value;

  var promoCode = "";
  if (appliedPromo) {
    promoCode = appliedPromo.code;
  }

  if (service == "" || barber == "" || date == "" || time == "") {
    setMsg(msg, "Please fill in all fields.", "error");
    return;
  }

  if (date < todayStr()) {
    setMsg(msg, "The date cannot be in the past.", "error");
    return;
  }

  // I-disable muna para hindi madoble ang pagpindot.
  bookBtn.disabled = true;
  setMsg(msg, "Booking...");

  try {
    var result = await runServer("bookAppointment", {
      service: service,
      barber: barber,
      date: date,
      time: time,
      promoCode: promoCode
    });

    if (result.success) {
      toast(result.message, "good");
      goToPage("my-appointments");
    } else {
      setMsg(msg, result.message, "error");
      bookBtn.disabled = false;
    }
  } catch (error) {
    showError(msg, error);
    bookBtn.disabled = false;
  }
}


// ------------------------------------------------------------
//  MY APPOINTMENTS
// ------------------------------------------------------------

async function showMyAppointmentsPage() {
  var appointments = await runServer("getAppointments");

  if (appointments.length == 0) {
    setContent(
      '<div class="empty">' +
        "You have no appointments yet." +
        '<div style="margin-top:14px;">' +
          "<button class=\"btn\" onclick=\"goToPage('book')\">Book now</button>" +
        "</div>" +
      "</div>"
    );
    return;
  }

  // Ilan ang pwede nang bigyan ng feedback?
  var waitingForRating = 0;
  for (var i = 0; i < appointments.length; i++) {
    if (appointments[i].canRate) {
      waitingForRating++;
    }
  }

  var rows = "";
  for (var j = 0; j < appointments.length; j++) {
    var appt = appointments[j];

    // Anong ipapakita sa hanay ng Feedback?
    var feedbackCell = '<span class="muted small">After your appointment</span>';

    if (appt.rating) {
      feedbackCell = starsHtml(appt.rating);
    } else if (appt.canRate) {
      feedbackCell = '<button class="btn small rate-btn" data-id="' + appt.id +
                     '" data-barber="' + escapeHtml(appt.barber) + '">Rate</button>';
    } else if (appt.status == "Cancelled") {
      var note = appt.cancellationNote;
      if (!note) {
        note = "Cancelled";
      }
      feedbackCell = '<span class="muted small">' + escapeHtml(note) + "</span>";
    }

    // May promo ba? Ipakita ang code sa tabi ng presyo.
    var priceCell = peso(appt.finalPrice);
    if (appt.discount > 0) {
      priceCell += ' <span class="muted small">(promo ' + escapeHtml(appt.promoCode || "") + ")</span>";
    }

    rows += "<tr>" +
      "<td>" + appt.id + "</td>" +
      "<td>" + escapeHtml(appt.service) + "</td>" +
      "<td>" + escapeHtml(appt.barber) + "</td>" +
      '<td class="nowrap">' + formatDate(appt.date) + "</td>" +
      '<td class="nowrap">' + formatTime(appt.time) + "</td>" +
      '<td class="nowrap">' + priceCell + "</td>" +
      "<td>" + statusPill(appt.status) + "</td>" +
      "<td>" + feedbackCell + "</td>" +
      "</tr>";
  }

  var reminder = "";
  if (waitingForRating > 0) {
    var word = "appointment";
    if (waitingForRating > 1) {
      word = "appointments";
    }
    reminder = '<div class="notice info">You have ' + waitingForRating +
               " finished " + word + " waiting for your feedback.</div>";
  }

  setContent(
    reminder +
    '<div class="table-wrap"><table>' +
      "<thead><tr>" +
        "<th>#</th><th>Service</th><th>Barber</th><th>Date</th>" +
        "<th>Time</th><th>Total</th><th>Status</th><th>Feedback</th>" +
      "</tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
    "</table></div>"
  );

  // Kabitan ng click ang lahat ng Rate button.
  var rateButtons = contentEl.querySelectorAll(".rate-btn");
  for (var k = 0; k < rateButtons.length; k++) {
    rateButtons[k].onclick = function () {
      openFeedbackModal(Number(this.getAttribute("data-id")), this.getAttribute("data-barber"));
    };
  }
}


// ------------------------------------------------------------
//  PROMOS
// ------------------------------------------------------------

async function showPromosPage() {
  var promos = await runServer("getActivePromos");

  if (promos.length == 0) {
    setContent('<div class="empty">There are no active promos right now. Please check back later.</div>');
    return;
  }

  var cards = "";
  for (var i = 0; i < promos.length; i++) {
    var promo = promos[i];

    var discountText = promo.discountValue + "% OFF";
    if (promo.discountType == "Fixed") {
      discountText = peso(promo.discountValue) + " OFF";
    }

    var appliesTo = "";
    if (promo.serviceName) {
      appliesTo = "For " + escapeHtml(promo.serviceName) + " · ";
    }

    var description = promo.description;
    if (!description) {
      description = "Promo discount";
    }

    cards +=
      '<div class="stat">' +
        '<div class="stat-value" style="font-size:20px;">' + discountText + "</div>" +
        '<div class="stat-label" style="margin-top:6px;">' + escapeHtml(description) + "</div>" +
        '<div style="margin-top:10px;"><span class="promo-code">' + escapeHtml(promo.code) + "</span></div>" +
        '<div class="stat-foot">' + appliesTo + "until " + formatDate(promo.validTo) + "</div>" +
      "</div>";
  }

  setContent(
    '<div class="stat-grid">' + cards + "</div>" +
    '<div class="notice info" style="margin-top:20px;">' +
      "How to use: go to <strong>Book Appointment</strong>, type the code in the Promo code box, " +
      "then press <strong>Apply</strong>." +
    "</div>"
  );
}


// ------------------------------------------------------------
//  FEEDBACK MODAL (bituin at komento)
// ------------------------------------------------------------

// Ilang bituin ang pinili ngayon.
var chosenRating = 0;


function openFeedbackModal(appointmentId, barberName) {
  chosenRating = 0;

  // Limang button na bituin.
  var starButtons = "";
  for (var i = 1; i <= 5; i++) {
    starButtons += '<button type="button" data-value="' + i + '" aria-label="' + i + ' star">★</button>';
  }

  showModal(
    "<h3>How was your service?</h3>" +
    '<p class="muted small" style="margin-top:4px;">Appointment #' + appointmentId +
      " with " + escapeHtml(barberName) + "</p>" +

    "<label>Rating</label>" +
    '<div class="star-input" id="starInput">' + starButtons + "</div>" +
    '<div class="field-hint" id="starLabel">Tap the number of stars.</div>' +

    '<label for="feedbackNote">Your experience <span class="muted">(optional)</span></label>' +
    '<textarea id="feedbackNote" placeholder="e.g. Great haircut and he was quick."></textarea>' +

    '<div id="feedbackMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" id="submitFeedbackBtn" type="button">Send feedback</button>' +
    "</div>"
  );

  // Kapag pinindot ang bituin, kukulayan lahat hanggang doon.
  var buttons = modalCardEl.querySelectorAll("#starInput button");
  for (var j = 0; j < buttons.length; j++) {
    buttons[j].onclick = function () {
      chosenRating = Number(this.getAttribute("data-value"));
      paintStars();
    };
  }

  document.getElementById("submitFeedbackBtn").onclick = function () {
    sendFeedback(appointmentId);
  };
}


// Kinukulayan ang mga bituin base sa napili.
function paintStars() {
  var words = ["", "Poor", "Fair", "Okay", "Good", "Excellent"];
  var buttons = modalCardEl.querySelectorAll("#starInput button");

  for (var i = 0; i < buttons.length; i++) {
    var value = Number(buttons[i].getAttribute("data-value"));

    if (value <= chosenRating) {
      buttons[i].classList.add("on");
    } else {
      buttons[i].classList.remove("on");
    }
  }

  var label = chosenRating + " star";
  if (chosenRating > 1) {
    label = chosenRating + " stars";
  }

  document.getElementById("starLabel").textContent = label + " — " + words[chosenRating];
}


async function sendFeedback(appointmentId) {
  var msg = document.getElementById("feedbackMsg");

  if (chosenRating == 0) {
    setMsg(msg, "Please choose a rating first.", "error");
    return;
  }

  try {
    var result = await runServer("submitFeedback", {
      appointmentId: appointmentId,
      rating: chosenRating,
      comment: document.getElementById("feedbackNote").value.trim()
    });

    if (result.success) {
      closeModal();
      toast(result.message, "good");
      refreshPage();
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}
