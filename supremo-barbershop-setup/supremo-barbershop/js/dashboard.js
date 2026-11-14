// ============================================================
//  dashboard.js
//  Ito ang "traffic enforcer" ng dashboard. Siya ang nagpapasya
//  kung anong page ang ipapakita depende sa pinindot na menu
//  at kung anong role ang naka-login.
//
//  Ito ang HULING script na ni-load ng dashboard.html, kaya
//  nandiyan na lahat ng function ng ibang file bago ito tumakbo.
// ============================================================


// Mga bahagi ng page na paulit-ulit kong hinahawakan.
var contentEl = document.getElementById("content");
var pageTitleEl = document.getElementById("pageTitle");
var pageSubtitleEl = document.getElementById("pageSubtitle");
var breadcrumbEl = document.getElementById("pageBreadcrumb");
var sideNavEl = document.getElementById("sideNav");
var modalEl = document.getElementById("modal");
var modalCardEl = document.getElementById("modalCard");

// Sino ang naka-login at ano ang settings ng shop.
var session = null;
var shopSettings = { shopName: "Supremo Barbershop", openHour: 8, closeHour: 20, slotHours: 1 };

// Anong page ang bukas ngayon.
var currentPage = "";


// ------------------------------------------------------------
//  ANG MENU NG BAWAT ROLE
//  Ang "divider" ay guhit lang na pambukod, hindi pindutin.
// ------------------------------------------------------------

var customerMenu = [
  { key: "services", label: "Services" },
  { key: "book", label: "Book Appointment" },
  { key: "my-appointments", label: "My Appointments" },
  { key: "promos", label: "Promos" },
  { divider: true },
  { key: "account", label: "Account Settings" }
];

var barberMenu = [
  { key: "barber-overview", label: "Overview" },
  { key: "barber-appointments", label: "My Appointments" },
  { key: "barber-schedule", label: "My Schedule" },
  { divider: true },
  { key: "account", label: "Account Settings" }
];

var adminMenu = [
  { key: "admin-appointments", label: "Appointments" },
  { key: "admin-services", label: "Services" },
  { key: "admin-barbers", label: "Barbers" },
  { key: "admin-customers", label: "Customers" },
  { key: "admin-promos", label: "Promos" },
  { divider: true },
  { key: "admin-analytics", label: "Analytics" },
  { key: "admin-forecast", label: "Sales Forecast" },
  { key: "admin-customer-forecast", label: "Customer Forecast" },
  { key: "admin-performance", label: "Barber Performance" },
  { divider: true },
  { key: "admin-settings", label: "Shop Settings" },
  { key: "account", label: "Account Settings" }
];


// ------------------------------------------------------------
//  MGA ICON NG MENU
//
//  Galing ito sa Lucide (lucide.dev) na ISC license - libreng
//  gamitin at walang kailangang atribusyon.
//
//  Isinulat ko sila dito mismo bilang SVG imbes na larawan
//  dahil sa dalawang bagay:
//    1. walang dagdag na file, at gumagana kahit walang internet
//    2. ang stroke="currentColor" ay sumusunod sa kulay ng text,
//       kaya kusang pumuputi ang icon kapag naka-highlight ang
//       menu item (itim kasi ang background kapag aktibo)
// ------------------------------------------------------------

