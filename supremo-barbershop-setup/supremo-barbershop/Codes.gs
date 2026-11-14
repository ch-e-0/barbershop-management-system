/****************************
 * Supremo Barbershop System
 * Google Apps Script (Server-side)
 * Connects to Google Sheets
 ****************************/

// ====== CONFIGURATION ======
const SPREADSHEET_NAME = 'Supremo Barbershop DB';
const USERS_SHEET = 'Users';
const SERVICES_SHEET = 'Services';
const APPOINTMENTS_SHEET = 'Appointments';
const BARBERS_SHEET = 'Barbers';
const SPREADSHEET_ID = ''; 

// ====== GET ACTIVE SHEET ======
function getSheet(name) {
  // prefer openById when SPREADSHEET_ID provided (safer for web apps)
  const ss = (typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID)
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('getSheet -> using spreadsheet id=%s name=%s', ss ? ss.getId() : 'null', name);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

// ====== WEB APP ENTRY ======
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Supremo Barbershop')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ====== HELPER: GET ALL ROWS ======
function getData(name) {
  const sh = getSheet(name);
  const data = sh.getDataRange().getValues();
  return data;
}

// ====== USERS ======

function getAllUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users'); 
  const data = sheet.getDataRange().getValues();

  const headers = data.shift();
  const users = data.map(row => ({
    fullName: row[0],
    username: row[1],
    phoneNumber: row[6],
    role: row[3] || 'User'
  }));

  return users;
}

function registerUser(user) {
  const sheet = getSheet(USERS_SHEET);
  const data = sheet.getDataRange().getValues();
  let headers = data[0] || [];
  const usernameIndex = headers.indexOf('Username');

  // Add required columns if missing
  const requiredColumns = {
    'Security Question': '',
    'Security Answer': '',
    'Phone Number': ''
  };

  let columnsAdded = false;
  Object.keys(requiredColumns).forEach(column => {
    if (headers.indexOf(column) === -1) {
      headers.push(column);
      columnsAdded = true;
    }
  });

  if (columnsAdded) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  if (data.find((r, i) => i > 0 && r[usernameIndex] === user.username)) {
    return { success: false, message: 'Username already exists' };
  }

  // Fill row with blanks for missing columns
  let row = [
    user.fullName,
    user.username,
    user.password,
    user.role || 'User',
    user.securityQuestion || '',
    user.securityAnswer || '',
    user.phoneNumber || ''
  ];
  // If columns are reordered, pad row
  while (row.length < headers.length) row.push('');
  sheet.appendRow(row);

  return { success: true, message: 'Registered successfully' };
}

// Password reset function
function resetPassword(username, fullName, newPassword, securityQuestion, securityAnswer) {
  Logger.log('Reset password attempt for: %s, %s', username, fullName);
  
  const sheet = getSheet(USERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Get all column indexes
  const usernameIndex = headers.indexOf('Username');
  const fullNameIndex = headers.indexOf('Full Name');
  const passwordIndex = headers.indexOf('Password');
  const questionIndex = headers.indexOf('Security Question');
  const answerIndex = headers.indexOf('Security Answer');

  // Validate column indexes
  if (usernameIndex === -1 || fullNameIndex === -1 || passwordIndex === -1 || 
      questionIndex === -1 || answerIndex === -1) {
    Logger.log('Missing columns. Found indexes: %s', JSON.stringify({
      username: usernameIndex,
      fullName: fullNameIndex,
      password: passwordIndex,
      question: questionIndex,
      answer: answerIndex
    }));
    return {
      success: false,
      message: 'System configuration error - please contact admin'
    };
  }

  // Look for matching user
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowUsername = String(row[usernameIndex] || '').trim();
    const rowFullName = String(row[fullNameIndex] || '').trim();
    const rowQuestion = String(row[questionIndex] || '').trim();
    const rowAnswer = String(row[answerIndex] || '').trim();

    Logger.log('Checking row %s: %s == %s && %s == %s && %s == %s && %s == %s',
      i,
      rowUsername, username,
      rowFullName, fullName,
      rowQuestion, securityQuestion,
      rowAnswer, securityAnswer
    );

    if (
      rowUsername === username &&
      rowFullName === fullName &&
      rowQuestion === securityQuestion &&
      rowAnswer === securityAnswer
    ) {
      // Found matching user, update password
      const range = sheet.getRange(i + 1, passwordIndex + 1);
      range.setValue(newPassword);
      
      Logger.log('Password updated for user: %s', username);
      return { 
        success: true, 
        message: 'Password has been reset successfully'
      };
    }
  }

  Logger.log('No matching user found for reset attempt');
  return {
    success: false,
    message: 'User not found or security information incorrect'
  };
}

