// ============================================================
//  admin.js
//  Lahat ng page na admin lang ang makakakita:
//    Appointments, Services, Barbers, Customers, Promos,
//    Analytics, Sales Forecast, Customer Forecast,
//    Barber Performance, Settings
// ============================================================


// Tinatago ko dito ang na-load na datos para hindi na kailangang
// tumawag ulit sa server tuwing maghahanap o magsasala.
var allAppointments = [];
var allUsers = [];
var serviceIdByName = {};

// Anong buwan ang bukas sa analytics page.
var analyticsYear = new Date().getFullYear();
var analyticsMonth = new Date().getMonth() + 1;

// Ang huling na-load na report. Ito ang ginagamit kapag
// pinindot ang Download PDF (tingnan ang js/pdf.js).
var lastAnalyticsReport = null;
var lastSalesForecast = null;


// ------------------------------------------------------------
//  APPOINTMENTS
// ------------------------------------------------------------

async function showAdminAppointmentsPage() {
  allAppointments = await runServer("getAppointments");

  if (allAppointments.length == 0) {
    setContent('<div class="empty">There are no appointments yet.</div>');
    return;
  }

  setContent(
    '<div class="filter-bar">' +
      '<div class="field">' +
        '<label for="statusFilter">Status</label>' +
        '<select id="statusFilter">' +
          '<option value="">All</option>' +
          '<option value="Approved">Approved</option>' +
          '<option value="Completed">Completed</option>' +
          '<option value="Cancelled">Cancelled</option>' +
          '<option value="No-show">No-show</option>' +
        "</select>" +
      "</div>" +
      '<div class="field" style="flex:1;min-width:220px;">' +
        '<label for="searchFilter">Search</label>' +
        '<input id="searchFilter" type="text" placeholder="Name, service, or barber">' +
      "</div>" +
    "</div>" +
    '<div id="apptTable"></div>'
  );

  document.getElementById("statusFilter").onchange = drawAppointmentTable;
  document.getElementById("searchFilter").oninput = drawAppointmentTable;

  drawAppointmentTable();
}


// Ginagawa ang talahanayan base sa napiling filter at hinahanap.
function drawAppointmentTable() {
  var status = document.getElementById("statusFilter").value;
  var search = document.getElementById("searchFilter").value.trim().toLowerCase();

  var rows = "";
  var shown = 0;

  for (var i = 0; i < allAppointments.length; i++) {
    var appt = allAppointments[i];

    // Salain ayon sa status.
    if (status != "" && appt.status != status) {
      continue;
    }

    // Salain ayon sa hinahanap.
    if (search != "") {
      var haystack = (appt.fullName + " " + appt.service + " " + appt.barber + " " + appt.username).toLowerCase();
      if (haystack.indexOf(search) == -1) {
        continue;
      }
    }

    shown++;

    var priceCell = peso(appt.finalPrice);
    if (appt.discount > 0) {
      priceCell += ' <span class="muted small">(-' + peso(appt.discount) + ")</span>";
    }

    var noteHtml = "";
    if (appt.cancellationNote) {
      noteHtml = '<div class="muted small">' + escapeHtml(appt.cancellationNote) + "</div>";
    }

    var ratingCell = '<span class="muted small">—</span>';
    if (appt.rating) {
      ratingCell = starsHtml(appt.rating);
    }

    // Anong aksyon ang pwede sa appointment na ito?
    var actions = "";
    if (appt.isPast && appt.status == "Approved") {
      actions += '<button class="btn small complete-btn" data-id="' + appt.id + '">Completed</button>';
    }
    if (appt.status == "Approved") {
      actions += '<button class="btn small warn cancel-btn" data-id="' + appt.id + '">Cancel</button>';
    }
    if (actions == "") {
      actions = '<span class="muted small">—</span>';
    }

    rows += "<tr>" +
      "<td>" + appt.id + "</td>" +
      "<td>" + escapeHtml(appt.fullName) + "</td>" +
      "<td>" + escapeHtml(appt.service) + "</td>" +
      "<td>" + escapeHtml(appt.barber) + "</td>" +
      '<td class="nowrap">' + formatDate(appt.date) + "</td>" +
      '<td class="nowrap">' + formatTime(appt.time) + "</td>" +
      '<td class="nowrap">' + priceCell + "</td>" +
      "<td>" + statusPill(appt.status) + noteHtml + "</td>" +
      "<td>" + ratingCell + "</td>" +
      '<td class="actions">' + actions + "</td>" +
      "</tr>";
  }

  var box = document.getElementById("apptTable");

  if (shown == 0) {
    box.innerHTML = '<div class="empty">No matching appointments.</div>';
    return;
  }

  box.innerHTML =
    '<div class="table-wrap"><table>' +
      "<thead><tr>" +
        "<th>#</th><th>Customer</th><th>Service</th><th>Barber</th><th>Date</th>" +
        "<th>Time</th><th>Total</th><th>Status</th><th>Rating</th><th>Action</th>" +
      "</tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
    "</table></div>";

  var cancelButtons = box.querySelectorAll(".cancel-btn");
  for (var c = 0; c < cancelButtons.length; c++) {
    cancelButtons[c].onclick = function () {
      openCancelModal(Number(this.getAttribute("data-id")));
    };
  }

  var completeButtons = box.querySelectorAll(".complete-btn");
  for (var d = 0; d < completeButtons.length; d++) {
    completeButtons[d].onclick = function () {
      markAsCompleted(Number(this.getAttribute("data-id")));
    };
  }
}


