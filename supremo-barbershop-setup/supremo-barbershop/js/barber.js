// ============================================================
//  barber.js
//  Mga page na nakikita ng barbero:
//    - Overview          (buod ng rating at appointments niya)
//    - My Appointments   (sarili niyang customer lang)
//    - My Schedule       (dito siya naglalagay ng day off)
// ============================================================


// Anong buwan ang bukas sa schedule page.
var scheduleYear = new Date().getFullYear();
var scheduleMonth = new Date().getMonth() + 1;


// ------------------------------------------------------------
//  OVERVIEW
// ------------------------------------------------------------

async function showBarberOverviewPage() {
  var profile = await runServer("getMyBarberProfile");
  var appointments = await runServer("getAppointments");

  var counts = profile.statusCounts;

  // Bilangin ang paparating at ang hindi pa namamarkahan.
  var upcoming = [];
  var needsMarking = 0;

  for (var i = 0; i < appointments.length; i++) {
    var appt = appointments[i];

    if (!appt.isPast && appt.status == "Approved") {
      upcoming.push(appt);
    }
    if (appt.isPast && appt.status == "Approved") {
      needsMarking++;
    }
  }

  // Kabuuang bilang ng appointment sa lahat ng status.
  var totalAppointments = 0;
  for (var status in counts) {
    totalAppointments += counts[status];
  }

  var completed = 0;
  if (counts["Completed"]) {
    completed = counts["Completed"];
  }

  // Ipakita ang huling anim na paparating, pinakamalapit muna.
  var nextRows = "";
  var start = upcoming.length - 6;
  if (start < 0) {
    start = 0;
  }

  for (var j = upcoming.length - 1; j >= start; j--) {
    var next = upcoming[j];
    nextRows += "<tr>" +
      '<td class="nowrap">' + formatDate(next.date) + "</td>" +
      '<td class="nowrap">' + formatTime(next.time) + "</td>" +
      "<td>" + escapeHtml(next.fullName) + "</td>" +
      "<td>" + escapeHtml(next.service) + "</td>" +
      "</tr>";
  }

  var nextTable = '<div class="empty">No upcoming appointments.</div>';
  if (nextRows != "") {
    nextTable =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Date</th><th>Time</th><th>Customer</th><th>Service</th></tr></thead>" +
        "<tbody>" + nextRows + "</tbody>" +
      "</table></div>";
  }

  // Paalala kapag may lumipas nang appointment na hindi pa namamarkahan.
  var reminder = "";
  if (needsMarking > 0) {
    var word = "appointment that has";
    if (needsMarking > 1) {
      word = "appointments that have";
    }
    reminder =
      '<div class="notice info" style="margin-top:20px;">' +
        "You have " + needsMarking + " past " + word + " not been marked yet. " +
        "Go to <strong>My Appointments</strong> and mark whether the customer showed up or not." +
      "</div>";
  }

  var ratingValue = "—";
  if (profile.rating) {
    ratingValue = profile.rating.toFixed(1);
  }

  var reviewWord = "reviews";
  if (profile.ratingCount == 1) {
    reviewWord = "review";
  }

  var statusPillHtml = '<span class="pill inactive">Inactive</span>';
  if (profile.status == "Active") {
    statusPillHtml = '<span class="pill active">Active</span>';
  }

  setContent(
    '<div class="stat-grid">' +
      '<div class="stat">' +
        '<div class="stat-label">Your rating</div>' +
        '<div class="stat-value">' + ratingValue + "</div>" +
        '<div style="margin-top:2px;">' + starsHtml(profile.rating) + "</div>" +
        '<div class="stat-foot">' + profile.ratingCount + " " + reviewWord + "</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Upcoming</div>' +
        '<div class="stat-value">' + upcoming.length + "</div>" +
        '<div class="stat-foot">Still scheduled</div>' +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Completed</div>' +
        '<div class="stat-value">' + completed + "</div>" +
        '<div class="stat-foot">Marked as Completed</div>' +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Total</div>' +
        '<div class="stat-value">' + totalAppointments + "</div>" +
        '<div class="stat-foot">All appointments</div>' +
      "</div>" +
    "</div>" +

    reminder +

    '<h3 class="section-title">Next appointments</h3>' +
    nextTable +

    '<div class="card" style="margin-top:22px;">' +
      "<h3>Profile</h3>" +
      '<p class="muted small" style="margin-top:6px;">' +
        "Name: <strong>" + escapeHtml(profile.name) + "</strong><br>" +
        "Contact: " + escapeHtml(profile.phone || "—") + "<br>" +
        "Specialty: " + escapeHtml(profile.specialty || "—") + "<br>" +
        "Status: " + statusPillHtml +
      "</p>" +
      '<p class="muted small" style="margin-top:10px;">Your specialty and status are managed by the admin.</p>' +
    "</div>"
  );
}