var menuIcons = {

  "services":
    '<circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" />',

  "book":
    '<path d="M16 18h6" /><path d="M16 2v3" /><path d="M19 15v6" /><path d="M21 11.5V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h8.3" /><path d="M3 9h18" /><path d="M8 2v3" />',

  "my-appointments":
    '<path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="m9 15 2 2 4-4" />',

  "promos":
    '<path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M9 9h.01" /><path d="m15 9-6 6" /><path d="M15 15h.01" />',

  "account":
    '<circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />',

  "barber-overview":
    '<rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />',

  "barber-appointments":
    '<path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />',

  "barber-schedule":
    '<path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M8 13h.01" /><path d="M12 13h.01" /><path d="M16 13h.01" /><path d="M8 17h.01" /><path d="M12 17h.01" /><path d="M16 17h.01" />',

  "admin-appointments":
    '<path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />',

  "admin-services":
    '<circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" />',

  "admin-barbers":
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />',

  "admin-customers":
    '<path d="M16 2v2" /><path d="M7 21v-2a2 2 0 012-2h6a2 2 0 012 2v2" /><path d="M8 2v2" /><circle cx="12" cy="10" r="3" /><rect x="3" y="3" width="18" height="18" rx="2" />',

  "admin-promos":
    '<path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M9 9h.01" /><path d="m15 9-6 6" /><path d="M15 15h.01" />',

  "admin-analytics":
    '<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />',

  "admin-forecast":
    '<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />',

  "admin-customer-forecast":
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M17 11l2-2 2 2" /><path d="M19 9v7" />',

  "admin-performance":
    '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />',

  "admin-settings":
    '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />',
};


// Binabalot ang laman ng icon sa isang <svg> tag.
function iconFor(pageKey) {
  var inside = menuIcons[pageKey];

  if (!inside) {
    return "";
  }

  return '<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
         inside + "</svg>";
}


// Anong menu ang gagamitin base sa role.
function getMenu(role) {
  if (role == "Admin") {
    return adminMenu;
  }
  if (role == "Barber") {
    return barberMenu;
  }
  return customerMenu;
}


// Listahan ng mga page na pwedeng buksan ng role na ito.
// Ito ang pumipigil sa customer na buksan ang admin page
// kahit i-type pa niya sa URL.
function getAllowedPages(role) {
  var menu = getMenu(role);
  var allowed = [];

  for (var i = 0; i < menu.length; i++) {
    if (!menu[i].divider) {
      allowed.push(menu[i].key);
    }
  }

  return allowed;
}


// ------------------------------------------------------------
//  MGA HELPER NA GINAGAMIT NG LAHAT NG PAGE
// ------------------------------------------------------------

// Pinapalitan ang laman ng gitnang bahagi ng dashboard.
function setContent(html) {
  contentEl.innerHTML = html;
}


// Nagbubukas ng maliit na kahon sa gitna ng screen.
function showModal(html) {
  modalCardEl.innerHTML = html;
  modalEl.classList.remove("hidden");
}


function closeModal() {
  modalEl.classList.add("hidden");
  modalCardEl.innerHTML = "";
}


// Maliit na mensahe sa ibaba ng screen. Kapalit ito ng alert box
// kasi mas maganda tingnan at kusang nawawala.
function toast(message, type) {
  // Alisin muna ang luma para hindi magpatong-patong.
  var old = document.querySelectorAll(".toast");
  for (var i = 0; i < old.length; i++) {
    old[i].remove();
  }

  var box = document.createElement("div");
  box.className = "toast";
  if (type) {
    box.className = "toast " + type;
  }
  box.textContent = message;

  document.body.appendChild(box);

  // Mawawala pagkatapos ng mga 3 segundo.
  setTimeout(function () {
    box.remove();
  }, 3200);
}


// Kapag may error na hindi ko inaasahan.
function handleError(error) {
  console.log(error);

  var message = "Something went wrong.";
  if (error && error.message) {
    message = error.message;
  }

  toast(message, "bad");
}


// ------------------------------------------------------------
//  ANG MENU SA TABLET AT PHONE
//  Sa maliit na screen, nakatago ang sidebar at lumalabas lang
//  kapag pinindot ang ☰ button sa header.
// ------------------------------------------------------------

var sidebarEl = document.getElementById("sidebar");
var sidebarBackdropEl = document.getElementById("sidebarBackdrop");
var menuToggleEl = document.getElementById("menuToggle");


function openSideMenu() {
  sidebarEl.classList.add("open");
  sidebarBackdropEl.classList.add("open");
  document.body.classList.add("menu-open");
  menuToggleEl.setAttribute("aria-expanded", "true");
}