function loginUser(creds) {
  const data = getData(USERS_SHEET);
  const headers = data[0];
  const idxUsername = headers.indexOf('Username');
  const idxPassword = headers.indexOf('Password');
  const idxFullName = headers.indexOf('Full Name');
  const idxRole = headers.indexOf('Role');

  // Log attempt
  Logger.log('Login attempt for username: %s', creds.username);

  for (let i = 1; i < data.length; i++) {
    const rowUsername = String(data[i][idxUsername] || '').trim();
    const rowPassword = String(data[i][idxPassword] || '').trim();
    
    // Debug log (remove sensitive info in production)
    Logger.log('Checking row %s: %s == %s', i, rowUsername, creds.username);
    
    if (
      rowUsername === creds.username &&
      rowPassword === creds.password
    ) {
      const user = {
        username: rowUsername,
        fullName: data[i][idxFullName],
        role: data[i][idxRole] || 'User'
      };
      PropertiesService.getUserProperties().setProperty('CURRENT_USER', user.username);
      Logger.log('Login successful for: %s', user.username);
      return { success: true, ...user };
    }
  }
  return { success: false, message: 'Invalid credentials' };
}

function loginAdmin(creds) {
  const data = getData(USERS_SHEET);
  const headers = data[0];
  const idxUsername = headers.indexOf('Username');
  const idxPassword = headers.indexOf('Password');
  const idxFullName = headers.indexOf('Full Name');
  const idxRole = headers.indexOf('Role');

  // Log attempt
  Logger.log('Admin login attempt for username: %s', creds.username);

  for (let i = 1; i < data.length; i++) {
    const rowUsername = String(data[i][idxUsername] || '').trim();
    const rowPassword = String(data[i][idxPassword] || '').trim();
    const rowRole = String(data[i][idxRole] || '').trim();

    // Debug log
    Logger.log('Checking admin row %s: %s == %s && role: %s', i, rowUsername, creds.username, rowRole);
    
    if (
      rowUsername === creds.username &&
      rowPassword === creds.password &&
      (rowRole === 'Admin' || rowUsername === 'admin')
    ) {
      const user = {
        username: rowUsername,
        fullName: data[i][idxFullName],
        role: 'Admin'
      };
      PropertiesService.getUserProperties().setProperty('CURRENT_USER', user.username);
      Logger.log('Admin login successful for: %s', user.username);
      return { success: true, ...user };
    }
  }
  return { success: false, message: 'Invalid admin credentials' };
}

function getCurrentUser() {
  return PropertiesService.getUserProperties().getProperty('CURRENT_USER');
}

function clearCurrentUser() {
  PropertiesService.getUserProperties().deleteProperty('CURRENT_USER');
}

// ====== SERVICES ======
function getServices() {
  const data = getData(SERVICES_SHEET);
  return data.slice(1);
}

function getServicesWithIndex() {
  const data = getData(SERVICES_SHEET);
  return data.slice(1).map((r, i) => ({
    index: i,
    service: r[0],
    price: r[1]
  }));
}