// ------------------------------------------------------------
//  MY APPOINTMENTS
// ------------------------------------------------------------

async function showBarberAppointmentsPage() {
  var appointments = await runServer("getAppointments");

  if (appointments.length == 0) {
    setContent('<div class="empty">You have no appointments yet.</div>');
    return;
  }

  var rows = "";

  for (var i = 0; i < appointments.length; i++) {
    var appt = appointments[i];

    // Pwede lang markahan ang lumipas na at Approved pa rin.
    var actions = '<span class="muted small">—</span>';

    if (appt.isPast && appt.status == "Approved") {
      actions =
        '<button class="btn small mark-btn" data-id="' + appt.id + '" data-status="Completed">Showed up</button>' +
        '<button class="btn small ghost mark-btn" data-id="' + appt.id + '" data-status="No-show">No-show</button>';
    }

    var ratingCell = '<span class="muted small">—</span>';
    if (appt.rating) {
      ratingCell = starsHtml(appt.rating);
    }

    rows += "<tr>" +
      "<td>" + appt.id + "</td>" +
      '<td class="nowrap">' + formatDate(appt.date) + "</td>" +
      '<td class="nowrap">' + formatTime(appt.time) + "</td>" +
      "<td>" + escapeHtml(appt.fullName) + "</td>" +
      "<td>" + escapeHtml(appt.service) + "</td>" +
      '<td class="nowrap">' + peso(appt.finalPrice) + "</td>" +
      "<td>" + statusPill(appt.status) + "</td>" +
      "<td>" + ratingCell + "</td>" +
      '<td class="actions">' + actions + "</td>" +
      "</tr>";
  }

  setContent(
    '<div class="table-wrap"><table>' +
      "<thead><tr>" +
        "<th>#</th><th>Date</th><th>Time</th><th>Customer</th><th>Service</th>" +
        "<th>Total</th><th>Status</th><th>Rating</th><th>Mark as</th>" +
      "</tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
    "</table></div>"
  );

  var markButtons = contentEl.querySelectorAll(".mark-btn");
  for (var j = 0; j < markButtons.length; j++) {
    markButtons[j].onclick = function () {
      markAppointment(Number(this.getAttribute("data-id")), this.getAttribute("data-status"));
    };
  }
}


// Minamarkahan kung natuloy ba o hindi dumating ang customer.
async function markAppointment(id, status) {
  if (!confirm('Mark appointment #' + id + ' as "' + status + '"?')) {
    return;
  }

  try {
    var result = await runServer("setAppointmentStatus", { id: id, status: status });

    if (result.success) {
      toast(result.message, "good");
      refreshPage();
    } else {
      toast(result.message, "bad");
    }
  } catch (error) {
    handleError(error);
  }
}


// ------------------------------------------------------------
//  MY SCHEDULE (day off)
// ------------------------------------------------------------