async function markAsCompleted(id) {
  try {
    var result = await runServer("setAppointmentStatus", { id: id, status: "Completed" });

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


// Kahon para sa dahilan ng pag-cancel.
function openCancelModal(id) {
  showModal(
    "<h3>Cancel appointment #" + id + "</h3>" +
    '<label for="cancelNote">Reason for cancelling</label>' +
    '<textarea id="cancelNote" placeholder="e.g. Customer requested it, barber is unavailable"></textarea>' +
    '<div class="field-hint">The customer will see this in their appointment list.</div>' +
    '<div id="cancelMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Never mind</button>' +
      '<button class="btn warn" id="confirmCancelBtn" type="button">Cancel appointment</button>' +
    "</div>"
  );

  document.getElementById("confirmCancelBtn").onclick = function () {
    submitCancel(id);
  };
}


async function submitCancel(id) {
  var msg = document.getElementById("cancelMsg");
  var note = document.getElementById("cancelNote").value.trim();

  // Kailangan may dahilan para may makita ang customer.
  if (note == "") {
    setMsg(msg, "Please enter a reason.", "error");
    return;
  }

  try {
    var result = await runServer("cancelAppointment", id, note);

    if (result.success) {
      closeModal();
      toast("Appointment #" + id + " cancelled.", "good");
      refreshPage();
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


// ------------------------------------------------------------
//  SERVICES
// ------------------------------------------------------------

async function showAdminServicesPage() {
  var services = await runServer("getServicesWithIndex");

  var rows = "";
  for (var i = 0; i < services.length; i++) {
    var service = services[i];

    rows += "<tr>" +
      "<td>" + service.index + "</td>" +
      '<td><input class="svc-name" data-idx="' + service.index + '" value="' + escapeHtml(service.service) + '"></td>' +
      '<td style="width:150px;"><input class="svc-price" data-idx="' + service.index +
        '" type="number" min="1" step="1" value="' + service.price + '"></td>' +
      '<td class="actions">' +
        '<button class="btn small save-svc" data-idx="' + service.index + '">Save</button>' +
        '<button class="btn small warn del-svc" data-idx="' + service.index + '">Delete</button>' +
      "</td>" +
      "</tr>";
  }

  var table = '<div class="empty">No services yet.</div>';
  if (rows != "") {
    table =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>#</th><th>Service</th><th>Price</th><th>Action</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  setContent(
    '<div class="card">' +
      "<h3>Add a service</h3>" +
      '<div class="field-row">' +
        "<div>" +
          '<label for="newServiceName">Service name</label>' +
          '<input id="newServiceName" type="text" placeholder="e.g. Gupit Supremo">' +
        "</div>" +
        "<div>" +
          '<label for="newServicePrice">Price</label>' +
          '<input id="newServicePrice" type="number" min="1" step="1" placeholder="250">' +
        "</div>" +
      "</div>" +
      '<div class="btn-row form-actions">' +
        '<button class="btn" id="addServiceBtn" type="button">Add service</button>' +
      "</div>" +
      '<div id="serviceMsg" class="msg"></div>' +
    "</div>" +
    table
  );

  document.getElementById("addServiceBtn").onclick = addNewService;

  var saveButtons = contentEl.querySelectorAll(".save-svc");
  for (var s = 0; s < saveButtons.length; s++) {
    saveButtons[s].onclick = function () {
      saveService(Number(this.getAttribute("data-idx")));
    };
  }

  var deleteButtons = contentEl.querySelectorAll(".del-svc");
  for (var d = 0; d < deleteButtons.length; d++) {
    deleteButtons[d].onclick = function () {
      deleteService(Number(this.getAttribute("data-idx")));
    };
  }
}


async function addNewService() {
  var msg = document.getElementById("serviceMsg");
  var name = document.getElementById("newServiceName").value.trim();
  var price = document.getElementById("newServicePrice").value.trim();

  if (name == "" || price == "") {
    setMsg(msg, "Enter a service name and a price.", "error");
    return;
  }

  try {
    var result = await runServer("addService", { service: name, price: price });

    if (result.success) {
      toast("Service added.", "good");
      refreshPage();
    } else {
      setMsg(msg, result.message || "Could not add the service.", "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


async function saveService(index) {
  var name = contentEl.querySelector('.svc-name[data-idx="' + index + '"]').value.trim();
  var price = contentEl.querySelector('.svc-price[data-idx="' + index + '"]').value.trim();

  if (name == "" || price == "") {
    toast("A name and price are required.", "bad");
    return;
  }

  try {
    var result = await runServer("updateService", { index: index, service: name, price: price });

    if (result.success) {
      toast("Saved.", "good");
    }
  } catch (error) {
    handleError(error);
  }
}


async function deleteService(index) {
  if (!confirm("Are you sure you want to delete this service?")) {
    return;
  }

  try {
    var result = await runServer("deleteService", index);

    if (result.success) {
      toast("Deleted.", "good");
      refreshPage();
    } else {
      // Hindi mabubura kapag may appointment na gumagamit nito.
      toast(result.message, "bad");
    }
  } catch (error) {
    handleError(error);
  }
}


// ------------------------------------------------------------
//  BARBERS
// ------------------------------------------------------------

async function showAdminBarbersPage() {
  var barbers = await runServer("getBarbers");
  var info = await runServer("getBarbersInfo");

  var rows = "";

  for (var i = 0; i < barbers.length; i++) {
    var barber = barbers[i];

    var specialtyHtml = "";
    if (barber.specialty) {
      specialtyHtml = '<div class="muted small">' + escapeHtml(barber.specialty) + "</div>";
    }

    var ratingCell = '<span class="muted small">None yet</span>';
    if (barber.ratingCount > 0) {
      ratingCell = starsHtml(barber.rating, barber.ratingCount);
    }

    // May login account na ba siya?
    var loginCell;
    if (barber.hasLogin) {
      loginCell = '<span class="pill active">Has login</span>' +
        '<button class="btn small ghost reset-login" data-id="' + barber.id +
        '" data-name="' + escapeHtml(barber.name) + '" style="margin-left:6px;">New password</button>';
    } else {
      loginCell = '<button class="btn small create-login" data-id="' + barber.id +
        '" data-name="' + escapeHtml(barber.name) + '">Create login</button>';
    }

    var activeSelected = "";
    var inactiveSelected = "";
    if (barber.status == "Active") {
      activeSelected = " selected";
    } else {
      inactiveSelected = " selected";
    }

    rows += "<tr>" +
      "<td>" + escapeHtml(barber.name) + specialtyHtml + "</td>" +
      '<td class="nowrap">' + escapeHtml(barber.phone || "—") + "</td>" +
      "<td>" + ratingCell + "</td>" +
      "<td>" +
        '<select class="barber-status" data-name="' + escapeHtml(barber.name) + '" style="min-width:110px;">' +
          '<option value="Active"' + activeSelected + ">Active</option>" +
          '<option value="Inactive"' + inactiveSelected + ">Inactive</option>" +
        "</select>" +
      "</td>" +
      "<td>" + loginCell + "</td>" +
      '<td class="actions">' +
        '<button class="btn small secondary edit-info" data-name="' + escapeHtml(barber.name) + '">Info</button>' +
        '<button class="btn small warn del-barber" data-name="' + escapeHtml(barber.name) + '">Delete</button>' +
      "</td>" +
      "</tr>";
  }

  var table = '<div class="empty">No barbers yet.</div>';
  if (rows != "") {
    table =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Name</th><th>Contact</th><th>Rating</th><th>Status</th><th>Login</th><th>Action</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  setContent(
    '<div class="card">' +
      "<h3>Add a barber</h3>" +
      '<div class="field-row">' +
        "<div>" +
          '<label for="newBarberName">Name</label>' +
          '<input id="newBarberName" type="text" placeholder="e.g. Rico Marquez">' +
        "</div>" +
        "<div>" +
          '<label for="newBarberPhone">Mobile number</label>' +
          '<input id="newBarberPhone" type="tel" data-phone maxlength="13" placeholder="09XX-XXX-XXXX">' +
        "</div>" +
      "</div>" +
      '<div class="btn-row form-actions">' +
        '<button class="btn" id="addBarberBtn" type="button">Add barber</button>' +
      "</div>" +
      '<div id="barberMsg" class="msg"></div>' +
    "</div>" +
    table
  );

  initPhoneInputs(contentEl);

  document.getElementById("addBarberBtn").onclick = addNewBarber;

  var statusSelects = contentEl.querySelectorAll(".barber-status");
  for (var a = 0; a < statusSelects.length; a++) {
    statusSelects[a].onchange = function () {
      changeBarberStatus(this.getAttribute("data-name"), this.value);
    };
  }

  var deleteButtons = contentEl.querySelectorAll(".del-barber");
  for (var b = 0; b < deleteButtons.length; b++) {
    deleteButtons[b].onclick = function () {
      deleteBarber(this.getAttribute("data-name"));
    };
  }

  var infoButtons = contentEl.querySelectorAll(".edit-info");
  for (var c = 0; c < infoButtons.length; c++) {
    infoButtons[c].onclick = function () {
      var name = this.getAttribute("data-name");
      openBarberInfoModal(name, info[name]);
    };
  }

  var createButtons = contentEl.querySelectorAll(".create-login");
  for (var d = 0; d < createButtons.length; d++) {
    createButtons[d].onclick = function () {
      openBarberLoginModal(Number(this.getAttribute("data-id")), this.getAttribute("data-name"), false);
    };
  }

  var resetButtons = contentEl.querySelectorAll(".reset-login");
  for (var e = 0; e < resetButtons.length; e++) {
    resetButtons[e].onclick = function () {
      openBarberLoginModal(Number(this.getAttribute("data-id")), this.getAttribute("data-name"), true);
    };
  }
}


async function addNewBarber() {
  var msg = document.getElementById("barberMsg");
  var name = document.getElementById("newBarberName").value.trim();
  var phone = document.getElementById("newBarberPhone").value.trim();

  if (name == "" || phone == "") {
    setMsg(msg, "Enter a name and a mobile number.", "error");
    return;
  }

  if (!isValidPhone(phone)) {
    setMsg(msg, "Please use the format 09XX-XXX-XXXX.", "error");
    return;
  }

  try {
    var result = await runServer("addBarber", { name: name, phone: phone });

    if (result.success) {
      toast("Barber added.", "good");
      refreshPage();
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


async function changeBarberStatus(name, status) {
  if (!confirm("Set " + name + " to " + status + "?")) {
    // Ibalik sa dating pili kapag hindi siya sumang-ayon.
    refreshPage();
    return;
  }

  try {
    var result = await runServer("updateBarber", { name: name, status: status });

    if (result.success) {
      toast("Status updated.", "good");
    }
  } catch (error) {
    handleError(error);
  }
}


async function deleteBarber(name) {
  if (!confirm("Delete " + name + "?")) {
    return;
  }

  try {
    var result = await runServer("deleteBarber", { name: name });

    if (result.success) {
      toast("Deleted.", "good");
      refreshPage();
    } else {
      // May appointment na siya, kaya Inactive na lang ang tamang gawin.
      toast(result.message, "bad");
    }
  } catch (error) {
    handleError(error);
  }
}


// Kahon para sa contact, specialty, at notes ng barbero.
function openBarberInfoModal(name, data) {
  if (!data) {
    data = { contact: "", specialty: "", notes: "" };
  }

  showModal(
    "<h3>Details for " + escapeHtml(name) + "</h3>" +
    '<label for="infoContact">Contact</label>' +
    '<input id="infoContact" type="tel" data-phone maxlength="13" value="' + escapeHtml(data.contact || "") + '">' +
    '<label for="infoSpecialty">Specialty</label>' +
    '<input id="infoSpecialty" type="text" value="' + escapeHtml(data.specialty || "") + '" placeholder="e.g. Fade, hair tattoo">' +
    '<label for="infoNotes">Notes</label>' +
    "<textarea id=\"infoNotes\">" + escapeHtml(data.notes || "") + "</textarea>" +
    '<div id="infoMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" id="saveInfoBtn" type="button">Save</button>' +
    "</div>"
  );

  initPhoneInputs(modalCardEl);

  document.getElementById("saveInfoBtn").onclick = function () {
    saveBarberInfo(name);
  };
}


async function saveBarberInfo(name) {
  var msg = document.getElementById("infoMsg");

  try {
    await runServer("updateBarberInfo", name, {
      contact: document.getElementById("infoContact").value.trim(),
      specialty: document.getElementById("infoSpecialty").value.trim(),
      notes: document.getElementById("infoNotes").value.trim()
    });

    closeModal();
    toast("Details saved.", "good");
    refreshPage();
  } catch (error) {
    showError(msg, error);
  }
}


// Kahon para sa paggawa ng login ng barbero, o pagpapalit ng
// password niya kapag nakalimutan.
function openBarberLoginModal(barberId, barberName, isReset) {
  var title = "Create a login for " + escapeHtml(barberName);
  var explanation = "The barber uses the same login page. They will see their own appointments and schedule.";
  var usernameField = '<label for="barberUsername">Username</label>' +
                      '<input id="barberUsername" type="text" placeholder="e.g. rico.barber">';
  var passwordLabel = "Password";
  var buttonLabel = "Create login";

  // Kailangan ng security question sa bagong account para may
  // magamit ang barbero kapag nakalimutan niya ang password.
  var securityFields =
    '<label for="barberSecQ">Security question</label>' +
    '<select id="barberSecQ">' + buildSecurityOptions("") + "</select>" +
    '<label for="barberSecA">Answer</label>' +
    '<input id="barberSecA" type="text" placeholder="The answer to the question above">';

  if (isReset) {
    title = "New password for " + escapeHtml(barberName);
    explanation = "Give the new password to the barber. They can change it later in Account Settings.";
    usernameField = "";
    passwordLabel = "New password";
    buttonLabel = "Change password";
    // Sa pagpapalit ng password, hindi na kailangan ito.
    securityFields = "";
  }

  showModal(
    "<h3>" + title + "</h3>" +
    '<p class="muted small" style="margin-top:4px;">' + explanation + "</p>" +
    usernameField +
    '<label for="barberPassword">' + passwordLabel + "</label>" +
    '<input id="barberPassword" type="text" placeholder="At least 8 characters, with a letter and a number">' +
    '<div class="field-hint">The password is shown here so you can write it down and hand it to the barber.</div>' +
    securityFields +
    '<div id="barberLoginMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" id="confirmBarberLoginBtn" type="button">' + buttonLabel + "</button>" +
    "</div>"
  );

  document.getElementById("confirmBarberLoginBtn").onclick = function () {
    saveBarberLogin(barberId, isReset);
  };
}


async function saveBarberLogin(barberId, isReset) {
  var msg = document.getElementById("barberLoginMsg");
  var password = document.getElementById("barberPassword").value;

  var problem = passwordProblem(password);
  if (problem != "") {
    setMsg(msg, problem, "error");
    return;
  }

  try {
    var result;

    if (isReset) {
      result = await runServer("resetBarberPassword", { barberId: barberId, password: password });
    } else {
      var username = document.getElementById("barberUsername").value.trim();
      var question = document.getElementById("barberSecQ").value;
      var answer = document.getElementById("barberSecA").value.trim();

      if (username == "") {
        setMsg(msg, "Enter a username.", "error");
        return;
      }

      if (question == "" || answer == "") {
        setMsg(msg, "Choose a security question and enter the answer.", "error");
        return;
      }

      result = await runServer("createBarberLogin", {
        barberId: barberId,
        username: username,
        password: password,
        securityQuestion: question,
        securityAnswer: answer
      });
    }

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


// ------------------------------------------------------------
//  CUSTOMERS (lahat ng account)
// ------------------------------------------------------------

async function showAdminCustomersPage() {
  allUsers = await runServer("getAllUsers");

  // Bilangin kung ilan bawat role.
  var customers = 0;
  var barbers = 0;
  var admins = 0;

  for (var i = 0; i < allUsers.length; i++) {
    if (allUsers[i].role == "User") {
      customers++;
    } else if (allUsers[i].role == "Barber") {
      barbers++;
    } else if (allUsers[i].role == "Admin") {
      admins++;
    }
  }

  setContent(
    '<div class="stat-grid">' +
      '<div class="stat"><div class="stat-label">Customers</div><div class="stat-value">' + customers + "</div></div>" +
      '<div class="stat"><div class="stat-label">Barbers</div><div class="stat-value">' + barbers + "</div></div>" +
      '<div class="stat"><div class="stat-label">Admins</div><div class="stat-value">' + admins + "</div></div>" +
    "</div>" +

    '<div class="card" style="margin-top:20px;">' +
      '<div class="card-head">' +
        "<div>" +
          "<h3>Accounts</h3>" +
          '<p class="muted small" style="margin-top:4px;">Only an admin can create another admin account.</p>' +
        "</div>" +
        '<button class="btn" id="addAdminBtn" type="button">Add admin</button>' +
      "</div>" +

      '<div class="filter-bar" style="margin-top:16px;">' +
        '<div class="field">' +
          '<label for="roleFilter">Role</label>' +
          '<select id="roleFilter">' +
            '<option value="">All</option>' +
            '<option value="User">Customer</option>' +
            '<option value="Barber">Barber</option>' +
            '<option value="Admin">Admin</option>' +
          "</select>" +
        "</div>" +
        '<div class="field" style="flex:1;min-width:200px;">' +
          '<label for="userSearch">Search</label>' +
          '<input id="userSearch" type="text" placeholder="Name or username">' +
        "</div>" +
      "</div>" +
      '<div id="userTable"></div>' +
    "</div>"
  );

  document.getElementById("roleFilter").onchange = drawUserTable;
  document.getElementById("userSearch").oninput = drawUserTable;
  document.getElementById("addAdminBtn").onclick = openAddAdminModal;

  drawUserTable();
}


function drawUserTable() {
  var role = document.getElementById("roleFilter").value;
  var search = document.getElementById("userSearch").value.trim().toLowerCase();

  var rows = "";
  var number = 0;

  for (var i = 0; i < allUsers.length; i++) {
    var user = allUsers[i];

    if (role != "" && user.role != role) {
      continue;
    }

    if (search != "") {
      var haystack = (user.fullName + " " + user.username).toLowerCase();
      if (haystack.indexOf(search) == -1) {
        continue;
      }
    }

    number++;

    // Sa loob ng system "User" ang tawag, pero "Customer" ang ipapakita.
    var roleLabel = user.role;
    if (roleLabel == "User") {
      roleLabel = "Customer";
    }

    rows += "<tr>" +
      "<td>" + number + "</td>" +
      "<td>" + escapeHtml(user.fullName) + "</td>" +
      "<td>" + escapeHtml(user.username) + "</td>" +
      '<td class="nowrap">' + escapeHtml(user.phoneNumber || "—") + "</td>" +
      '<td><span class="pill plain">' + escapeHtml(roleLabel) + "</span></td>" +
      "</tr>";
  }

  var box = document.getElementById("userTable");

  if (rows == "") {
    box.innerHTML = '<div class="empty">No matching accounts.</div>';
    return;
  }

  box.innerHTML =
    '<div class="table-wrap"><table>' +
      "<thead><tr><th>#</th><th>Name</th><th>Username</th><th>Mobile</th><th>Role</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
    "</table></div>";
}


function openAddAdminModal() {
  showModal(
    "<h3>New admin account</h3>" +
    '<p class="muted small" style="margin-top:4px;">Only an admin can do this. There is no admin self-registration.</p>' +
    '<label for="adminFullName">Full name</label>' +
    '<input id="adminFullName" type="text">' +
    '<label for="adminUsername">Username</label>' +
    '<input id="adminUsername" type="text" placeholder="username or email">' +
    '<label for="adminPhone">Mobile number</label>' +
    '<input id="adminPhone" type="tel" data-phone maxlength="13" placeholder="09XX-XXX-XXXX">' +
    '<label for="adminPassword">Password</label>' +
    '<input id="adminPassword" type="password">' +
    '<div class="field-hint">At least 8 characters, with a letter and a number.</div>' +

    // Kailangan ito para may magamit siya sa forgot password. Kung wala,
    // wala nang paraan para makabalik siya kapag nalimutan ang password.
    '<label for="adminSecQ">Security question</label>' +
    '<select id="adminSecQ">' + buildSecurityOptions("") + "</select>" +
    '<label for="adminSecA">Answer</label>' +
    '<input id="adminSecA" type="text" placeholder="The answer to the question above">' +
    '<div class="field-hint">Write this down and give it to the new admin. They can change it later in Account Settings.</div>' +

    '<div id="adminMsg" class="msg"></div>' +
    '<div class="btn-row modal-actions">' +
      '<button class="btn ghost" type="button" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" id="confirmAdminBtn" type="button">Create admin</button>' +
    "</div>"
  );

  initPhoneInputs(modalCardEl);

  document.getElementById("confirmAdminBtn").onclick = saveNewAdmin;
}


async function saveNewAdmin() {
  var msg = document.getElementById("adminMsg");

  var fullName = document.getElementById("adminFullName").value.trim();
  var username = document.getElementById("adminUsername").value.trim();
  var phone = document.getElementById("adminPhone").value.trim();
  var password = document.getElementById("adminPassword").value;
  var question = document.getElementById("adminSecQ").value;
  var answer = document.getElementById("adminSecA").value.trim();

  if (fullName == "" || username == "" || phone == "" || password == ""
      || question == "" || answer == "") {
    setMsg(msg, "Please fill in all fields, including the security question.", "error");
    return;
  }

  if (!isValidPhone(phone)) {
    setMsg(msg, "Please use the format 09XX-XXX-XXXX.", "error");
    return;
  }

  var problem = passwordProblem(password);
  if (problem != "") {
    setMsg(msg, problem, "error");
    return;
  }

  try {
    var result = await runServer("createAdmin", {
      fullName: fullName,
      username: username,
      phoneNumber: phone,
      password: password,
      securityQuestion: question,
      securityAnswer: answer
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


// ------------------------------------------------------------
//  PROMOS
// ------------------------------------------------------------

async function showAdminPromosPage() {
  var promos = await runServer("getPromos");
  var services = await runServer("getServicesWithIndex");

  // Itago ang tunay na id ng bawat serbisyo para magamit sa dropdown.
  serviceIdByName = {};
  var serviceOptions = '<option value="0">All services</option>';

  for (var i = 0; i < services.length; i++) {
    serviceIdByName[services[i].service] = services[i].index;
    serviceOptions += '<option value="' + services[i].index + '">' +
                      escapeHtml(services[i].service) + "</option>";
  }

  // Talahanayan ng mga promo.
  var rows = "";

  for (var j = 0; j < promos.length; j++) {
    var promo = promos[j];

    var discountText = promo.discountValue + "%";
    if (promo.discountType == "Fixed") {
      discountText = peso(promo.discountValue);
    }

    var descriptionHtml = "";
    if (promo.description) {
      descriptionHtml = '<div class="muted small">' + escapeHtml(promo.description) + "</div>";
    }

    var serviceText = '<span class="muted small">All</span>';
    if (promo.serviceName) {
      serviceText = escapeHtml(promo.serviceName);
    }

    var usedText = "" + promo.usedCount;
    if (promo.usageLimit > 0) {
      usedText += " / " + promo.usageLimit;
    }

    var statusHtml = '<span class="pill inactive">Inactive</span>';
    var toggleLabel = "Turn on";
    var nextStatus = "Active";

    if (promo.status == "Active") {
      statusHtml = '<span class="pill active">Active</span>';
      toggleLabel = "Turn off";
      nextStatus = "Inactive";
    }

    rows += "<tr>" +
      '<td><span class="promo-code">' + escapeHtml(promo.code) + "</span>" + descriptionHtml + "</td>" +
      '<td class="nowrap">' + discountText + "</td>" +
      "<td>" + serviceText + "</td>" +
      '<td class="nowrap small">' + formatDate(promo.validFrom) + "<br>" + formatDate(promo.validTo) + "</td>" +
      '<td class="nowrap">' + usedText + "</td>" +
      "<td>" + statusHtml + "</td>" +
      '<td class="actions">' +
        '<button class="btn small secondary toggle-promo" data-id="' + promo.id +
          '" data-status="' + nextStatus + '">' + toggleLabel + "</button>" +
        '<button class="btn small warn del-promo" data-id="' + promo.id + '">Delete</button>' +
      "</td>" +
      "</tr>";
  }

  var table = '<div class="empty">No promos yet. Create one above.</div>';
  if (rows != "") {
    table =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Code</th><th>Discount</th><th>Service</th><th>Valid</th>" +
        "<th>Used</th><th>Status</th><th>Action</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  setContent(
    '<div class="card">' +
      "<h3>New promo</h3>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="promoCodeInput">Promo code</label>' +
          '<input id="promoCodeInput" type="text" placeholder="E.G. SUMMER20" style="text-transform:uppercase;">' +
          '<div class="field-hint">Letters, numbers, dash, and underscore only.</div>' +
        "</div>" +
        "<div>" +
          '<label for="promoDesc">Description</label>' +
          '<input id="promoDesc" type="text" placeholder="e.g. Summer sale 20% off">' +
        "</div>" +
      "</div>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="promoType">Discount type</label>' +
          '<select id="promoType">' +
            '<option value="Percent">Percentage (%)</option>' +
            '<option value="Fixed">Fixed amount (₱)</option>' +
          "</select>" +
        "</div>" +
        "<div>" +
          '<label for="promoValue">Discount value</label>' +
          '<input id="promoValue" type="number" min="1" step="1" placeholder="10">' +
        "</div>" +
      "</div>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="promoFrom">Starts</label>' +
          '<input id="promoFrom" type="date" value="' + todayStr() + '">' +
        "</div>" +
        "<div>" +
          '<label for="promoTo">Ends</label>' +
          '<input id="promoTo" type="date">' +
        "</div>" +
      "</div>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="promoService">Applies to</label>' +
          '<select id="promoService">' + serviceOptions + "</select>" +
          '<div class="field-hint">Pick a service if the promo is only for one of them.</div>' +
        "</div>" +
        "<div>" +
          '<label for="promoLimit">Usage limit</label>' +
          '<input id="promoLimit" type="number" min="0" step="1" value="0">' +
          '<div class="field-hint">0 = unlimited.</div>' +
        "</div>" +
      "</div>" +

      '<div class="btn-row form-actions">' +
        '<button class="btn" id="addPromoBtn" type="button">Create promo</button>' +
      "</div>" +
      '<div id="promoFormMsg" class="msg"></div>' +
    "</div>" +
    table
  );

  document.getElementById("addPromoBtn").onclick = createPromo;

  var toggleButtons = contentEl.querySelectorAll(".toggle-promo");
  for (var t = 0; t < toggleButtons.length; t++) {
    toggleButtons[t].onclick = function () {
      togglePromo(Number(this.getAttribute("data-id")), this.getAttribute("data-status"));
    };
  }

  var deleteButtons = contentEl.querySelectorAll(".del-promo");
  for (var d = 0; d < deleteButtons.length; d++) {
    deleteButtons[d].onclick = function () {
      deletePromo(Number(this.getAttribute("data-id")));
    };
  }
}


async function createPromo() {
  var msg = document.getElementById("promoFormMsg");

  var code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
  var description = document.getElementById("promoDesc").value.trim();
  var type = document.getElementById("promoType").value;
  var value = Number(document.getElementById("promoValue").value);
  var from = document.getElementById("promoFrom").value;
  var to = document.getElementById("promoTo").value;
  var serviceId = Number(document.getElementById("promoService").value);
  var limit = Number(document.getElementById("promoLimit").value);

  if (!limit) {
    limit = 0;
  }

  if (code == "" || !value || from == "" || to == "") {
    setMsg(msg, "Fill in the code, discount value, and both dates.", "error");
    return;
  }

  try {
    var result = await runServer("addPromo", {
      code: code,
      description: description,
      discountType: type,
      discountValue: value,
      validFrom: from,
      validTo: to,
      serviceId: serviceId,
      usageLimit: limit
    });

    if (result.success) {
      toast("Promo created.", "good");
      refreshPage();
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


async function togglePromo(id, status) {
  try {
    await runServer("updatePromoStatus", { id: id, status: status });
    toast("Promo updated.", "good");
    refreshPage();
  } catch (error) {
    handleError(error);
  }
}


async function deletePromo(id) {
  if (!confirm("Delete this promo?")) {
    return;
  }

  try {
    await runServer("deletePromo", id);
    toast("Promo deleted.", "good");
    refreshPage();
  } catch (error) {
    handleError(error);
  }
}


// ------------------------------------------------------------
//  ANALYTICS
// ------------------------------------------------------------

async function showAdminAnalyticsPage() {
  analyticsYear = new Date().getFullYear();
  analyticsMonth = new Date().getMonth() + 1;

  var monthOptions = "";
  for (var m = 1; m <= 12; m++) {
    var monthName = new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
    var selected = "";

    if (m == analyticsMonth) {
      selected = " selected";
    }

    monthOptions += '<option value="' + m + '"' + selected + ">" + monthName + "</option>";
  }

  setContent(
    '<div class="filter-bar">' +
      '<div class="field">' +
        '<label for="anMonth">Month</label>' +
        '<select id="anMonth">' + monthOptions + "</select>" +
      "</div>" +
      '<div class="field">' +
        '<label for="anYear">Year</label>' +
        '<input id="anYear" type="number" value="' + analyticsYear + '" min="2020" max="2100">' +
      "</div>" +
      '<button class="btn secondary" id="anLoadBtn" type="button">Show</button>' +
      '<button class="btn push-right" id="anPdfBtn" type="button" disabled>' + downloadIcon() + "Download PDF</button>" +
    "</div>" +
    '<div id="analyticsBody" style="margin-top:18px;"><p class="muted lead">Loading...</p></div>'
  );

  document.getElementById("anLoadBtn").onclick = function () {
    analyticsYear = Number(document.getElementById("anYear").value) || analyticsYear;
    analyticsMonth = Number(document.getElementById("anMonth").value) || analyticsMonth;
    loadAnalytics();
  };

  document.getElementById("anPdfBtn").onclick = function () {
    downloadSalesReportPdf(lastAnalyticsReport, this);
  };

  await loadAnalytics();
}


async function loadAnalytics() {
  var body = document.getElementById("analyticsBody");
  var pdfButton = document.getElementById("anPdfBtn");
  body.innerHTML = '<p class="muted lead">Loading...</p>';
  pdfButton.disabled = true;

  var data = await runServer("getDailyAnalyticsByMonth", analyticsYear, analyticsMonth);

  // Ang mga may underscore ay hindi araw kundi buod.
  var revenue = data._monthlyRevenue || 0;
  var barberStats = data._barberStats || {};
  var serviceStats = data._serviceStats || {};
  var mostService = data._mostService || {};
  var leastService = data._leastService || {};

  delete data._monthlyRevenue;
  delete data._barberStats;
  delete data._serviceStats;
  delete data._mostService;
  delete data._leastService;

  // Bilangin ang buong buwan.
  var totalApproved = 0;
  var totalCancelled = 0;

  for (var dateKey in data) {
    totalApproved += data[dateKey].approved;
    totalCancelled += data[dateKey].cancelled || 0;
  }

  // Itabi para sa PDF ng sales report.
  lastAnalyticsReport = {
    year: analyticsYear,
    month: analyticsMonth,
    revenue: revenue,
    totalApproved: totalApproved,
    totalCancelled: totalCancelled,
    days: data,
    barberStats: barberStats,
    serviceStats: serviceStats,
    mostService: mostService,
    leastService: leastService
  };
  pdfButton.disabled = false;

  // ----- gawin ang kalendaryo -----
  var firstDay = new Date(analyticsYear, analyticsMonth - 1, 1);
  var daysInMonth = new Date(analyticsYear, analyticsMonth, 0).getDate();
  var today = todayStr();

  var calendar = '<div class="calendar-grid">';

  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (var d = 0; d < dayNames.length; d++) {
    calendar += '<div class="calendar-head">' + dayNames[d] + "</div>";
  }

  for (var blank = 0; blank < firstDay.getDay(); blank++) {
    calendar += '<div class="calendar-cell blank"></div>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var key = analyticsYear + "-" + pad2(analyticsMonth) + "-" + pad2(day);
    var stat = data[key];

    if (!stat) {
      stat = { approved: 0, cancelled: 0, revenue: 0 };
    }

    var cellClass = "calendar-cell";
    if (key == today) {
      cellClass += " is-today";
    }

    var approvedText = '<span class="muted">0</span>';
    if (stat.approved > 0) {
      approvedText = '<span class="ok-count">' + stat.approved + "</span>";
    }

    var cancelledText = "";
    if (stat.cancelled > 0) {
      cancelledText = ' · <span class="bad-count">' + stat.cancelled + "</span>";
    }

    var revenueText = "&nbsp;";
    if (stat.revenue > 0) {
      revenueText = peso(stat.revenue);
    }

    calendar += '<div class="' + cellClass + '">' +
      '<div class="day-num">' + day + "</div>" +
      '<div class="cell-line">' + approvedText + cancelledText + "</div>" +
      '<div class="cell-line">' + revenueText + "</div>" +
      "</div>";
  }

  calendar += "</div>";

  // ----- talahanayan ng barbero -----
  var barberRows = "";
  for (var barberName in barberStats) {
    var b = barberStats[barberName];

    barberRows += "<tr>" +
      "<td>" + escapeHtml(barberName) + "</td>" +
      "<td>" + escapeHtml(b.topService || "—") + "</td>" +
      "<td>" + (b.approved || 0) + "</td>" +
      "<td>" + (b.total || 0) + "</td>" +
      '<td class="right">' + peso(b.revenue || 0) + "</td>" +
      "</tr>";
  }

  var barberTable = '<div class="empty">No data for this month.</div>';
  if (barberRows != "") {
    barberTable =
      '<div class="table-wrap"><table>' +
        "<thead><tr><th>Barber</th><th>Top service</th><th>Pushed through</th>" +
        '<th>Total</th><th class="right">Revenue</th></tr></thead>' +
        "<tbody>" + barberRows + "</tbody>" +
      "</table></div>";
  }

  // ----- talahanayan ng serbisyo -----
  var serviceRows = "";
  for (var serviceName in serviceStats) {
    var s = serviceStats[serviceName];

    serviceRows += "<tr>" +
      "<td>" + escapeHtml(serviceName) + "</td>" +
      "<td>" + escapeHtml(s.topBarber || "—") + "</td>" +
      '<td class="right">' + (s.total || 0) + "</td>" +
      "</tr>";
  }

  var serviceSection = "";
  if (serviceRows != "") {
    serviceSection =
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Service</th><th>Top barber</th><th class="right">Times done</th></tr></thead>' +
        "<tbody>" + serviceRows + "</tbody>" +
      "</table></div>" +
      '<div class="notice" style="margin-top:14px;">' +
        "Most performed: <strong>" + escapeHtml(mostService.name || "—") + "</strong> (" + (mostService.count || 0) + ") · " +
        "Least performed: <strong>" + escapeHtml(leastService.name || "—") + "</strong> (" + (leastService.count || 0) + ")" +
      "</div>";
  }

  body.innerHTML =
    '<div class="stat-grid">' +
      '<div class="stat">' +
        '<div class="stat-label">Revenue this month</div>' +
        '<div class="stat-value">' + peso(revenue) + "</div>" +
        '<div class="stat-foot">Appointments that pushed through</div>' +
      "</div>" +
      '<div class="stat"><div class="stat-label">Pushed through</div><div class="stat-value">' + totalApproved + "</div></div>" +
      '<div class="stat"><div class="stat-label">Cancelled / No-show</div><div class="stat-value">' + totalCancelled + "</div></div>" +
      '<div class="stat">' +
        '<div class="stat-label">Most requested</div>' +
        '<div class="stat-value" style="font-size:16px;">' + escapeHtml(mostService.name || "—") + "</div>" +
        '<div class="stat-foot">' + (mostService.count || 0) + " times</div>" +
      "</div>" +
    "</div>" +

    '<div class="card" style="margin-top:20px;">' +
      "<h3>Calendar</h3>" +
      '<p class="muted small" style="margin-top:4px;">Green = pushed through · Red = cancelled or no-show</p>' +
      calendar +
    "</div>" +

    '<h3 class="section-title">Barber performance this month</h3>' +
    barberTable +

    '<h3 class="section-title">Service summary</h3>' +
    serviceSection;
}


// ------------------------------------------------------------
//  SALES FORECAST
// ------------------------------------------------------------

async function showAdminForecastPage() {
  var result = await runServer("getSalesForecast", 3);

  // Kapag kulang pa ang datos, ipapakita pa rin ang totoong benta.
  if (!result.success) {
    showForecastNotReady(result);
    return;
  }

  lastSalesForecast = result;

  var history = result.history;
  var forecast = result.forecast;
  var model = result.model;
  var currentMonth = result.currentMonth;

  var nextMonth = forecast[0];

  // Mas mataas ba o mas mababa ang benta ngayon kaysa inaasahan?
  var difference = currentMonth.revenue - currentMonth.trend;
  var paceWord = "behind";
  if (difference >= 0) {
    paceWord = "ahead of";
  }

  var bookingWord = "bookings";
  if (currentMonth.bookings == 1) {
    bookingWord = "booking";
  }

  var accuracyText = "—";
  if (model.accuracy !== null) {
    accuracyText = model.accuracy + "%";
  }

  var slopeSign = "";
  if (model.slope >= 0) {
    slopeSign = "+";
  }

  // Talahanayan ng hula.
  var forecastRows = "";
  for (var i = 0; i < forecast.length; i++) {
    var f = forecast[i];

    forecastRows += "<tr>" +
      "<td>" + escapeHtml(f.label) + "</td>" +
      '<td class="right muted">' + peso(f.low) + "</td>" +
      '<td class="right strong">' + peso(f.predicted) + "</td>" +
      '<td class="right muted">' + peso(f.high) + "</td>" +
      "</tr>";
  }

  // Talahanayan ng kasaysayan, kasama ang kasalukuyang buwan.
  var historyRows = "";
  var allMonths = history.concat([currentMonth]);

  for (var j = 0; j < allMonths.length; j++) {
    var h = allMonths[j];

    var partialTag = "";
    if (h.partial) {
      partialTag = ' <span class="pill plain">In progress</span>';
    }

    historyRows += "<tr>" +
      "<td>" + escapeHtml(h.label) + partialTag + "</td>" +
      '<td class="right">' + h.bookings + "</td>" +
      '<td class="right">' + peso(h.revenue) + "</td>" +
      '<td class="right muted">' + peso(h.trend) + "</td>" +
      "</tr>";
  }

  setContent(
    '<div class="btn-row end" style="margin-bottom:16px;">' +
      '<button class="btn" id="forecastPdfBtn" type="button">' + downloadIcon() + "Download PDF</button>" +
    "</div>" +
    '<div class="stat-grid">' +
      '<div class="stat">' +
        '<div class="stat-label">Forecast for ' + escapeHtml(nextMonth.label) + "</div>" +
        '<div class="stat-value">' + peso(nextMonth.predicted) + "</div>" +
        '<div class="stat-foot">Range: ' + peso(nextMonth.low) + " – " + peso(nextMonth.high) + "</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Sales trend</div>' +
        '<div class="stat-value" style="font-size:20px;">' + escapeHtml(model.direction) + "</div>" +
        '<div class="stat-foot">' + slopeSign + peso(model.slope) + " per month</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Model accuracy</div>' +
        '<div class="stat-value">' + accuracyText + "</div>" +
        '<div class="stat-foot">Based on ' + model.monthsUsed + " months of data</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">' + escapeHtml(currentMonth.label) + " so far</div>" +
        '<div class="stat-value">' + peso(currentMonth.revenue) + "</div>" +
        '<div class="stat-foot">' + currentMonth.bookings + " " + bookingWord + " · " +
          paceWord + " the trend by " + peso(Math.abs(difference)) + "</div>" +
      "</div>" +
    "</div>" +

    '<div class="card" style="margin-top:20px;">' +
      "<h3>Sales: history and forecast</h3>" +
      '<div class="chart">' + drawForecastChart(history, currentMonth, forecast) + "</div>" +
      '<div class="chart-legend">' +
        '<span><i class="swatch"></i> Actual sales</span>' +
        '<span><i class="swatch dashed"></i> Model forecast</span>' +
        '<span class="muted">' + escapeHtml(currentMonth.label) +
          " is still in progress, so it is not used to train the model.</span>" +
      "</div>" +
    "</div>" +

    '<div class="card">' +
      "<h3>Forecast details</h3>" +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Month</th><th class="right">Lowest</th>' +
        '<th class="right">Forecast</th><th class="right">Highest</th></tr></thead>' +
        "<tbody>" + forecastRows + "</tbody>" +
      "</table></div>" +
    "</div>" +

    '<h3 class="section-title">Sales history</h3>' +
    '<div class="table-wrap"><table>' +
      '<thead><tr><th>Month</th><th class="right">Bookings</th>' +
      '<th class="right">Actual sales</th><th class="right">Model line</th></tr></thead>' +
      "<tbody>" + historyRows + "</tbody>" +
    "</table></div>"
  );

  document.getElementById("forecastPdfBtn").onclick = function () {
    downloadSalesForecastPdf(lastSalesForecast, this);
  };
}


// Ipinapakita kapag wala pang sapat na datos para makapaghula.
function showForecastNotReady(result) {
  var history = result.history || [];

  // Kunin lang ang mga buwan na may talagang benta.
  var withSales = [];
  var totalRevenue = 0;
  var totalBookings = 0;

  for (var i = 0; i < history.length; i++) {
    if (history[i].bookings > 0) {
      withSales.push(history[i]);
      totalRevenue += history[i].revenue;
      totalBookings += history[i].bookings;
    }
  }

  var salesSection = "";

  if (withSales.length > 0) {
    var rows = "";

    for (var j = 0; j < withSales.length; j++) {
      rows += "<tr>" +
        "<td>" + escapeHtml(withSales[j].label) + "</td>" +
        '<td class="right">' + withSales[j].bookings + "</td>" +
        '<td class="right">' + peso(withSales[j].revenue) + "</td>" +
        "</tr>";
    }

    salesSection =
      '<div class="stat-grid" style="margin-top:20px;">' +
        '<div class="stat">' +
          '<div class="stat-label">Months with sales</div>' +
          '<div class="stat-value">' + withSales.length + " / 3</div>" +
          '<div class="stat-foot">Needed before forecasting</div>' +
        "</div>" +
        '<div class="stat">' +
          '<div class="stat-label">Total recorded sales</div>' +
          '<div class="stat-value">' + peso(totalRevenue) + "</div>" +
        "</div>" +
        '<div class="stat">' +
          '<div class="stat-label">Total bookings</div>' +
          '<div class="stat-value">' + totalBookings + "</div>" +
        "</div>" +
      "</div>" +

      '<h3 class="section-title">Sales recorded so far</h3>' +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Month</th><th class="right">Bookings</th><th class="right">Sales</th></tr></thead>' +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  setContent(
    '<div class="notice info">' + escapeHtml(result.message) + "</div>" +
    salesSection
  );
}


// ------------------------------------------------------------
//  CUSTOMER FORECAST
//  Hinuhulaan kung ilang customer ang darating sa susunod na
//  buwan. Parehong linear regression ng Sales Forecast, pero
//  bilang ng customer ang ginagamit imbes na benta.
// ------------------------------------------------------------

async function showAdminCustomerForecastPage() {
  var result = await runServer("getCustomerForecast", 3);

  if (!result.success) {
    showCustomerForecastNotReady(result);
    return;
  }

  var history = result.history;
  var forecast = result.forecast;
  var model = result.model;
  var currentMonth = result.currentMonth;
  var nextMonth = forecast[0];

  // Ihambing ang huling tapos na buwan sa hula para sa susunod.
  var lastMonth = history[history.length - 1];
  var changeText = "Same as " + lastMonth.label;
  var change = nextMonth.predicted - lastMonth.customers;

  if (change > 0) {
    changeText = "+" + change + " vs " + lastMonth.label;
  } else if (change < 0) {
    changeText = change + " vs " + lastMonth.label;
  }

  var accuracyText = "—";
  if (model.accuracy !== null) {
    accuracyText = model.accuracy + "%";
  }

  var slopeSign = "";
  if (model.slope >= 0) {
    slopeSign = "+";
  }

  var forecastRows = "";
  for (var i = 0; i < forecast.length; i++) {
    var f = forecast[i];

    forecastRows += "<tr>" +
      "<td>" + escapeHtml(f.label) + "</td>" +
      '<td class="right muted">' + f.low + "</td>" +
      '<td class="right strong">' + f.predicted + "</td>" +
      '<td class="right muted">' + f.high + "</td>" +
      '<td class="right">' + f.unique + "</td>" +
      "</tr>";
  }

  var historyRows = "";
  var allMonths = history.concat([currentMonth]);

  for (var j = 0; j < allMonths.length; j++) {
    var h = allMonths[j];

    var partialTag = "";
    if (h.partial) {
      partialTag = ' <span class="pill plain">In progress</span>';
    }

    historyRows += "<tr>" +
      "<td>" + escapeHtml(h.label) + partialTag + "</td>" +
      '<td class="right">' + h.customers + "</td>" +
      '<td class="right">' + h.unique + "</td>" +
      '<td class="right muted">' + h.trend + "</td>" +
      "</tr>";
  }

  setContent(
    '<div class="stat-grid">' +
      '<div class="stat">' +
        '<div class="stat-label">Expected customers in ' + escapeHtml(nextMonth.label) + "</div>" +
        '<div class="stat-value">' + nextMonth.predicted + "</div>" +
        '<div class="stat-foot">Range: ' + nextMonth.low + " – " + nextMonth.high + " · " + escapeHtml(changeText) + "</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Different people expected</div>' +
        '<div class="stat-value">' + nextMonth.unique + "</div>" +
        '<div class="stat-foot">Some customers visit more than once</div>' +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Customer trend</div>' +
        '<div class="stat-value" style="font-size:22px;">' + escapeHtml(model.direction) + "</div>" +
        '<div class="stat-foot">' + slopeSign + model.slope + " customers per month · accuracy " + accuracyText + "</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">' + escapeHtml(currentMonth.label) + " so far</div>" +
        '<div class="stat-value">' + currentMonth.customers + "</div>" +
        '<div class="stat-foot">' + currentMonth.upcoming + " more already booked this month</div>" +
      "</div>" +
    "</div>" +

    '<div class="card" style="margin-top:20px;">' +
      "<h3>Customers: history and forecast</h3>" +
      '<div class="chart">' + drawForecastChart(history, currentMonth, forecast, "customers") + "</div>" +
      '<div class="chart-legend">' +
        '<span><i class="swatch"></i> Actual customers</span>' +
        '<span><i class="swatch dashed"></i> Model forecast</span>' +
        '<span class="muted">Based on ' + model.monthsUsed + " completed months · average " + model.average + " customers per month</span>" +
      "</div>" +
    "</div>" +

    '<div class="card">' +
      "<h3>Forecast details</h3>" +
      '<p class="muted small" style="margin-top:4px;">A customer is counted each time an appointment pushes through.</p>' +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Month</th><th class="right">Lowest</th><th class="right">Expected</th>' +
        '<th class="right">Highest</th><th class="right">Different people</th></tr></thead>' +
        "<tbody>" + forecastRows + "</tbody>" +
      "</table></div>" +
    "</div>" +

    '<h3 class="section-title">Customer history</h3>' +
    '<div class="table-wrap"><table>' +
      '<thead><tr><th>Month</th><th class="right">Customers</th>' +
      '<th class="right">Different people</th><th class="right">Model line</th></tr></thead>' +
      "<tbody>" + historyRows + "</tbody>" +
    "</table></div>"
  );
}


// Kapag kulang pa ang datos para makapaghula.
function showCustomerForecastNotReady(result) {
  var history = result.history || [];
  var rows = "";

  for (var i = 0; i < history.length; i++) {
    if (history[i].customers > 0) {
      rows += "<tr>" +
        "<td>" + escapeHtml(history[i].label) + "</td>" +
        '<td class="right">' + history[i].customers + "</td>" +
        '<td class="right">' + history[i].unique + "</td>" +
        "</tr>";
    }
  }

  var table = "";
  if (rows != "") {
    table =
      '<h3 class="section-title">Customers recorded so far</h3>' +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Month</th><th class="right">Customers</th><th class="right">Different people</th></tr></thead>' +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  setContent(
    '<div class="notice info">' + escapeHtml(result.message) + "</div>" +
    table
  );
}


// ------------------------------------------------------------
//  ANG GRAPH NG FORECAST
//  Gumagawa ako ng SVG gamit lang ang string. Ang solidong linya
//  ay totoong benta, ang putol-putol ay ang hula ng modelo.
// ------------------------------------------------------------

// Ang numero sa gilid ng graph. Kapag maliit ang pinakamataas
// (gaya ng bilang ng customer), may isang decimal para hindi
// magkapareho ang mga label.
function axisNumber(value, maxValue) {
  if (maxValue < 10) {
    return (Math.round(value * 10) / 10).toString();
  }
  return Math.round(value).toLocaleString();
}


function drawForecastChart(history, currentMonth, forecast, valueKey) {
  // Anong field ang ipapakita. "revenue" para sa benta,
  // "customers" para sa bilang ng customer.
  if (!valueKey) {
    valueKey = "revenue";
  }

  var width = 760;
  var height = 260;
  var padLeft = 62;
  var padRight = 16;
  var padTop = 18;
  var padBottom = 38;

  // Pagsamahin ang lahat ng punto. Kasama ang kasalukuyang buwan
  // bilang totoong benta para magdikit ang dalawang linya.
  var actualMonths = history.concat([currentMonth]);
  var points = [];

  for (var i = 0; i < actualMonths.length; i++) {
    points.push({ label: actualMonths[i].label, value: actualMonths[i][valueKey], kind: "actual" });
  }
  for (var j = 0; j < forecast.length; j++) {
    points.push({ label: forecast[j].label, value: forecast[j].predicted, kind: "forecast" });
  }

  // Hanapin ang pinakamataas para malaman ang sukat ng graph.
  var maxValue = 1;
  for (var k = 0; k < points.length; k++) {
    if (points[k].value > maxValue) {
      maxValue = points[k].value;
    }
  }

  var stepX = (width - padLeft - padRight) / (points.length - 1);
  var chartHeight = height - padTop - padBottom;

  // Saan sa graph ilalagay ang punto?
  function xAt(index) {
    return padLeft + (index * stepX);
  }

  function yAt(value) {
    return height - padBottom - ((value / maxValue) * chartHeight);
  }

  // ----- mga guhit sa likod at ang numero sa gilid -----
  var gridLines = "";
  var ratios = [0, 0.25, 0.5, 0.75, 1];

  for (var g = 0; g < ratios.length; g++) {
    var value = maxValue * (1 - ratios[g]);
    var lineY = padTop + (ratios[g] * chartHeight);

    gridLines += '<line x1="' + padLeft + '" y1="' + lineY + '" x2="' + (width - padRight) +
                 '" y2="' + lineY + '" style="stroke:var(--chart-grid)" stroke-width="1"/>' +
                 '<text x="' + (padLeft - 8) + '" y="' + (lineY + 4) +
                 '" text-anchor="end" font-size="12" style="fill:var(--chart-text)">' +
                 axisNumber(value, maxValue) + "</text>";
  }

  // ----- ang solidong linya (totoong benta) -----
  var actualPath = "";
  for (var a = 0; a < actualMonths.length; a++) {
    var command = "L";
    if (a == 0) {
      command = "M";
    }
    actualPath += command + xAt(a) + "," + yAt(points[a].value) + " ";
  }

  // ----- ang putol-putol na linya (hula) -----
  // Nagsisimula ito sa huling totoong punto para magdikit.
  var lastActual = actualMonths.length - 1;
  var forecastPath = "M" + xAt(lastActual) + "," + yAt(points[lastActual].value) + " ";

  for (var f = 0; f < forecast.length; f++) {
    forecastPath += "L" + xAt(lastActual + 1 + f) + "," + yAt(forecast[f].predicted) + " ";
  }

  // ----- maliliit na bilog sa bawat punto -----
  var dots = "";
  for (var d = 0; d < points.length; d++) {
    var fillColor = "var(--white)";
    var strokeColor = "var(--chart-forecast)";

    if (points[d].kind == "actual") {
      fillColor = "var(--chart-actual)";
      strokeColor = "var(--chart-actual)";
    }

    dots += '<circle cx="' + xAt(d) + '" cy="' + yAt(points[d].value) + '" r="4" style="fill:' +
            fillColor + ";stroke:" + strokeColor + '" stroke-width="2"/>';
  }

  // ----- pangalan ng buwan sa ilalim -----
  // Kapag masikip, ilan lang ang ipapakita.
  var labelEvery = Math.ceil(points.length / 8);
  var labels = "";

  for (var L = 0; L < points.length; L++) {
    if (L % labelEvery == 0 || L == points.length - 1) {
      labels += '<text x="' + xAt(L) + '" y="' + (height - 14) +
                '" text-anchor="middle" font-size="12" style="fill:var(--chart-text)">' +
                escapeHtml(points[L].label) + "</text>";
    }
  }

  return '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Forecast chart">' +
           gridLines +
           '<path d="' + actualPath + '" fill="none" style="stroke:var(--chart-actual)" stroke-width="2.5"/>' +
           '<path d="' + forecastPath + '" fill="none" style="stroke:var(--chart-forecast)" stroke-width="2.5" stroke-dasharray="6 5"/>' +
           dots + labels +
         "</svg>";
}


// ------------------------------------------------------------
//  BARBER PERFORMANCE
// ------------------------------------------------------------

async function showAdminPerformancePage() {
  var barbers = await runServer("getBarberPerformance");

  if (barbers.length == 0) {
    setContent('<div class="empty">No barbers yet.</div>');
    return;
  }

  // Kalkulahin ang rating ng buong shop.
  // Weighted ito: mas maraming review, mas malaki ang bigat.
  var totalFeedback = 0;
  var ratingSum = 0;
  var ratedCount = 0;
  var best = null;

  for (var i = 0; i < barbers.length; i++) {
    var barber = barbers[i];

    if (barber.ratingCount > 0) {
      totalFeedback += barber.ratingCount;
      ratingSum += barber.rating * barber.ratingCount;
      ratedCount++;

      if (best == null) {
        best = barber;
      }
    }
  }

  var shopRating = 0;
  if (totalFeedback > 0) {
    shopRating = ratingSum / totalFeedback;
  }

  var shopRatingText = "—";
  if (shopRating > 0) {
    shopRatingText = shopRating.toFixed(1);
  }

  var reviewWord = "reviews";
  if (totalFeedback == 1) {
    reviewWord = "review";
  }

  var bestName = "—";
  var bestDetail = "No feedback yet";

  if (best != null) {
    bestName = escapeHtml(best.name);
    var bestWord = "reviews";
    if (best.ratingCount == 1) {
      bestWord = "review";
    }
    bestDetail = best.rating.toFixed(1) + " from " + best.ratingCount + " " + bestWord;
  }

  // ----- buod na talahanayan -----
  var summaryRows = "";

  for (var j = 0; j < barbers.length; j++) {
    var b = barbers[j];
    var appts = b.appointments;

    var inactiveTag = "";
    if (b.status == "Inactive") {
      inactiveTag = ' <span class="pill inactive">Inactive</span>';
    }

    var specialtyHtml = "";
    if (b.specialty) {
      specialtyHtml = '<div class="muted small">' + escapeHtml(b.specialty) + "</div>";
    }

    var ratingCell = '<span class="muted small">None yet</span>';
    if (b.ratingCount > 0) {
      ratingCell = starsHtml(b.rating, b.ratingCount);
    }

    summaryRows += "<tr>" +
      "<td>" + escapeHtml(b.name) + inactiveTag + specialtyHtml + "</td>" +
      "<td>" + ratingCell + "</td>" +
      "<td>" + b.ratingCount + "</td>" +
      "<td>" + (appts.completed + appts.approved) + "</td>" +
      "<td>" + appts.cancelled + "</td>" +
      "<td>" + appts.noShow + "</td>" +
      '<td class="right">' + peso(appts.revenue) + "</td>" +
      "</tr>";
  }

  // ----- detalye ng bawat barbero -----
  var details = "";

  for (var k = 0; k < barbers.length; k++) {
    var barber2 = barbers[k];

    // Hati-hati ng bituin: ilan ang 5 star, 4 star, atbp.
    var total = barber2.ratingCount;
    if (total == 0) {
      total = 1;   // para hindi mag-divide by zero
    }

    var bars = "";
    var starLevels = [5, 4, 3, 2, 1];

    for (var s = 0; s < starLevels.length; s++) {
      var level = starLevels[s];
      var count = barber2.stars["" + level] || 0;
      var percent = 0;

      if (barber2.ratingCount > 0) {
        percent = Math.round((count / total) * 100);
      }

      bars += '<div class="rating-bar">' +
        "<span>" + level + " ★</span>" +
        '<span class="track"><span class="fill" style="width:' + percent + '%"></span></span>' +
        "<span>" + count + "</span>" +
        "</div>";
    }

    // Pinakabagong mga komento.
    var comments = '<p class="muted small" style="margin-top:10px;">No comments yet.</p>';

    if (barber2.recentComments.length > 0) {
      comments = "";

      for (var c = 0; c < barber2.recentComments.length; c++) {
        var review = barber2.recentComments[c];

        var commentText = '<p class="muted small" style="margin-top:4px;">(No comment)</p>';
        if (review.comment) {
          commentText = '<p class="small" style="margin-top:4px;">' + escapeHtml(review.comment) + "</p>";
        }

        comments += '<div style="padding:10px 0;border-top:1px solid var(--border-color);">' +
          '<div class="rating-line">' + starsHtml(review.rating) +
            '<span class="muted small">' + escapeHtml(review.customer) + " · " + formatDate(review.date) + "</span>" +
          "</div>" +
          commentText +
          "</div>";
      }
    }

    details += '<div class="card">' +
      '<div class="card-head">' +
        "<div>" +
          "<h3>" + escapeHtml(barber2.name) + "</h3>" +
          '<div style="margin-top:6px;">' + starsHtml(barber2.rating, barber2.ratingCount) + "</div>" +
        "</div>" +
        '<div class="right">' +
          '<div class="muted small">Revenue</div>' +
          '<div class="strong">' + peso(barber2.appointments.revenue) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="rating-bars">' + bars + "</div>" +
      '<h4 style="margin-top:18px;">Latest feedback</h4>' +
      comments +
      "</div>";
  }

  setContent(
    '<div class="stat-grid">' +
      '<div class="stat">' +
        '<div class="stat-label">Shop rating</div>' +
        '<div class="stat-value">' + shopRatingText + "</div>" +
        '<div style="margin-top:2px;">' + starsHtml(shopRating) + "</div>" +
        '<div class="stat-foot">' + totalFeedback + " " + reviewWord + " in total</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Highest rated</div>' +
        '<div class="stat-value" style="font-size:18px;">' + bestName + "</div>" +
        '<div class="stat-foot">' + bestDetail + "</div>" +
      "</div>" +
      '<div class="stat">' +
        '<div class="stat-label">Rated so far</div>' +
        '<div class="stat-value">' + ratedCount + " / " + barbers.length + "</div>" +
        '<div class="stat-foot">Barbers who have received feedback</div>' +
      "</div>" +
    "</div>" +

    '<div class="table-wrap"><table>' +
      "<thead><tr><th>Barber</th><th>Rating</th><th>Reviews</th><th>Pushed through</th>" +
      '<th>Cancelled</th><th>No-show</th><th class="right">Revenue</th></tr></thead>' +
      "<tbody>" + summaryRows + "</tbody>" +
    "</table></div>" +

    '<h3 class="section-title">Breakdown per barber</h3>' +
    details
  );
}


// ------------------------------------------------------------
//  SHOP SETTINGS
// ------------------------------------------------------------

async function showAdminSettingsPage() {
  var settings = await runServer("getSettings");

  // Gumagawa ng dropdown ng oras mula 12 AM hanggang 11 PM.
  function buildHourOptions(selectedHour) {
    var options = "";

    for (var hour = 0; hour < 24; hour++) {
      var selected = "";
      if (hour == selectedHour) {
        selected = " selected";
      }

      options += '<option value="' + hour + '"' + selected + ">" +
                 formatTime(pad2(hour) + ":00") + "</option>";
    }

    return options;
  }

  setContent(
    '<div class="card">' +
      "<h3>Shop information</h3>" +
      '<label for="setShopName">Shop name</label>' +
      '<input id="setShopName" type="text" value="' + escapeHtml(settings.shopName) + '">' +
      '<div class="field-hint">This is what appears in the header of every page.</div>' +

      '<h3 style="margin-top:26px;">Booking hours</h3>' +
      '<div class="field-row">' +
        "<div>" +
          '<label for="setOpen">Open from</label>' +
          '<select id="setOpen">' + buildHourOptions(settings.openHour) + "</select>" +
        "</div>" +
        "<div>" +
          '<label for="setClose">Until</label>' +
          '<select id="setClose">' + buildHourOptions(settings.closeHour) + "</select>" +
        "</div>" +
      "</div>" +

      '<label for="setSlot">Length of each slot (hours)</label>' +
      '<input id="setSlot" type="number" min="1" max="8" value="' + settings.slotHours + '">' +
      '<div class="field-hint">This sets the gap between the times customers can choose.</div>' +

      '<div class="btn-row form-actions">' +
        '<button class="btn" id="saveSettingsBtn" type="button">Save settings</button>' +
      "</div>" +
      '<div id="settingsMsg" class="msg"></div>' +
    "</div>"
  );

  document.getElementById("saveSettingsBtn").onclick = saveShopSettings;
}


async function saveShopSettings() {
  var msg = document.getElementById("settingsMsg");

  var shopName = document.getElementById("setShopName").value.trim();
  var openHour = Number(document.getElementById("setOpen").value);
  var closeHour = Number(document.getElementById("setClose").value);
  var slotHours = Number(document.getElementById("setSlot").value);

  if (shopName == "") {
    setMsg(msg, "The shop name is required.", "error");
    return;
  }

  if (openHour >= closeHour) {
    setMsg(msg, "The closing time must be later than the opening time.", "error");
    return;
  }

  try {
    var result = await runServer("updateSettings", {
      shopName: shopName,
      openHour: openHour,
      closeHour: closeHour,
      slotHours: slotHours
    });

    if (result.success) {
      // I-update din ang natatandaan ng browser at ang header.
      shopSettings = {
        shopName: shopName,
        openHour: openHour,
        closeHour: closeHour,
        slotHours: slotHours
      };

      var spots = document.querySelectorAll("[data-shop-name]");
      for (var i = 0; i < spots.length; i++) {
        spots[i].textContent = shopName;
      }

      setMsg(msg, "Settings saved.", "ok");
      toast("Settings saved.", "good");
    } else {
      setMsg(msg, result.message, "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}