function addService(obj) {
  const sheet = getSheet(SERVICES_SHEET);
  sheet.appendRow([obj.service, obj.price]);
  return { success: true };
}

function updateService(obj) {
  const sheet = getSheet(SERVICES_SHEET);
  const row = obj.index + 2;
  sheet.getRange(row, 1, 1, 2).setValues([[obj.service, obj.price]]);
  return { success: true };
}

function deleteService(index) {
  const sheet = getSheet(SERVICES_SHEET);
  sheet.deleteRow(index + 2);
  return { success: true };
}

// ====== BARBERS MANAGEMENT ======
function getBarbers() {
  const sheet = getSheet(BARBERS_SHEET);

  // Ensure header exists; 
  const lastRow = sheet.getLastRow();
  const headers = ['Name', 'Status', 'Phone'];
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  // Return all barbers (admin UI needs to see inactive ones as well)
  return data.slice(1).map(row => ({
    name: (row[0] || '').toString(),
    status: (row[1] || 'Active').toString(),
    phone: (row[2] || '').toString()
  })).filter(b => b.name && b.name.trim());
}

function addBarber(barber) {
  const sheet = getSheet(BARBERS_SHEET);
  sheet.appendRow([
    barber.name,
    barber.status || 'Active',
    barber.phone || ''
  ]);
  return { success: true };
}

function updateBarber(param, maybeBarber) {
  const sheet = getSheet(BARBERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);

  // Support old signature: updateBarber(index, barber)
  if (typeof param === 'number') {
    const index = param;
    const barber = maybeBarber || {};
    const row = index + 2;
    sheet.getRange(row, 1, 1, 3).setValues([[
      barber.name || '',
      barber.status || 'Active',
      barber.phone || ''
    ]]);
    return { success: true };
  }

  // New signature: updateBarber({ name, status, phone }) -> find by name (case-insensitive)
  if (param && param.name) {
    const target = param.name.toString().trim().toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const rowName = (rows[i][0] || '').toString().trim().toLowerCase();
      if (rowName === target) {
        const rowIndex = i + 2;
        const newName = param.name || rows[i][0] || '';
        const newStatus = param.status || rows[i][1] || 'Active';
        const newPhone = (param.phone !== undefined) ? param.phone : rows[i][2] || '';
        sheet.getRange(rowIndex, 1, 1, 3).setValues([[newName, newStatus, newPhone]]);
        return { success: true };
      }
    }
    return { success: false, message: 'Barber not found' };
  }

  return { success: false, message: 'Invalid parameters' };
}

function deleteBarber(param) {
  const sheet = getSheet(BARBERS_SHEET);
  const data = sheet.getDataRange().getValues() || [];
  const rows = data.slice(1) || [];

  
  if (typeof param === 'number') {
    const row = param + 2;
    sheet.deleteRow(row);
    return { success: true };
  }


  if (param && param.name) {
    const target = param.name.toString().trim().toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const rowName = (rows[i][0] || '').toString().trim().toLowerCase();
      if (rowName === target) {
        sheet.deleteRow(i + 2);
        return { success: true };
      }
    }
    return { success: false, message: 'Barber not found' };
  }

  return { success: false, message: 'Invalid parameters' };
}