async function showBarberSchedulePage() {
  // Balik sa kasalukuyang buwan sa tuwing bubuksan ang page.
  scheduleYear = new Date().getFullYear();
  scheduleMonth = new Date().getMonth() + 1;

  var monthOptions = "";
  for (var m = 1; m <= 12; m++) {
    var monthName = new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
    var selected = "";

    if (m == scheduleMonth) {
      selected = " selected";
    }

    monthOptions += '<option value="' + m + '"' + selected + ">" + monthName + "</option>";
  }

  setContent(
    '<div class="card">' +
      '<div class="filter-bar">' +
        '<div class="field">' +
          '<label for="schedMonth">Month</label>' +
          '<select id="schedMonth">' + monthOptions + "</select>" +
        "</div>" +
        '<div class="field">' +
          '<label for="schedYear">Year</label>' +
          '<input id="schedYear" type="number" value="' + scheduleYear + '" min="2020" max="2100">' +
        "</div>" +
        '<button class="btn secondary" id="schedLoadBtn" type="button">Show</button>' +
      "</div>" +

      '<div class="notice info" style="margin-top:16px;">' +
        "Tap a day to mark it as a <strong>day off</strong>. Tap it again to undo. " +
        "You cannot take a day off on a date that already has a booking." +
      "</div>" +

      '<div id="schedCalendar"><p class="muted lead">Loading calendar...</p></div>' +
    "</div>" +

    '<h3 class="section-title">Scheduled days off</h3>' +
    '<div id="dayOffList"></div>'
  );

  document.getElementById("schedLoadBtn").onclick = function () {
    scheduleYear = Number(document.getElementById("schedYear").value) || scheduleYear;
    scheduleMonth = Number(document.getElementById("schedMonth").value) || scheduleMonth;
    loadSchedule();
  };

  await loadSchedule();
}