function closeSideMenu() {
  sidebarEl.classList.remove("open");
  sidebarBackdropEl.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuToggleEl.setAttribute("aria-expanded", "false");
}


// Pumunta sa ibang page. Ginagamit ko ang hash (#) sa URL para
// gumana pa rin ang back button ng browser.
function goToPage(pageName) {
  if (window.location.hash == "#" + pageName) {
    // Kapareho lang ng bukas ngayon, kaya i-refresh na lang.
    showPage(pageName);
  } else {
    window.location.hash = pageName;
  }
}


// I-load ulit ang kasalukuyang page. Tinatawag ito pagkatapos
// magdagdag o magbura ng data.
function refreshPage() {
  showPage(currentPage);
}


// ------------------------------------------------------------
//  ANG PAGPILI NG PAGE
// ------------------------------------------------------------

// Nilalagyan ng pamagat ang itaas ng page.
function setPageHeading(title, subtitle) {
  pageTitleEl.textContent = title;
  breadcrumbEl.textContent = title;

  if (subtitle) {
    pageSubtitleEl.textContent = subtitle;
    pageSubtitleEl.classList.remove("hidden");
  } else {
    pageSubtitleEl.textContent = "";
    pageSubtitleEl.classList.add("hidden");
  }
}


// Ito ang pinakaimportanteng function dito. Tinitingnan niya
// kung anong page ang hinihingi, tapos tinatawag ang tamang
// function galing sa customer.js, barber.js, o admin.js.
function showPage(pageName) {
  var allowed = getAllowedPages(session.role);

  // Kapag hindi pwede sa role niya, sa unang page na lang siya dadalhin.
  if (allowed.indexOf(pageName) == -1) {
    pageName = allowed[0];
  }

  currentPage = pageName;

  // Kulayan ang pinindot na menu button.
  var buttons = sideNavEl.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute("data-page") == pageName) {
      buttons[i].classList.add("active");
    } else {
      buttons[i].classList.remove("active");
    }
  }

  setContent('<p class="muted">Loading...</p>');

  var job = null;

  // ----- mga page ng CUSTOMER -----
  if (pageName == "services") {
    setPageHeading("Services", "The services and prices offered by the shop.");
    job = showServicesPage();

  } else if (pageName == "book") {
    setPageHeading("Book Appointment", "Choose a service, barber, date, and time.");
    job = showBookPage();

  } else if (pageName == "my-appointments") {
    setPageHeading("My Appointments", "Your bookings and the feedback you have given.");
    job = showMyAppointmentsPage();

  } else if (pageName == "promos") {
    setPageHeading("Promos", "Promo codes you can use when booking.");
    job = showPromosPage();

  // ----- mga page ng BARBER -----
  } else if (pageName == "barber-overview") {
    setPageHeading("Overview", "A summary of your appointments and rating.");
    job = showBarberOverviewPage();

  } else if (pageName == "barber-appointments") {
    setPageHeading("My Appointments", "The customers booked with you.");
    job = showBarberAppointmentsPage();

  } else if (pageName == "barber-schedule") {
    setPageHeading("My Schedule", "Mark the days when you cannot take customers.");
    job = showBarberSchedulePage();

  // ----- mga page ng ADMIN -----
  } else if (pageName == "admin-appointments") {
    setPageHeading("Appointments", "Every booking in the shop.");
    job = showAdminAppointmentsPage();

  } else if (pageName == "admin-services") {
    setPageHeading("Services", "Add, edit, or remove the services you offer.");
    job = showAdminServicesPage();

  } else if (pageName == "admin-barbers") {
    setPageHeading("Barbers", "Your barbers, their status, and their login accounts.");
    job = showAdminBarbersPage();

  } else if (pageName == "admin-customers") {
    setPageHeading("Customers", "All accounts in the system.");
    job = showAdminCustomersPage();

  } else if (pageName == "admin-promos") {
    setPageHeading("Promos", "Create promo codes that customers can use when booking.");
    job = showAdminPromosPage();

  } else if (pageName == "admin-analytics") {
    setPageHeading("Analytics", "Daily revenue and appointments.");
    job = showAdminAnalyticsPage();

  } else if (pageName == "admin-forecast") {
    setPageHeading("Sales Forecast", "Predicted sales using linear regression on past data.");
    job = showAdminForecastPage();

  } else if (pageName == "admin-customer-forecast") {
    setPageHeading("Customer Forecast", "How many customers to expect next month, based on past visits.");
    job = showAdminCustomerForecastPage();

  } else if (pageName == "admin-performance") {
    setPageHeading("Barber Performance", "Star ratings and appointment counts for every barber.");
    job = showAdminPerformancePage();

  } else if (pageName == "admin-settings") {
    setPageHeading("Shop Settings", "Shop name and booking hours.");
    job = showAdminSettingsPage();

  // ----- page na pareho sa lahat -----
  } else if (pageName == "account") {
    setPageHeading("Account Settings", "Update your details and change your password.");
    job = showAccountPage();

  } else {
    setContent('<div class="empty">Page not found.</div>');
    return;
  }

  // Kapag may nasirang tawag sa server, ipapakita ang dahilan
  // sa halip na blangkong page.
  if (job && job.catch) {
    job.catch(function (error) {
      console.log(error);

      var message = "This page could not be loaded.";
      if (error && error.message) {
        message = error.message;
      }

      setContent('<div class="notice bad">' + escapeHtml(message) + "</div>");
    });
  }
}