// ====== APPOINTMENTS ======
function getAppointments() {
  const data = getData(APPOINTMENTS_SHEET) || [];
  Logger.log('DEBUG getAppointments — raw data length: %s', data.length);

  if (!data || data.length === 0) {
    Logger.log('No data found in sheet.');
    return [];
  }

  // detect header row (tolerant)
  const headerCandidates = ['full name','full','service','barber','date','time','status','username'];
  const firstRow = (data[0] || []).map(c => String(c || '').toLowerCase());
  const looksLikeHeader = firstRow.some(cell => headerCandidates.some(h => cell.includes(h)));

  const rows = looksLikeHeader ? data.slice(1) : data;

  const result = rows.map((r, i) => {
    // normalize date/time values (Dates in Sheets become Date objects)
    const dateVal = r[3];
    const timeVal = r[4];
    const tz = Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'GMT';
    const dateStr = dateVal instanceof Date ? Utilities.formatDate(dateVal, tz, 'yyyy-MM-dd') : (dateVal || '');
    let timeStr = '';
    if (timeVal instanceof Date) {
      timeStr = Utilities.formatDate(timeVal, tz, 'HH:mm');
    } else if (typeof timeVal === 'number') {
      // if a time serial number got written, convert to time string
      timeStr = Utilities.formatDate(new Date((timeVal - 25569) * 86400000), tz, 'HH:mm');
    } else {
      timeStr = timeVal || '';
    }

    return {
      id: i + 1,
      fullName: r[0] || '',
      service: r[1] || '',
      barber: r[2] || '',
      date: dateStr,
      time: timeStr,
      status: r[5] || '',
      username: (r[6] || '').toString().trim()
    };
  });

  Logger.log('DEBUG getAppointments — mapped count: %s', result.length);
  return result;
}

function getAppointmentsRaw() {
  // helper for debugging: returns raw sheet arrays
  return getData(APPOINTMENTS_SHEET) || [];
}

function bookAppointment(obj) {
  const appts = getAppointments() || [];
  const targetDate = (obj.date || '').toString();
  const targetTime = (obj.time || '').toString();
  const targetHour = targetTime.split(':')[0];

  // 🚫 Prevent booking in the past
  const now = new Date();
  const selectedDateTime = new Date(targetDate + 'T' + targetTime + ':00'); // Combine date+time

  if (selectedDateTime < now) {
    return { success: false, message: 'That time slot has already passed. Please select a future date and time for your appointment.' };
  }

  // ✅ Prevent double-booking: same barber + same hour
  for (let i = 0; i < appts.length; i++) {
    const a = appts[i];
    if (!a || a.status === 'Declined') continue;
    const aBarber = (a.barber || '').toString().trim();
    const aDate = (a.date || '').toString();
    const aTime = (a.time || '').toString();
    const aHour = (aTime.split(':')[0] || '').toString();
    if (aBarber === obj.barber && aDate === targetDate && aHour === targetHour) {
      return { success: false, message: 'Selected barber is already booked for that hour. Please choose another time or barber.' };
    }
  }

  // ✅ Auto-approve new appointment
  const sheet = getSheet(APPOINTMENTS_SHEET);
  sheet.appendRow([
    obj.fullName,
    obj.service,
    obj.barber,
    obj.date,
    obj.time,
    'Approved',
    obj.username
  ]);

  return { success: true, message: 'Appointment booked and auto-approved.' };
}

/*******************************************************
 * 📊 ADVANCED ANALYTICS BACKEND
 * Includes: Daily stats + revenue + barber + service performance
 *******************************************************/
