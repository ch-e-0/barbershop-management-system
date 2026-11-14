// ============================================================
//  api.js
//  Dito ko inilagay ang mga function na ginagamit ng LAHAT ng
//  page - ang pagtawag sa server, pag-format ng petsa at presyo,
//  at ang pag-check kung sino ang naka-login.
//
//  Ito ang unang script na ni-load ng bawat HTML file.
// ============================================================


// Ito ang paraan ng pakikipag-usap ng JavaScript sa PHP.
// Halimbawa ng paggamit:
//     runServer("getServices")
//     runServer("login", { username: "juan", password: "secret" })
function runServer(action) {
  // Ang lahat ng ipinasa maliban sa una ay ilalagay sa args.
  var args = [];
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }

  return fetch("api/index.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action: action, args: args })
  }).then(function (response) {
    return response.json().then(function (result) {
      // Kapag may error ang server, ito ang lalabas na mensahe.
      if (!response.ok) {
        throw new Error(result.message || "Server error");
      }
      return result;
    });
  });
}


// ------------------------------------------------------------
//  PAG-FORMAT
// ------------------------------------------------------------

// Pinapalitan ang mga simbolo na pwedeng maging HTML tag.
// Mahalaga ito para hindi makapaglagay ng script ang user.
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }

  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}


// 250 -> "₱250.00"
function peso(amount) {
  var number = Number(amount);
  if (isNaN(number)) {
    number = 0;
  }
  return "₱" + number.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// 5 -> "05". Ginagamit sa oras at petsa.
function pad2(number) {
  if (number < 10) {
    return "0" + number;
  }
  return "" + number;
}


// "2026-08-25" -> "Aug 25, 2026"
function formatDate(dateText) {
  if (!dateText) {
    return "";
  }

  var parts = String(dateText).split("-");
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);

  if (!year || !month || !day) {
    return dateText;
  }

  var d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


// "14:00" -> "02:00 PM"
function formatTime(timeText) {
  var hour = Number(String(timeText || "").split(":")[0]);

  if (isNaN(hour)) {
    return timeText || "";
  }

  var hour12 = hour % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }

  var ampm = "AM";
  if (hour >= 12) {
    ampm = "PM";
  }

  return pad2(hour12) + ":00 " + ampm;
}


// Petsa ngayon sa porma na "2026-08-25".
function todayStr() {
  var now = new Date();
  return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
}


// ------------------------------------------------------------
//  MALILIIT NA PIRASO NG UI
// ------------------------------------------------------------

// Ginagawang may kulay na label ang status ng appointment.
function statusPill(status) {
  // "No-show" -> "noshow" para gawing CSS class.
  var className = String(status || "").toLowerCase().split("-").join("");
  return '<span class="pill ' + className + '">' + escapeHtml(status) + "</span>";
}


// Mga bituin na tinitingnan lang, hindi pinipindot.
// Kapag may ipinasang count, may nakasulat ding bilang sa tabi.
function starsHtml(rating, count) {
  var value = Math.round(Number(rating) || 0);
  var stars = "";

  for (var i = 1; i <= 5; i++) {
    if (i <= value) {
      stars += "★";
    } else {
      stars += '<span class="off">★</span>';
    }
  }

  var extra = "";
  if (count !== undefined) {
    var label = "No rating";
    if (rating) {
      label = Number(rating).toFixed(1);
    }
    if (count) {
      label += " (" + count + ")";
    }
    extra = '<span class="muted small">' + label + "</span>";
  }

  return '<span class="rating-line"><span class="stars">' + stars + "</span>" + extra + "</span>";
}


// Naglalagay ng mensahe sa ilalim ng isang form.
// Ang type ay "error", "ok", o walang laman.
function setMsg(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message;

  if (type) {
    element.className = "msg " + type;
  } else {
    element.className = "msg";
  }
}


// Kapag may error na galing sa server, ito ang ipinapakita.
function showError(element, error) {
  console.log(error);

  var message = "Something went wrong. Please try again.";
  if (error && error.message) {
    message = error.message;
  }

  setMsg(element, message, "error");
}


// ------------------------------------------------------------
//  MOBILE NUMBER: 09XX-XXX-XXXX
// ------------------------------------------------------------

// Awtomatikong naglalagay ng dash habang nagta-type.
function formatPhoneNumber(input) {
  // Tanggalin muna lahat ng hindi numero.
  var value = input.value.replace(/\D/g, "");

  // Laging nagsisimula sa 0.
  if (value.length > 0 && value.charAt(0) !== "0") {
    value = "0" + value;
  }

  // Lagyan ng dash pagkatapos ng 09XX at ng susunod na XXX.
  if (value.length > 4) {
    value = value.slice(0, 4) + "-" + value.slice(4);
  }
  if (value.length > 8) {
    value = value.slice(0, 8) + "-" + value.slice(8);
  }

  // 09XX-XXX-XXXX = 13 karakter.
  input.value = value.slice(0, 13);
}


function isValidPhone(value) {
  var pattern = /^09\d{2}-\d{3}-\d{4}$/;
  return pattern.test(String(value || "").trim());
}


// Kinakabit ang auto-format sa lahat ng input na may data-phone.
function initPhoneInputs(root) {
  if (!root) {
    root = document;
  }

  var inputs = root.querySelectorAll("input[data-phone]");

  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    input.addEventListener("input", function () {
      formatPhoneNumber(this);
    });
  }
}


// ------------------------------------------------------------
//  PASSWORD
// ------------------------------------------------------------

// Pareho ito ng panuntunan sa server (tingnan ang checkPassword
// sa api/index.php). Dito lang ito para hindi na kailangang
// maghintay ng sagot ng server bago sabihin ang mali.
function passwordProblem(password) {
  if (String(password).length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return "";
}


// ------------------------------------------------------------
//  SESSION
// ------------------------------------------------------------

// Tinatago ko ang sagot ng server para hindi paulit-ulit magtanong.
var savedSession = null;


function getSession() {
  if (savedSession !== null) {
    return Promise.resolve(savedSession);
  }

  return runServer("session").then(function (result) {
    savedSession = result;
    return result;
  });
}


// Ginagamit ng dashboard. Kapag walang naka-login, balik sa login page.
function requireSession() {
  return getSession().then(function (session) {
    if (!session.loggedIn) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  });
}


// Ginagamit ng login at register page. Kapag naka-login na,
// huwag nang ipakita ang form.
function redirectIfLoggedIn() {
  return getSession().then(function (session) {
    if (session.loggedIn) {
      window.location.replace("dashboard.html");
    }
    return session;
  });
}


function logout() {
  runServer("logout").catch(function () {
    // Kahit pumalya ang server, ilalabas pa rin natin siya.
  }).then(function () {
    window.location.replace("index.html");
  });
}


// ------------------------------------------------------------
//  PANGALAN NG SHOP
// ------------------------------------------------------------

// Kinukuha ang settings at inilalagay ang pangalan ng shop sa
// lahat ng elementong may data-shop-name.
function loadShopName() {
  return runServer("getSettings").then(function (settings) {
    var spots = document.querySelectorAll("[data-shop-name]");

    for (var i = 0; i < spots.length; i++) {
      spots[i].textContent = settings.shopName;
    }

    return settings;
  }).catch(function () {
    // Kapag hindi maabot ang server, default na lang ang gamitin.
    return { shopName: "Supremo Barbershop", openHour: 8, closeHour: 20, slotHours: 1 };
  });
}