// Ginagawa ang kalendaryo at ang listahan ng day off.
async function loadSchedule() {
  var calendar = document.getElementById("schedCalendar");
  calendar.innerHTML = '<p class="muted lead">Loading...</p>';

  var daysOff = await runServer("getDaysOff");
  var appointments = await runServer("getAppointments");

  // Gawing madaling hanapin: petsa -> dahilan
  var offReasons = {};
  for (var i = 0; i < daysOff.length; i++) {
    offReasons[daysOff[i].date] = daysOff[i].reason;
  }

  // Ilan ang naka-book kada araw?
  var bookedCount = {};
  for (var j = 0; j < appointments.length; j++) {
    var appt = appointments[j];

    if (appt.status == "Approved" || appt.status == "Completed") {
      if (!bookedCount[appt.date]) {
        bookedCount[appt.date] = 0;
      }
      bookedCount[appt.date]++;
    }
  }

  // ----- gawin ang grid ng kalendaryo -----
  var firstDay = new Date(scheduleYear, scheduleMonth - 1, 1);
  var daysInMonth = new Date(scheduleYear, scheduleMonth, 0).getDate();
  var today = todayStr();

  var html = '<div class="calendar-grid">';

  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (var d = 0; d < dayNames.length; d++) {
    html += '<div class="calendar-head">' + dayNames[d] + "</div>";
  }

  // Blangkong kahon bago ang unang araw ng buwan.
  for (var blank = 0; blank < firstDay.getDay(); blank++) {
    html += '<div class="calendar-cell blank"></div>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dateKey = scheduleYear + "-" + pad2(scheduleMonth) + "-" + pad2(day);
    var booked = bookedCount[dateKey] || 0;
    var isOff = (dateKey in offReasons);
    var isPast = dateKey < today;

    var cellClass = "calendar-cell";
    if (isOff) {
      cellClass += " is-off";
    }
    if (dateKey == today) {
      cellClass += " is-today";
    }

    var line = '<div class="cell-line">&nbsp;</div>';
    if (isOff) {
      line = '<div class="cell-line bad-count">DAY OFF</div>';
    } else if (booked > 0) {
      line = '<div class="cell-line">' + booked + " booked</div>";
    }

    // Ang lumipas na araw ay hindi na pwedeng pindutin.
    var pastMark = "";
    var pastStyle = "";
    if (isPast) {
      pastMark = ' data-past="1"';
      pastStyle = ' style="opacity:.45;cursor:default;"';
    }

    html += '<div class="' + cellClass + '" data-date="' + dateKey + '" data-booked="' + booked +
            '" data-off="' + (isOff ? 1 : 0) + '"' + pastMark + pastStyle + ">" +
              '<div class="day-num">' + day + "</div>" + line +
            "</div>";
  }

  html += "</div>";
  calendar.innerHTML = html;

  // Kabitan ng click ang bawat araw.
  var cells = calendar.querySelectorAll(".calendar-cell[data-date]");
  for (var c = 0; c < cells.length; c++) {
    cells[c].onclick = function () {
      if (this.getAttribute("data-past")) {
        return;
      }

      var date = this.getAttribute("data-date");

      if (this.getAttribute("data-off") == "1") {
        removeDayOff(date);
      } else {
        openDayOffModal(date, Number(this.getAttribute("data-booked")));
      }
    };
  }

  // ----- listahan ng paparating na day off -----
  var listRows = "";
  for (var k = 0; k < daysOff.length; k++) {
    var off = daysOff[k];

    if (off.date < today) {
      continue;
    }

    listRows += "<tr>" +
      '<td class="nowrap">' + formatDate(off.date) + "</td>" +
      "<td>" + escapeHtml(off.reason || "—") + "</td>" +
      '<td class="actions right">' +
        '<button class="btn small ghost remove-off" data-date="' + off.date + '">Undo</button>' +
      "</td>" +
      "</tr>";
  }

  var listBox = document.getElementById("dayOffList");

  if (listRows == "") {
    listBox.innerHTML = '<div class="empty">You have no scheduled days off.</div>';
  } else {
    listBox.innerHTML =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Date</th><th>Reason</th><th></th></tr></thead>" +
        "<tbody>" + listRows + "</tbody>" +
      "</table></div>";

    var undoButtons = listBox.querySelectorAll(".remove-off");
    for (var u = 0; u < undoButtons.length; u++) {
      undoButtons[u].onclick = function () {
        removeDayOff(this.getAttribute("data-date"));
      };
    }
  }
}


// Nagbubukas ng maliit na form para sa dahilan ng day off.
function openDayOffModal(date, booked) {
  // Bawal kapag may naka-book na.
  if (booked > 0) {
    var word = "is 1 booking";
    if (booked > 1) {
      word = "are " + booked + " bookings";
    }
    toast("There " + word + " on " + formatDate(date) + ". Ask the admin to cancel them first.", "bad");
    return;
  }

  showModal(
    "<h3>Take a day off</h3>" +
    '<p class="muted small" style="margin-top:4px;">' + formatDate(date) + "</p>" +
    '<label for="offReason">Reason <span class="muted">(optional)</span></label>' +
    '<input id="offReason" type="text" placeholder="e.g. Rest day, personal errand, sick">' +
    '<div id="offMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" id="confirmOffBtn" type="button">Set as day off</button>' +
    "</div>"
  );

  document.getElementById("confirmOffBtn").onclick = function () {
    saveDayOff(date);
  };
}


async function saveDayOff(date) {
  var msg = document.getElementById("offMsg");
  var reason = document.getElementById("offReason").value.trim();

  try {
    var result = await runServer("addDayOff", { date: date, reason: reason });

    if (result.success) {
      closeModal();
      toast(result.message, "good");
      loadSchedule();
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


async function removeDayOff(date) {
  if (!confirm("Remove your day off on " + formatDate(date) + "?")) {
    return;
  }

  try {
    var result = await runServer("removeDayOff", date);
    toast(result.message, "good");
    loadSchedule();
  } catch (error) {
    handleError(error);
  }
}