// Gumagawa ng mga button sa gilid.
function buildMenu(role) {
  var menu = getMenu(role);
  sideNavEl.innerHTML = "";

  for (var i = 0; i < menu.length; i++) {
    var item = menu[i];

    if (item.divider) {
      var line = document.createElement("div");
      line.className = "divider";
      sideNavEl.appendChild(line);
      continue;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-page", item.key);
    button.innerHTML = iconFor(item.key) + "<span>" + escapeHtml(item.label) + "</span>";

    // Kailangan ng ganitong paraan para tama ang page na
    // maaalala ng bawat button.
    button.onclick = (function (pageName) {
      return function () {
        closeSideMenu();
        goToPage(pageName);
      };
    })(item.key);

    sideNavEl.appendChild(button);
  }
}


// Anong page ang nakasulat sa URL? Kapag wala, unang page na lang.
function getPageFromUrl() {
  var name = window.location.hash.replace("#", "");

  if (name == "") {
    return getAllowedPages(session.role)[0];
  }

  return name;
}


// ------------------------------------------------------------
//  SIMULA NG DASHBOARD
// ------------------------------------------------------------

async function startDashboard() {
  // Kapag walang naka-login, dadalhin siya sa login page.
  session = await requireSession();
  if (!session) {
    return;
  }

  shopSettings = await loadShopName();

  // Ilagay ang pangalan at role sa itaas.
  var name = session.fullName;
  if (!name) {
    name = session.username;
  }
  document.getElementById("userBadge").textContent = name;

  var roleLabel = session.role;
  if (roleLabel == "User") {
    roleLabel = "Customer";
  }
  document.getElementById("roleBadge").textContent = roleLabel;

  document.getElementById("logoutBtn").onclick = logout;

  // Isara ang modal kapag pinindot ang labas nito o ang Esc key.
  modalEl.addEventListener("click", function (event) {
    if (event.target == modalEl) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key == "Escape") {
      closeModal();
      closeSideMenu();
    }
  });

  menuToggleEl.onclick = function () {
    if (sidebarEl.classList.contains("open")) {
      closeSideMenu();
    } else {
      openSideMenu();
    }
  };
  sidebarBackdropEl.onclick = closeSideMenu;

  buildMenu(session.role);

  // Kapag pinindot ang back button, magbabago ang hash sa URL.
  window.addEventListener("hashchange", function () {
    showPage(getPageFromUrl());
  });

  showPage(getPageFromUrl());
}


startDashboard();