function getDailyAnalyticsByMonth(year, month) {
  const appointments = getData(APPOINTMENTS_SHEET).slice(1);
  const services = getData(SERVICES_SHEET).slice(1);
  const tz = Session.getScriptTimeZone();

  year = Number(year);
  month = Number(month);

  // Create service-price map
  const servicePriceMap = {};
  services.forEach(row => {
    const name = row[0];
    const price = parseFloat(row[1]) || 0;
    servicePriceMap[name] = price;
  });

  const stats = {};
  const barberStats = {};
  const serviceStats = {};
  let monthlyRevenue = 0;

  appointments.forEach(row => {
    const dateVal = row[3];
    if (!(dateVal instanceof Date)) return;

    const dateYear = dateVal.getFullYear();
    const dateMonth = dateVal.getMonth() + 1;
    if (dateYear !== year || dateMonth !== month) return;

    const dateStr = Utilities.formatDate(dateVal, tz, 'yyyy-MM-dd');
    const status = (row[5] || '').toLowerCase();
    const serviceName = row[1];
    const barberName = row[2];
    const servicePrice = servicePriceMap[serviceName] || 0;

    // --- Daily stats ---
    if (!stats[dateStr]) {
      stats[dateStr] = { total: 0, approved: 0, pending: 0, declined: 0, revenue: 0 };
    }

    stats[dateStr].total++;
    if (status === 'approved') {
      stats[dateStr].approved++;
      stats[dateStr].revenue += servicePrice;
      monthlyRevenue += servicePrice;
    } else if (status === 'pending') {
      stats[dateStr].pending++;
    } else if (status === 'declined') {
      stats[dateStr].declined++;
    }

    // --- Barber stats ---
    if (!barberStats[barberName]) {
      barberStats[barberName] = {
        approved: 0,
        revenue: 0,
        serviceCounts: {}
      };
    }
    if (status === 'approved') {
      barberStats[barberName].approved++;
      barberStats[barberName].revenue += servicePrice;
      barberStats[barberName].serviceCounts[serviceName] =
        (barberStats[barberName].serviceCounts[serviceName] || 0) + 1;
    }

    // --- Service stats ---
    if (!serviceStats[serviceName]) {
      serviceStats[serviceName] = { total: 0, barberCounts: {} };
    }
    if (status === 'approved') {
      serviceStats[serviceName].total++;
      serviceStats[serviceName].barberCounts[barberName] =
        (serviceStats[serviceName].barberCounts[barberName] || 0) + 1;
    }
  });

  // Determine most common service per barber
  for (const barber in barberStats) {
    const sCounts = barberStats[barber].serviceCounts;
    let topService = '-';
    let topCount = 0;
    for (const [service, count] of Object.entries(sCounts)) {
      if (count > topCount) {
        topCount = count;
        topService = service;
      }
    }
    barberStats[barber].topService = topService;
    delete barberStats[barber].serviceCounts;
  }

  // Determine top barber per service
  for (const service in serviceStats) {
    const bCounts = serviceStats[service].barberCounts;
    let topBarber = '-';
    let topCount = 0;
    for (const [barber, count] of Object.entries(bCounts)) {
      if (count > topCount) {
        topCount = count;
        topBarber = barber;
      }
    }
    serviceStats[service].topBarber = topBarber;
    serviceStats[service].topCount = topCount;
  }

  // Identify least and most performed services
  let mostService = '-', leastService = '-';
  let maxCount = 0, minCount = Infinity;
  for (const [service, data] of Object.entries(serviceStats)) {
    if (data.total > maxCount) {
      maxCount = data.total;
      mostService = service;
    }
    if (data.total < minCount) {
      minCount = data.total;
      leastService = service;
    }
  }

  stats['_monthlyRevenue'] = monthlyRevenue;
  stats['_barberStats'] = barberStats;
  stats['_serviceStats'] = serviceStats;
  stats['_mostService'] = { name: mostService, count: maxCount };
  stats['_leastService'] = { name: leastService, count: minCount };

  return stats;
}
function getBarbersInfo() {
  const data = getData('Barbers').slice(1); // skip header
  const result = {};
  data.forEach(r => {
    const name = r[0];
    result[name] = {
      contact: r[1] || '',
      specialty: r[2] || '',
      notes: r[3] || ''
    };
  });
  return result;
}

function updateBarberInfo(name, info) {
  const sheet = getSheet('Barbers');
  const data = getData('Barbers');
  const header = data[0];
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    // add new barber
    sheet.appendRow([name, info.contact || '', info.specialty || '', info.notes || '']);
  } else {
    // update existing
    sheet.getRange(rowIndex, 2).setValue(info.contact || '');
    sheet.getRange(rowIndex, 3).setValue(info.specialty || '');
    sheet.getRange(rowIndex, 4).setValue(info.notes || '');
  }

  return { success: true };
}
