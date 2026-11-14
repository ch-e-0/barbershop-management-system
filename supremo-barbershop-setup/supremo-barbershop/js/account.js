// ============================================================
//  account.js
//  Ang Account Settings page. Iisa lang ito para sa customer,
//  barbero, at admin - pareho lang naman ang kailangan nilang
//  baguhin (pangalan, number, password).
// ============================================================


// Mga tanong na pwedeng piliin kapag nakalimutan ang password.
var securityQuestions = [
  "What is your mother's maiden name?",
  "What was your first pet's name?",
  "In what city were you born?",
  "What is your favorite movie?",
  "What was your high school name?"
];


// Gumagawa ng mga <option> para sa dropdown ng security question.
// Ang naunang pinili ng user ang nakaselect.
function buildSecurityOptions(selected) {
  var html = '<option value="">-- Choose a security question --</option>';

  for (var i = 0; i < securityQuestions.length; i++) {
    var question = securityQuestions[i];
    var isSelected = "";

    if (question == selected) {
      isSelected = " selected";
    }

    html += '<option value="' + escapeHtml(question) + '"' + isSelected + ">"
          + escapeHtml(question) + "</option>";
  }

  return html;
}


async function showAccountPage() {
  var profile = await runServer("getProfile");

  // Sa loob ng system, "User" ang tawag sa customer, pero mas
  // maganda sa mata ang "Customer".
  var roleLabel = profile.role;
  if (roleLabel == "User") {
    roleLabel = "Customer";
  }

  setContent(
    '<div class="card">' +
      "<h3>Account information</h3>" +
      '<p class="muted small" style="margin-top:4px;">' +
        "Username: <strong>" + escapeHtml(profile.username) + "</strong> &nbsp;·&nbsp; " +
        "Role: <strong>" + escapeHtml(roleLabel) + "</strong>" +
      "</p>" +

      '<div class="field-row">' +
        "<div>" +
          '<label for="acctFullName">Full name</label>' +
          '<input id="acctFullName" type="text" value="' + escapeHtml(profile.fullName) + '">' +
        "</div>" +
        "<div>" +
          '<label for="acctPhone">Mobile number</label>' +
          '<input id="acctPhone" type="tel" data-phone maxlength="13" value="' + escapeHtml(profile.phoneNumber) + '">' +
          '<div class="phone-hint">Format: 09XX-XXX-XXXX</div>' +
        "</div>" +
      "</div>" +

      '<label for="acctSecQ">Security question</label>' +
      '<select id="acctSecQ">' + buildSecurityOptions(profile.securityQuestion) + "</select>" +

      '<label for="acctSecA">New answer</label>' +
      '<input id="acctSecA" type="text" placeholder="Leave blank to keep your current answer">' +
      '<div class="field-hint">Your old answer is never shown. Fill this in only if you want to change it.</div>' +

      '<div class="btn-row form-actions">' +
        '<button class="btn" id="saveProfileBtn" type="button">Save changes</button>' +
      "</div>" +
      '<div id="profileMsg" class="msg"></div>' +
    "</div>" +

    '<div class="card">' +
      "<h3>Change password</h3>" +
      '<p class="muted small" style="margin-top:4px;">You need your current password before you can change it.</p>' +

      '<label for="curPass">Current password</label>' +
      '<input id="curPass" type="password" autocomplete="current-password">' +

      '<div class="field-row">' +
        "<div>" +
          '<label for="newPass">New password</label>' +
          '<input id="newPass" type="password" autocomplete="new-password">' +
          '<div class="field-hint">At least 8 characters, with a letter and a number.</div>' +
        "</div>" +
        "<div>" +
          '<label for="newPass2">Repeat new password</label>' +
          '<input id="newPass2" type="password" autocomplete="new-password">' +
        "</div>" +
      "</div>" +

      '<div class="btn-row form-actions">' +
        '<button class="btn" id="changePassBtn" type="button">Change password</button>' +
      "</div>" +
      '<div id="passMsg" class="msg"></div>' +
    "</div>"
  );

  initPhoneInputs(contentEl);

  document.getElementById("saveProfileBtn").onclick = saveProfile;
  document.getElementById("changePassBtn").onclick = changeMyPassword;
}


// I-save ang pangalan, number, at security question.
async function saveProfile() {
  var msg = document.getElementById("profileMsg");

  var fullName = document.getElementById("acctFullName").value.trim();
  var phone = document.getElementById("acctPhone").value.trim();
  var question = document.getElementById("acctSecQ").value;
  var answer = document.getElementById("acctSecA").value.trim();

  if (fullName == "" || phone == "") {
    setMsg(msg, "Full name and mobile number are required.", "error");
    return;
  }

  if (!isValidPhone(phone)) {
    setMsg(msg, "Invalid number format. Please use 09XX-XXX-XXXX.", "error");
    return;
  }

  // Kapag pumili siya ng bagong tanong, dapat may sagot din.
  if (question != "" && answer == "") {
    setMsg(msg, "Enter an answer if you are changing the security question.", "error");
    return;
  }

  try {
    var result = await runServer("updateProfile", {
      fullName: fullName,
      phoneNumber: phone,
      securityQuestion: question,
      securityAnswer: answer
    });

    if (result.success) {
      // Palitan din ang pangalan sa itaas ng page.
      document.getElementById("userBadge").textContent = result.fullName;
      document.getElementById("acctSecA").value = "";

      setMsg(msg, "Your details have been saved.", "ok");
      toast("Account updated.");
    } else {
      setMsg(msg, result.message || "Could not save your changes.", "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}


// Palitan ang password.
async function changeMyPassword() {
  var msg = document.getElementById("passMsg");

  var currentPassword = document.getElementById("curPass").value;
  var newPassword = document.getElementById("newPass").value;
  var repeatPassword = document.getElementById("newPass2").value;

  if (currentPassword == "" || newPassword == "") {
    setMsg(msg, "Please fill in all password fields.", "error");
    return;
  }

  if (newPassword != repeatPassword) {
    setMsg(msg, "The new passwords do not match.", "error");
    return;
  }

  var problem = passwordProblem(newPassword);
  if (problem != "") {
    setMsg(msg, problem, "error");
    return;
  }

  try {
    var result = await runServer("changePassword", {
      currentPassword: currentPassword,
      newPassword: newPassword
    });

    if (result.success) {
      // Linisin ang mga field para hindi maiwan ang password sa screen.
      document.getElementById("curPass").value = "";
      document.getElementById("newPass").value = "";
      document.getElementById("newPass2").value = "";

      setMsg(msg, "Your password has been changed.", "ok");
      toast("Password changed.");
    } else {
      setMsg(msg, result.message || "Could not change your password.", "error");
    }
  } catch (error) {
    showError(msg, error);
  }
}
