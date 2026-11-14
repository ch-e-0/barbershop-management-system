<?php
// ============================================================
//  index.php  -  ito ang API ng buong website
//
//  Lahat ng tawag galing sa JavaScript ay dumadaan dito.
//  Ganito ang hitsura ng ipinapadala:
//
//      { "action": "getServices", "args": [] }
//
//  Tapos hinahanap ng malaking switch sa ibaba kung anong
//  action ang tinatawag, at doon ko ginagawa ang trabaho.
// ============================================================

require_once "config.php";


// ------------------------------------------------------------
//  MGA HELPER FUNCTION
// ------------------------------------------------------------

// Isang panuntunan lang sa password para pare-pareho sa buong site.
function checkPassword($password) {
    if (strlen($password) < 8) {
        fail("Password must be at least 8 characters.");
    }
    // Kailangan may letra at may numero.
    if (!preg_match("/[A-Za-z]/", $password) || !preg_match("/[0-9]/", $password)) {
        fail("Password must contain at least one letter and one number.");
    }
}


// Kinakalkula kung magkano ang mababawas sa presyo.
// Hindi dapat mas malaki sa presyo mismo, at hindi negatibo.
function applyDiscount($price, $type, $value) {
    if ($type == "Percent") {
        $discount = $price * ($value / 100);
    } else {
        $discount = $value;
    }

    if ($discount > $price) {
        $discount = $price;
    }
    if ($discount < 0) {
        $discount = 0;
    }

    return round($discount, 2);
}


// Hinahanap ang promo code at tinitingnan kung pwede pa itong gamitin.
// Nagbabalik ng array: ok = true/false, at message kapag hindi pwede.
function findUsablePromo($pdo, $code, $serviceId, $date) {
    $stmt = $pdo->prepare("SELECT * FROM promos WHERE code = ?");
    $stmt->execute(array(strtoupper($code)));
    $promo = $stmt->fetch();

    if (!$promo) {
        return array("ok" => false, "message" => "Promo code not found.");
    }

    if ($promo["status"] != "Active") {
        return array("ok" => false, "message" => "This promo is no longer active.");
    }

    // Nasa loob ba ng petsa ng bisa?
    if ($date < $promo["valid_from"] || $date > $promo["valid_to"]) {
        return array(
            "ok" => false,
            "message" => "This promo is only valid from " . $promo["valid_from"] . " to " . $promo["valid_to"] . "."
        );
    }

    // Naabot na ba ang limitasyon? (0 = walang limit)
    if ($promo["usage_limit"] > 0 && $promo["used_count"] >= $promo["usage_limit"]) {
        return array("ok" => false, "message" => "This promo has reached its usage limit.");
    }

    // May promo na para lang sa isang serbisyo.
    if ($promo["service_id"] != null && $promo["service_id"] != $serviceId) {
        return array("ok" => false, "message" => "This promo does not apply to the selected service.");
    }

    return array("ok" => true, "promo" => $promo);
}


// Ilang buwan ang layo ng dalawang buwan? Ginagamit ko ito sa forecast
// para tama ang bilang kahit may buwan na walang benta.
// Halimbawa: monthGap("2026-01", "2026-04") = 3
function monthGap($fromMonth, $toMonth) {
    $from = explode("-", $fromMonth);
    $to = explode("-", $toMonth);

    $years = (int)$to[0] - (int)$from[0];
    $months = (int)$to[1] - (int)$from[1];

    return ($years * 12) + $months;
}


// Linear regression (least squares) sa listahan ng numero kada buwan.
// Ang unang numero ay buwan 1, ang ikalawa ay buwan 2, at iba pa.
// Ibinabalik ang slope, intercept, at kung gaano ito katumpak kapag
// inihambing sa totoong numero. Ginagamit ito ng Customer Forecast.
function fitLine($values) {
    $n = count($values);
    $sumX = 0;
    $sumY = 0;
    $sumXY = 0;
    $sumXX = 0;

    for ($i = 0; $i < $n; $i++) {
        $x = $i + 1;
        $y = $values[$i];

        $sumX += $x;
        $sumY += $y;
        $sumXY += $x * $y;
        $sumXX += $x * $x;
    }

    $bottom = ($n * $sumXX) - ($sumX * $sumX);

    $slope = 0;
    if ($bottom != 0) {
        $slope = (($n * $sumXY) - ($sumX * $sumY)) / $bottom;
    }

    $intercept = ($sumY - ($slope * $sumX)) / $n;

    // Average na porsyento ng mali sa mga buwan na may laman.
    $totalError = 0;
    $counted = 0;

    for ($i = 0; $i < $n; $i++) {
        if ($values[$i] > 0) {
            $predicted = $intercept + ($slope * ($i + 1));
            $totalError += abs($values[$i] - $predicted) / $values[$i];
            $counted++;
        }
    }

    $errorRate = null;
    $accuracy = null;

    if ($counted > 0) {
        $errorRate = round(($totalError / $counted) * 100, 1);
        $accuracy = max(0, round(100 - $errorRate, 1));
    }

    return array(
        "slope"     => $slope,
        "intercept" => $intercept,
        "average"   => $sumY / $n,
        "errorRate" => $errorRate,
        "accuracy"  => $accuracy
    );
}


// Ang halaga ng linya sa buwan na $x. Hindi pwedeng negatibo.
function lineAt($line, $x) {
    return max(0, $line["intercept"] + ($line["slope"] * $x));
}


// Kinukuha ang laman ng $args kahit wala. Para hindi mag-error.
function argAt($args, $index, $default = "") {
    if (isset($args[$index])) {
        return $args[$index];
    }
    return $default;
}


// Kinukuha ang isang field sa loob ng array na ipinadala ng JavaScript.
function field($input, $key, $default = "") {
    if (is_array($input) && isset($input[$key])) {
        return $input[$key];
    }
    return $default;
}


// ------------------------------------------------------------
//  DITO NAGSISIMULA ANG PAGTANGGAP NG REQUEST
// ------------------------------------------------------------

try {

    // POST lang ang tinatanggap. Hindi pwedeng basta i-type sa browser.
    if ($_SERVER["REQUEST_METHOD"] != "POST") {
        fail("POST requests only.", 405);
    }

    // Binabasa ang JSON na ipinadala ng JavaScript.
    $raw = file_get_contents("php://input");
    $request = json_decode($raw, true);

    if (!is_array($request)) {
        fail("Invalid request data.");
    }

    $action = text(field($request, "action"));

    $args = field($request, "args", array());
    if (!is_array($args)) {
        $args = array();
    }

    $pdo = db();


    switch ($action) {


    // ============================================================
    //  LOGIN, LOGOUT, REGISTER
    // ============================================================

    // Tinatawag ng bawat page para malaman kung sino ang naka-login.
    case "session":
        $user = currentUser();
        if ($user == null) {
            respond(array("loggedIn" => false));
        }
        respond(array(
            "loggedIn" => true,
            "username" => $user["username"],
            "fullName" => $user["fullName"],
            "role"     => $user["role"]
        ));


    // Iisang login lang para sa Admin, Barber, at Customer.
    // Ang "loginUser" at "loginAdmin" ay luma pang pangalan, iniwan
    // ko lang para hindi masira ang mga lumang tawag.
    case "login":
    case "loginUser":
    case "loginAdmin":
        $input = argAt($args, 0, array());
        $username = text(field($input, "username"));
        $password = field($input, "password");

        $stmt = $pdo->prepare("SELECT id, full_name, username, password_hash, legacy_password, role
                                 FROM users WHERE username = ?");
        $stmt->execute(array($username));
        $user = $stmt->fetch();

        if (!$user) {
            respond(array("success" => false, "message" => "Invalid username or password."));
        }

        // Dalawang paraan ng pag-check ng password:
        //   1. bago - naka-hash na, gagamit ng password_verify()
        //   2. luma - galing pa sa Excel, plain text pa
        $passwordOk = false;
        $isOldPassword = false;

        if ($user["password_hash"] != "" && password_verify($password, $user["password_hash"])) {
            $passwordOk = true;
        } else if ($user["legacy_password"] != null && $user["legacy_password"] === $password) {
            $passwordOk = true;
            $isOldPassword = true;
        }

        if (!$passwordOk) {
            respond(array("success" => false, "message" => "Invalid username or password."));
        }

        // Kapag admin login page ang pinanggalingan, admin lang ang papasukin.
        if ($action == "loginAdmin" && $user["role"] != "Admin") {
            respond(array("success" => false, "message" => "Invalid admin credentials."));
        }

        // Kapag luma pa ang password, gagawin na natin itong hash ngayon
        // para secure na siya sa susunod na login.
        if ($isOldPassword) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $upgrade = $pdo->prepare("UPDATE users SET password_hash = ?, legacy_password = NULL WHERE id = ?");
            $upgrade->execute(array($newHash, $user["id"]));
        }

        // Ito ang nagsasabing naka-login na siya.
        $_SESSION["user"] = array(
            "id"       => (int)$user["id"],
            "username" => $user["username"],
            "fullName" => $user["full_name"],
            "role"     => $user["role"]
        );

        respond(array(
            "success"  => true,
            "username" => $user["username"],
            "fullName" => $user["full_name"],
            "role"     => $user["role"]
        ));


    case "logout":
    case "clearCurrentUser":
        $_SESSION = array();
        session_destroy();
        respond(array("success" => true));


    // May admin na ba? Ginagamit lang ito sa register page.
    case "hasAdmin":
        $count = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'Admin'")->fetchColumn();
        respond(array("hasAdmin" => $count > 0));


    // Registration ng CUSTOMER lamang.
    //
    // MAHALAGA: hindi na pwedeng mag-register bilang Admin dito kahit
    // baguhin pa ng user ang ipinadala ng browser. Ang tanging
    // pagkakataon ay kapag wala pang kahit isang admin sa database
    // (bagong install), para may unang makapasok sa sistema.
    case "registerUser":
        $input = argAt($args, 0, array());

        $fullName = text(field($input, "fullName"));
        $username = text(field($input, "username"));
        $password = field($input, "password");
        $question = text(field($input, "securityQuestion"));
        $answer   = text(field($input, "securityAnswer"));
        $phone    = text(field($input, "phoneNumber"));

        if ($fullName == "" || $username == "" || $password == ""
            || $question == "" || $answer == "" || $phone == "") {
            fail("Please complete all fields.");
        }

        checkPassword($password);

        $adminCount = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'Admin'")->fetchColumn();
        $wantsAdmin = (text(field($input, "role", "User")) == "Admin");

        if ($wantsAdmin && $adminCount > 0) {
            fail("Admin accounts can only be created by an existing admin.", 403);
        }

        // Admin lang siya kapag kauna-unahang account sa buong sistema.
        if ($wantsAdmin && $adminCount == 0) {
            $role = "Admin";
        } else {
            $role = "User";
        }

        // May kapareho na bang username?
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute(array($username));
        if ($check->fetch()) {
            respond(array("success" => false, "message" => "Username already exists."));
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO users
                                 (full_name, username, password_hash, role, security_question, security_answer, phone)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)");
        $insert->execute(array($fullName, $username, $hash, $role, $question, $answer, $phone));

        respond(array("success" => true, "message" => "Registered successfully.", "role" => $role));


    // Pagpapalit ng password gamit ang security question.
    case "resetPassword":
        $username    = text(argAt($args, 0));
        $fullName    = text(argAt($args, 1));
        $newPassword = argAt($args, 2);
        $question    = text(argAt($args, 3));
        $answer      = text(argAt($args, 4));

        checkPassword($newPassword);

        // MAHALAGA: huwag payagan ang blangkong tanong o sagot.
        //
        // Kung hindi ito hahadlangan, ang mga account na walang naka-set
        // na security question (blangko sa database) ay matutugma sa
        // blangkong ipinadala - kaya kahit sinong nakakaalam ng username
        // at buong pangalan ay makakapagpalit ng password nila.
        if ($question == "" || $answer == "") {
            respond(array(
                "success" => false,
                "message" => "Please choose your security question and enter your answer."
            ));
        }

        // Dapat pare-pareho lahat bago payagan.
        $stmt = $pdo->prepare("SELECT id FROM users
                                WHERE username = ? AND full_name = ?
                                  AND security_question = ? AND security_answer = ?");
        $stmt->execute(array($username, $fullName, $question, $answer));
        $user = $stmt->fetch();

        if (!$user) {
            respond(array("success" => false, "message" => "User not found or security information is incorrect."));
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE users SET password_hash = ?, legacy_password = NULL WHERE id = ?");
        $update->execute(array($hash, $user["id"]));

        respond(array("success" => true, "message" => "Password has been reset successfully."));


    // ============================================================
    //  ACCOUNT SETTINGS (kahit anong role)
    // ============================================================

    case "getProfile":
        $user = requireLogin();

        $stmt = $pdo->prepare("SELECT full_name, username, phone, role, security_question, created_at
                                 FROM users WHERE id = ?");
        $stmt->execute(array($user["id"]));
        $row = $stmt->fetch();

        if (!$row) {
            fail("Account not found.");
        }

        respond(array(
            "fullName"         => $row["full_name"],
            "username"         => $row["username"],
            "phoneNumber"      => $row["phone"],
            "role"             => $row["role"],
            "securityQuestion" => $row["security_question"],
            "memberSince"      => $row["created_at"]
        ));


    case "updateProfile":
        $user = requireLogin();
        $input = argAt($args, 0, array());

        $fullName = text(field($input, "fullName"));
        $phone    = text(field($input, "phoneNumber"));
        $question = text(field($input, "securityQuestion"));
        $answer   = text(field($input, "securityAnswer"));

        if ($fullName == "" || $phone == "") {
            fail("Full name and phone number are required.");
        }

        // Papalitan lang ang security question kapag may bagong sagot.
        if ($question != "" && $answer != "") {
            $stmt = $pdo->prepare("UPDATE users
                                      SET full_name = ?, phone = ?, security_question = ?, security_answer = ?
                                    WHERE id = ?");
            $stmt->execute(array($fullName, $phone, $question, $answer, $user["id"]));
        } else {
            $stmt = $pdo->prepare("UPDATE users SET full_name = ?, phone = ? WHERE id = ?");
            $stmt->execute(array($fullName, $phone, $user["id"]));
        }

        // Para agad magbago ang pangalan sa header.
        $_SESSION["user"]["fullName"] = $fullName;

        respond(array("success" => true, "message" => "Account updated.", "fullName" => $fullName));


    case "changePassword":
        $user = requireLogin();
        $input = argAt($args, 0, array());

        $current = field($input, "currentPassword");
        $new     = field($input, "newPassword");

        checkPassword($new);

        $stmt = $pdo->prepare("SELECT password_hash, legacy_password FROM users WHERE id = ?");
        $stmt->execute(array($user["id"]));
        $row = $stmt->fetch();

        // Tama ba ang kasalukuyang password niya?
        $currentOk = false;
        if ($row["password_hash"] != "" && password_verify($current, $row["password_hash"])) {
            $currentOk = true;
        }
        if ($row["legacy_password"] != null && $row["legacy_password"] === $current) {
            $currentOk = true;
        }

        if (!$currentOk) {
            respond(array("success" => false, "message" => "Your current password is incorrect."));
        }

        $hash = password_hash($new, PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE users SET password_hash = ?, legacy_password = NULL WHERE id = ?");
        $update->execute(array($hash, $user["id"]));

        respond(array("success" => true, "message" => "Password changed."));


    // ============================================================
    //  SETTINGS NG SHOP
    // ============================================================

    case "getSettings":
        $s = settings();

        $slot = (int)$s["slot_hours"];
        if ($slot < 1) {
            $slot = 1;
        }

        respond(array(
            "shopName"  => $s["shop_name"],
            "openHour"  => (int)$s["open_hour"],
            "closeHour" => (int)$s["close_hour"],
            "slotHours" => $slot
        ));


    case "updateSettings":
        requireAdmin();
        $input = argAt($args, 0, array());

        $shopName  = text(field($input, "shopName"));
        $openHour  = (int)field($input, "openHour", 8);
        $closeHour = (int)field($input, "closeHour", 20);
        $slotHours = (int)field($input, "slotHours", 1);

        if ($shopName == "") {
            fail("Shop name is required.");
        }
        if ($openHour < 0 || $openHour > 23 || $closeHour < 1 || $closeHour > 23) {
            fail("Opening hours must be between 0 and 23.");
        }
        if ($openHour >= $closeHour) {
            fail("Closing time must be later than opening time.");
        }
        if ($slotHours < 1 || $slotHours > 8) {
            fail("Slot length must be between 1 and 8 hours.");
        }

        // I-save isa-isa. Kapag meron nang naka-save, papalitan lang.
        $newSettings = array(
            "shop_name"  => $shopName,
            "open_hour"  => $openHour,
            "close_hour" => $closeHour,
            "slot_hours" => $slotHours
        );

        $stmt = $pdo->prepare("INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

        foreach ($newSettings as $key => $value) {
            $stmt->execute(array($key, (string)$value));
        }

        respond(array("success" => true, "message" => "Settings saved."));


    // ============================================================
    //  SERVICES
    // ============================================================

    case "getServices":
        $rows = $pdo->query("SELECT name, price FROM services ORDER BY name")->fetchAll();

        // Ginagawa kong simpleng listahan: [pangalan, presyo]
        $list = array();
        foreach ($rows as $row) {
            $list[] = array($row["name"], (float)$row["price"]);
        }

        respond($list);


    case "getServicesWithIndex":
        requireAdmin();
        $rows = $pdo->query("SELECT id, name, price FROM services ORDER BY id")->fetchAll();

        $list = array();
        foreach ($rows as $row) {
            $list[] = array(
                "index"   => (int)$row["id"],
                "service" => $row["name"],
                "price"   => (float)$row["price"]
            );
        }

        respond($list);


    case "addService":
        requireAdmin();
        $input = argAt($args, 0, array());

        $name  = text(field($input, "service"));
        $price = (float)field($input, "price", 0);

        if ($name == "" || $price <= 0) {
            fail("Enter a service name and valid price.");
        }

        $stmt = $pdo->prepare("INSERT INTO services (name, price) VALUES (?, ?)");
        $stmt->execute(array($name, $price));

        respond(array("success" => true));


    case "updateService":
        requireAdmin();
        $input = argAt($args, 0, array());

        $id    = (int)field($input, "index", 0);
        $name  = text(field($input, "service"));
        $price = (float)field($input, "price", 0);

        if ($id == 0 || $name == "" || $price <= 0) {
            fail("Invalid service data.");
        }

        $stmt = $pdo->prepare("UPDATE services SET name = ?, price = ? WHERE id = ?");
        $stmt->execute(array($name, $price, $id));

        respond(array("success" => true));


    case "deleteService":
        requireAdmin();
        $id = (int)argAt($args, 0, 0);

        // Huwag payagang burahin kapag may appointment na gumagamit nito,
        // kasi masisira ang mga lumang record.
        $check = $pdo->prepare("SELECT COUNT(*) FROM appointments WHERE service_id = ?");
        $check->execute(array($id));

        if ($check->fetchColumn() > 0) {
            respond(array(
                "success" => false,
                "message" => "This service is used by existing appointments and cannot be deleted."
            ));
        }

        $stmt = $pdo->prepare("DELETE FROM services WHERE id = ?");
        $stmt->execute(array($id));

        respond(array("success" => true));


    // ============================================================
    //  USERS (admin lang)
    // ============================================================

    case "getAllUsers":
        requireAdmin();
        $rows = $pdo->query("SELECT id, full_name, username, phone, role, created_at
                               FROM users ORDER BY role, full_name")->fetchAll();

        $list = array();
        foreach ($rows as $row) {
            $list[] = array(
                "id"          => (int)$row["id"],
                "fullName"    => $row["full_name"],
                "username"    => $row["username"],
                "phoneNumber" => $row["phone"],
                "role"        => $row["role"],
                "createdAt"   => $row["created_at"]
            );
        }

        respond($list);


    // Ang admin lang ang pwedeng gumawa ng bagong admin.
    case "createAdmin":
        requireAdmin();
        $input = argAt($args, 0, array());

        $fullName = text(field($input, "fullName"));
        $username = text(field($input, "username"));
        $password = field($input, "password");
        $phone    = text(field($input, "phoneNumber"));
        $question = text(field($input, "securityQuestion"));
        $answer   = text(field($input, "securityAnswer"));

        // Kailangan din ng security question dito.
        //
        // Kapag nakalimutan ng admin ang password niya at wala siyang
        // security question, WALA nang paraan para makabalik siya - liban
        // na lang kung may ibang admin. Kaya hindi ito opsyonal.
        if ($fullName == "" || $username == "" || $password == "" || $phone == ""
            || $question == "" || $answer == "") {
            fail("Please complete all fields, including the security question.");
        }

        checkPassword($password);

        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute(array($username));
        if ($check->fetch()) {
            respond(array("success" => false, "message" => "Username already exists."));
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO users
                                 (full_name, username, password_hash, role, security_question, security_answer, phone)
                                 VALUES (?, ?, ?, 'Admin', ?, ?, ?)");
        $insert->execute(array($fullName, $username, $hash, $question, $answer, $phone));

        respond(array("success" => true, "message" => "Admin account created."));


    // ============================================================
    //  BARBERS
    // ============================================================

    case "getBarbers":
        $user = currentUser();

        // Kasama ang average rating galing sa feedback table.
        $sql = "SELECT b.id, b.name, b.status, b.phone, b.specialty, b.user_id,
                       ROUND(AVG(f.rating), 2) AS avg_rating, COUNT(f.id) AS rating_count
                  FROM barbers b
                  LEFT JOIN feedback f ON f.barber_id = b.id";

        // Ang customer ay dapat makakita lang ng Active na barbero.
        if ($user == null || $user["role"] != "Admin") {
            $sql = $sql . " WHERE b.status = 'Active'";
        }

        $sql = $sql . " GROUP BY b.id ORDER BY b.name";
        $rows = $pdo->query($sql)->fetchAll();

        $list = array();
        foreach ($rows as $row) {
            $rating = null;
            if ($row["avg_rating"] != null) {
                $rating = (float)$row["avg_rating"];
            }

            $list[] = array(
                "id"          => (int)$row["id"],
                "name"        => $row["name"],
                "status"      => $row["status"],
                "phone"       => $row["phone"],
                "specialty"   => $row["specialty"],
                "hasLogin"    => $row["user_id"] != null,
                "rating"      => $rating,
                "ratingCount" => (int)$row["rating_count"]
            );
        }

        respond($list);


    case "addBarber":
        requireAdmin();
        $input = argAt($args, 0, array());

        $name  = text(field($input, "name"));
        $phone = text(field($input, "phone"));

        if ($name == "" || $phone == "") {
            fail("Enter the barber name and phone number.");
        }

        $stmt = $pdo->prepare("INSERT INTO barbers (name, phone, status, notes) VALUES (?, ?, 'Active', '')");
        $stmt->execute(array($name, $phone));

        respond(array("success" => true));


    case "updateBarber":
        requireAdmin();
        $input = argAt($args, 0, array());

        $name   = text(field($input, "name"));
        $status = text(field($input, "status", "Active"));

        if ($name == "" || ($status != "Active" && $status != "Inactive")) {
            fail("Invalid barber data.");
        }

        $stmt = $pdo->prepare("UPDATE barbers SET status = ? WHERE name = ?");
        $stmt->execute(array($status, $name));

        respond(array("success" => true));


    case "deleteBarber":
        requireAdmin();
        $input = argAt($args, 0, array());
        $name = text(field($input, "name"));

        if ($name == "") {
            fail("Barber not found.");
        }

        // Huwag burahin kapag may record na siya. Mas mabuting gawing
        // Inactive para hindi mawala ang history ng appointments.
        $check = $pdo->prepare("SELECT COUNT(*) FROM appointments a
                                  JOIN barbers b ON b.id = a.barber_id
                                 WHERE b.name = ?");
        $check->execute(array($name));

        if ($check->fetchColumn() > 0) {
            respond(array(
                "success" => false,
                "message" => "This barber has appointments on record. Set the barber to Inactive instead."
            ));
        }

        $stmt = $pdo->prepare("DELETE FROM barbers WHERE name = ?");
        $stmt->execute(array($name));

        respond(array("success" => true));


    case "getBarbersInfo":
        requireAdmin();
        $rows = $pdo->query("SELECT name, phone, specialty, notes FROM barbers ORDER BY name")->fetchAll();

        // Ginagawa kong array na ang susi ay pangalan ng barbero.
        $result = array();
        foreach ($rows as $row) {
            $result[$row["name"]] = array(
                "contact"   => $row["phone"],
                "specialty" => $row["specialty"],
                "notes"     => $row["notes"]
            );
        }

        respond($result);


    case "updateBarberInfo":
        requireAdmin();
        $name = text(argAt($args, 0));
        $info = argAt($args, 1, array());

        if ($name == "" || !is_array($info)) {
            fail("Invalid barber information.");
        }

        $stmt = $pdo->prepare("UPDATE barbers SET phone = ?, specialty = ?, notes = ? WHERE name = ?");
        $stmt->execute(array(
            text(field($info, "contact")),
            text(field($info, "specialty")),
            text(field($info, "notes")),
            $name
        ));

        respond(array("success" => true));


    // Gumagawa ng login account para sa isang barbero. Admin lang.
    case "createBarberLogin":
        requireAdmin();
        $input = argAt($args, 0, array());

        $barberId = (int)field($input, "barberId", 0);
        $username = text(field($input, "username"));
        $password = field($input, "password");
        $question = text(field($input, "securityQuestion"));
        $answer   = text(field($input, "securityAnswer"));

        // Kailangan ng security question para may magamit ang barbero
        // sa forgot password. Pwede naman niyang palitan mamaya sa
        // Account Settings niya.
        if ($barberId == 0 || $username == "" || $password == ""
            || $question == "" || $answer == "") {
            fail("Please complete all fields, including the security question.");
        }

        checkPassword($password);

        $stmt = $pdo->prepare("SELECT id, name, phone, user_id FROM barbers WHERE id = ?");
        $stmt->execute(array($barberId));
        $barber = $stmt->fetch();

        if (!$barber) {
            fail("Barber not found.");
        }
        if ($barber["user_id"] != null) {
            respond(array("success" => false, "message" => "This barber already has a login account."));
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute(array($username));
        if ($check->fetch()) {
            respond(array("success" => false, "message" => "Username already exists."));
        }

        // Dalawang table ang binabago kaya ginagamit ko ang transaction.
        // Kapag pumalya ang pangalawa, babalik sa dati ang una.
        $pdo->beginTransaction();

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO users
                                 (full_name, username, password_hash, role, security_question, security_answer, phone)
                                 VALUES (?, ?, ?, 'Barber', ?, ?, ?)");
        $insert->execute(array($barber["name"], $username, $hash, $question, $answer, $barber["phone"]));

        $newUserId = (int)$pdo->lastInsertId();

        $link = $pdo->prepare("UPDATE barbers SET user_id = ? WHERE id = ?");
        $link->execute(array($newUserId, $barberId));

        $pdo->commit();

        respond(array("success" => true, "message" => "Login created for " . $barber["name"] . "."));


    // Binibigyan ng bagong password ang barbero kapag nakalimutan niya.
    case "resetBarberPassword":
        requireAdmin();
        $input = argAt($args, 0, array());

        $barberId = (int)field($input, "barberId", 0);
        $password = field($input, "password");

        checkPassword($password);

        $stmt = $pdo->prepare("SELECT user_id FROM barbers WHERE id = ?");
        $stmt->execute(array($barberId));
        $row = $stmt->fetch();

        if (!$row || $row["user_id"] == null) {
            respond(array("success" => false, "message" => "This barber has no login account yet."));
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE users SET password_hash = ?, legacy_password = NULL WHERE id = ?");
        $update->execute(array($hash, (int)$row["user_id"]));

        respond(array("success" => true, "message" => "Password updated."));


    // Sariling profile ng naka-login na barbero.
    case "getMyBarberProfile":
        $me = requireBarber();
        $barberId = $me["barberId"];

        $stmt = $pdo->prepare("SELECT b.name, b.phone, b.specialty, b.status,
                                      ROUND(AVG(f.rating), 2) AS avg_rating, COUNT(f.id) AS rating_count
                                 FROM barbers b
                                 LEFT JOIN feedback f ON f.barber_id = b.id
                                WHERE b.id = ?
                             GROUP BY b.id");
        $stmt->execute(array($barberId));
        $row = $stmt->fetch();

        // Ilan ang appointment niya sa bawat status?
        $countStmt = $pdo->prepare("SELECT status, COUNT(*) AS total FROM appointments
                                     WHERE barber_id = ? GROUP BY status");
        $countStmt->execute(array($barberId));

        $byStatus = array();
        foreach ($countStmt->fetchAll() as $c) {
            $byStatus[$c["status"]] = (int)$c["total"];
        }

        $rating = null;
        if ($row["avg_rating"] != null) {
            $rating = (float)$row["avg_rating"];
        }

        respond(array(
            "barberId"     => $barberId,
            "name"         => $row["name"],
            "phone"        => $row["phone"],
            "specialty"    => $row["specialty"],
            "status"       => $row["status"],
            "rating"       => $rating,
            "ratingCount"  => (int)$row["rating_count"],
            "statusCounts" => $byStatus
        ));


    // ============================================================
    //  DAY OFF / SCHEDULE NG BARBERO
    // ============================================================

    // Kapag walang ipinasang barberId, ang sarili ng naka-login
    // na barbero ang kukunin.
    case "getDaysOff":
        requireLogin();
        $barberId = (int)argAt($args, 0, 0);

        if ($barberId == 0) {
            $me = requireBarber();
            $barberId = $me["barberId"];
        }

        $stmt = $pdo->prepare("SELECT DATE_FORMAT(off_date, '%Y-%m-%d') AS date, reason
                                 FROM barber_days_off
                                WHERE barber_id = ? AND off_date >= CURDATE() - INTERVAL 30 DAY
                             ORDER BY off_date");
        $stmt->execute(array($barberId));

        respond($stmt->fetchAll());


    // Ginagamit ito ng booking form para malaman kung kailan
    // hindi available ang napiling barbero.
    case "getBarberDaysOffByName":
        $name = text(argAt($args, 0));

        if ($name == "") {
            respond(array());
        }

        $stmt = $pdo->prepare("SELECT DATE_FORMAT(d.off_date, '%Y-%m-%d') AS date
                                 FROM barber_days_off d
                                 JOIN barbers b ON b.id = d.barber_id
                                WHERE b.name = ? AND d.off_date >= CURDATE()");
        $stmt->execute(array($name));

        $dates = array();
        foreach ($stmt->fetchAll() as $row) {
            $dates[] = $row["date"];
        }

        respond($dates);


    case "addDayOff":
        $me = requireBarber();
        $input = argAt($args, 0, array());

        $date   = text(field($input, "date"));
        $reason = text(field($input, "reason"));

        // Tama ba ang petsa? (halimbawa, walang February 31)
        if (!preg_match("/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/", $date)) {
            fail("Please choose a valid date.");
        }

        $parts = explode("-", $date);
        if (!checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])) {
            fail("Please choose a valid date.");
        }

        if ($date < date("Y-m-d")) {
            fail("You cannot mark a past date as a day off.");
        }

        // Huwag payagan kapag may naka-book nang customer sa araw na iyon.
        $check = $pdo->prepare("SELECT COUNT(*) FROM appointments
                                 WHERE barber_id = ? AND appointment_date = ? AND status = 'Approved'");
        $check->execute(array($me["barberId"], $date));
        $booked = (int)$check->fetchColumn();

        if ($booked > 0) {
            respond(array(
                "success" => false,
                "message" => "You already have " . $booked . " approved appointment(s) on " . $date . ". Ask the admin to cancel them first."
            ));
        }

        $stmt = $pdo->prepare("INSERT IGNORE INTO barber_days_off (barber_id, off_date, reason) VALUES (?, ?, ?)");
        $stmt->execute(array($me["barberId"], $date, $reason));

        respond(array("success" => true, "message" => "Marked " . $date . " as a day off."));


    case "removeDayOff":
        $me = requireBarber();
        $date = text(argAt($args, 0));

        $stmt = $pdo->prepare("DELETE FROM barber_days_off WHERE barber_id = ? AND off_date = ?");
        $stmt->execute(array($me["barberId"], $date));

        respond(array("success" => true, "message" => "You are available again on " . $date . "."));


    // ============================================================
    //  PROMOS
    // ============================================================

    case "getPromos":
        requireAdmin();
        $rows = $pdo->query("SELECT p.*, s.name AS service_name
                               FROM promos p
                               LEFT JOIN services s ON s.id = p.service_id
                           ORDER BY p.status, p.valid_to DESC")->fetchAll();

        $list = array();
        foreach ($rows as $row) {
            $serviceId = null;
            if ($row["service_id"] != null) {
                $serviceId = (int)$row["service_id"];
            }

            $list[] = array(
                "id"            => (int)$row["id"],
                "code"          => $row["code"],
                "description"   => $row["description"],
                "discountType"  => $row["discount_type"],
                "discountValue" => (float)$row["discount_value"],
                "serviceName"   => $row["service_name"],
                "serviceId"     => $serviceId,
                "validFrom"     => $row["valid_from"],
                "validTo"       => $row["valid_to"],
                "usageLimit"    => (int)$row["usage_limit"],
                "usedCount"     => (int)$row["used_count"],
                "status"        => $row["status"]
            );
        }

        respond($list);


    // Mga promo na pwedeng gamitin ngayon. Ito ang nakikita ng customer.
    case "getActivePromos":
        $rows = $pdo->query("SELECT p.code, p.description, p.discount_type, p.discount_value,
                                    p.valid_to, s.name AS service_name
                               FROM promos p
                               LEFT JOIN services s ON s.id = p.service_id
                              WHERE p.status = 'Active'
                                AND CURDATE() BETWEEN p.valid_from AND p.valid_to
                                AND (p.usage_limit = 0 OR p.used_count < p.usage_limit)
                           ORDER BY p.valid_to")->fetchAll();

        $list = array();
        foreach ($rows as $row) {
            $list[] = array(
                "code"          => $row["code"],
                "description"   => $row["description"],
                "discountType"  => $row["discount_type"],
                "discountValue" => (float)$row["discount_value"],
                "validTo"       => $row["valid_to"],
                "serviceName"   => $row["service_name"]
            );
        }

        respond($list);


    case "addPromo":
        requireAdmin();
        $input = argAt($args, 0, array());

        $code = strtoupper(text(field($input, "code")));
        $type = text(field($input, "discountType", "Percent"));
        if ($type != "Fixed") {
            $type = "Percent";
        }

        $value     = (float)field($input, "discountValue", 0);
        $from      = text(field($input, "validFrom"));
        $to        = text(field($input, "validTo"));
        $serviceId = (int)field($input, "serviceId", 0);
        $limit     = (int)field($input, "usageLimit", 0);
        $status    = text(field($input, "status", "Active"));

        if ($limit < 0) {
            $limit = 0;
        }
        if ($status != "Inactive") {
            $status = "Active";
        }

        if ($code == "" || $from == "" || $to == "") {
            fail("Promo code and validity dates are required.");
        }
        if (!preg_match("/^[A-Z0-9_-]{3,40}$/", $code)) {
            fail("Promo code may only use letters, numbers, dash and underscore (3-40 characters).");
        }
        if ($value <= 0) {
            fail("Discount value must be greater than 0.");
        }
        if ($type == "Percent" && $value > 100) {
            fail("Percentage discount cannot be more than 100.");
        }
        if ($to < $from) {
            fail("The end date must be on or after the start date.");
        }

        $check = $pdo->prepare("SELECT id FROM promos WHERE code = ?");
        $check->execute(array($code));
        if ($check->fetch()) {
            respond(array("success" => false, "message" => "That promo code already exists."));
        }

        // Kapag 0 ang serviceId, ibig sabihin lahat ng serbisyo.
        if ($serviceId == 0) {
            $serviceForDb = null;
        } else {
            $serviceForDb = $serviceId;
        }

        $stmt = $pdo->prepare("INSERT INTO promos
                               (code, description, discount_type, discount_value, service_id,
                                valid_from, valid_to, usage_limit, status)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(array(
            $code,
            text(field($input, "description")),
            $type,
            $value,
            $serviceForDb,
            $from,
            $to,
            $limit,
            $status
        ));

        respond(array("success" => true, "message" => "Promo created."));


    case "updatePromoStatus":
        requireAdmin();
        $input = argAt($args, 0, array());

        $id = (int)field($input, "id", 0);
        $status = text(field($input, "status"));
        if ($status != "Inactive") {
            $status = "Active";
        }

        if ($id == 0) {
            fail("Promo not found.");
        }

        $stmt = $pdo->prepare("UPDATE promos SET status = ? WHERE id = ?");
        $stmt->execute(array($status, $id));

        respond(array("success" => true));


    case "deletePromo":
        requireAdmin();
        $id = (int)argAt($args, 0, 0);

        // Alisin muna ang kabit sa appointments para hindi mag-error
        // ang foreign key, tapos saka burahin ang promo.
        $clear = $pdo->prepare("UPDATE appointments SET promo_id = NULL WHERE promo_id = ?");
        $clear->execute(array($id));

        $stmt = $pdo->prepare("DELETE FROM promos WHERE id = ?");
        $stmt->execute(array($id));

        respond(array("success" => true));


    // Sinusuri ang promo code bago mag-book para makita agad
    // ng customer ang bagong total.
    case "checkPromo":
        requireLogin();
        $input = argAt($args, 0, array());

        $code        = text(field($input, "code"));
        $serviceName = text(field($input, "service"));
        $date        = text(field($input, "date", date("Y-m-d")));

        if ($code == "" || $serviceName == "") {
            fail("Choose a service first, then enter the promo code.");
        }

        $stmt = $pdo->prepare("SELECT id, price FROM services WHERE name = ?");
        $stmt->execute(array($serviceName));
        $service = $stmt->fetch();

        if (!$service) {
            fail("Service not found.");
        }

        $result = findUsablePromo($pdo, $code, (int)$service["id"], $date);
        if ($result["ok"] == false) {
            respond(array("success" => false, "message" => $result["message"]));
        }

        $promo = $result["promo"];
        $price = (float)$service["price"];
        $discount = applyDiscount($price, $promo["discount_type"], (float)$promo["discount_value"]);

        respond(array(
            "success"     => true,
            "code"        => $promo["code"],
            "description" => $promo["description"],
            "price"       => $price,
            "discount"    => $discount,
            "finalPrice"  => round($price - $discount, 2)
        ));


    // ============================================================
    //  APPOINTMENTS
    // ============================================================

    case "bookAppointment":
        $user = requireLogin();
        $input = argAt($args, 0, array());

        $serviceName = text(field($input, "service"));
        $barberName  = text(field($input, "barber"));
        $date        = text(field($input, "date"));
        $time        = text(field($input, "time"));
        $promoCode   = text(field($input, "promoCode"));

        // Tama ba ang porma ng petsa at oras?
        if ($serviceName == "" || $barberName == ""
            || !preg_match("/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/", $date)
            || !preg_match("/^[0-9]{2}:[0-9]{2}$/", $time)) {
            fail("Invalid appointment details.");
        }

        $parts = explode("-", $date);
        if (!checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])) {
            fail("Invalid appointment details.");
        }

        $when = strtotime($date . " " . $time);
        if ($when === false) {
            fail("Invalid appointment details.");
        }

        // Hindi pwedeng nakaraan na.
        if ($when <= time()) {
            fail("That time slot has already passed. Please select a future date and time.");
        }

        // Bukas ba ang shop sa oras na iyon?
        $shop = settings();
        $hour = (int)date("G", $when);

        if ($hour < (int)$shop["open_hour"] || $hour > (int)$shop["close_hour"]) {
            fail("The shop is only open from " . $shop["open_hour"] . ":00 to " . $shop["close_hour"] . ":00.");
        }

        // Meron pa ba ang serbisyo at aktibo pa ba ang barbero?
        $serviceStmt = $pdo->prepare("SELECT id, price FROM services WHERE name = ?");
        $serviceStmt->execute(array($serviceName));
        $service = $serviceStmt->fetch();

        $barberStmt = $pdo->prepare("SELECT id FROM barbers WHERE name = ? AND status = 'Active'");
        $barberStmt->execute(array($barberName));
        $barber = $barberStmt->fetch();

        if (!$service || !$barber) {
            fail("Selected service or barber is no longer available.");
        }

        // Day off ba ng barbero sa araw na iyon?
        $offStmt = $pdo->prepare("SELECT reason FROM barber_days_off WHERE barber_id = ? AND off_date = ?");
        $offStmt->execute(array($barber["id"], $date));
        $dayOff = $offStmt->fetch();

        if ($dayOff) {
            $reason = "";
            if ($dayOff["reason"] != "") {
                $reason = " (" . $dayOff["reason"] . ")";
            }
            respond(array(
                "success" => false,
                "message" => $barberName . " is not available on " . $date . $reason . ". Please pick another date or barber."
            ));
        }

        // May naka-book na ba sa oras na iyon?
        $conflictStmt = $pdo->prepare("SELECT id FROM appointments
                                        WHERE barber_id = ? AND appointment_date = ? AND appointment_time = ?
                                          AND status IN ('Approved', 'Completed')");
        $conflictStmt->execute(array($barber["id"], $date, $time . ":00"));

        if ($conflictStmt->fetch()) {
            respond(array(
                "success" => false,
                "message" => "Selected barber is already booked for that hour. Please choose another time or barber."
            ));
        }

        // Kalkulahin ang babayaran.
        $price = (float)$service["price"];
        $discount = 0;
        $promoId = null;

        if ($promoCode != "") {
            $result = findUsablePromo($pdo, $promoCode, (int)$service["id"], $date);
            if ($result["ok"] == false) {
                respond(array("success" => false, "message" => $result["message"]));
            }
            $promo = $result["promo"];
            $discount = applyDiscount($price, $promo["discount_type"], (float)$promo["discount_value"]);
            $promoId = (int)$promo["id"];
        }

        $finalPrice = round($price - $discount, 2);

        // Sinasabay ko ang pag-save ng appointment at ang pagdagdag sa
        // bilang ng promo, kaya transaction ulit.
        $pdo->beginTransaction();

        $insert = $pdo->prepare("INSERT INTO appointments
                                 (user_id, service_id, barber_id, appointment_date, appointment_time,
                                  price, discount, final_price, promo_id, status)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')");
        $insert->execute(array(
            $user["id"], $service["id"], $barber["id"], $date, $time . ":00",
            $price, $discount, $finalPrice, $promoId
        ));

        if ($promoId != null) {
            $countUp = $pdo->prepare("UPDATE promos SET used_count = used_count + 1 WHERE id = ?");
            $countUp->execute(array($promoId));
        }

        $pdo->commit();

        $message = "Appointment booked and auto-approved.";
        if ($discount > 0) {
            $message = $message . " Promo applied: you saved ₱" . number_format($discount, 2) . ".";
        }

        respond(array("success" => true, "message" => $message, "finalPrice" => $finalPrice));


    // Isang listahan para sa tatlong role:
    //   Admin  - lahat ng appointment
    //   Barber - sarili niyang appointment lang
    //   User   - sarili niyang booking lang, kasama ang feedback
    case "getAppointments":
        $user = requireLogin();

        $sql = "SELECT a.id, u.full_name, u.username, s.name AS service, b.name AS barber,
                       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS date,
                       DATE_FORMAT(a.appointment_time, '%H:%i') AS time,
                       a.status, a.price, a.discount, a.final_price, a.cancellation_note,
                       p.code AS promo_code, f.rating, f.comment
                  FROM appointments a
                  JOIN users u ON u.id = a.user_id
                  JOIN services s ON s.id = a.service_id
                  JOIN barbers b ON b.id = a.barber_id
                  LEFT JOIN promos p ON p.id = a.promo_id
                  LEFT JOIN feedback f ON f.appointment_id = a.id";

        $params = array();

        if ($user["role"] == "Barber") {
            $me = requireBarber();
            $sql = $sql . " WHERE a.barber_id = ?";
            $params[] = $me["barberId"];
        } else if ($user["role"] != "Admin") {
            $sql = $sql . " WHERE a.user_id = ?";
            $params[] = $user["id"];
        }

        $sql = $sql . " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $now = time();
        $list = array();

        foreach ($stmt->fetchAll() as $row) {
            // Lumipas na ba ang oras ng appointment?
            $isPast = strtotime($row["date"] . " " . $row["time"]) < $now;

            $rating = null;
            if ($row["rating"] != null) {
                $rating = (int)$row["rating"];
            }

            // Pwede lang mag-feedback kapag tapos na ang oras,
            // hindi pa siya nagbibigay ng rating, at natuloy ang appointment.
            $canRate = false;
            if ($isPast && $rating == null
                && ($row["status"] == "Approved" || $row["status"] == "Completed")) {
                $canRate = true;
            }

            $list[] = array(
                "id"               => (int)$row["id"],
                "fullName"         => $row["full_name"],
                "username"         => $row["username"],
                "service"          => $row["service"],
                "barber"           => $row["barber"],
                "date"             => $row["date"],
                "time"             => $row["time"],
                "status"           => $row["status"],
                "price"            => (float)$row["price"],
                "discount"         => (float)$row["discount"],
                "finalPrice"       => (float)$row["final_price"],
                "promoCode"        => $row["promo_code"],
                "cancellationNote" => $row["cancellation_note"],
                "rating"           => $rating,
                "comment"          => $row["comment"],
                "canRate"          => $canRate,
                "isPast"           => $isPast
            );
        }

        respond($list);


    case "cancelAppointment":
        requireAdmin();
        $id = (int)argAt($args, 0, 0);
        $note = text(argAt($args, 1));

        if ($id == 0) {
            fail("Appointment not found.");
        }

        $stmt = $pdo->prepare("UPDATE appointments SET status = 'Cancelled', cancellation_note = ? WHERE id = ?");
        $stmt->execute(array($note, $id));

        respond(array("success" => true));


    // Minamarkahan ng barbero (o admin) kung natuloy ba o hindi
    // dumating ang customer.
    case "setAppointmentStatus":
        $user = requireRole("Admin", "Barber");
        $input = argAt($args, 0, array());

        $id = (int)field($input, "id", 0);
        $status = text(field($input, "status"));

        if ($id == 0 || ($status != "Completed" && $status != "No-show" && $status != "Approved")) {
            fail("Invalid status.");
        }

        $sql = "UPDATE appointments SET status = ? WHERE id = ?";
        $params = array($status, $id);

        // Ang barbero ay pwede lang gumalaw sa sarili niyang appointment.
        if ($user["role"] == "Barber") {
            $me = requireBarber();
            $sql = $sql . " AND barber_id = ?";
            $params[] = $me["barberId"];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() == 0) {
            respond(array("success" => false, "message" => "Appointment not found or not yours."));
        }

        respond(array("success" => true, "message" => "Appointment marked as " . $status . "."));


    // ============================================================
    //  FEEDBACK AT RATINGS
    // ============================================================

    case "submitFeedback":
        $user = requireLogin();
        $input = argAt($args, 0, array());

        $appointmentId = (int)field($input, "appointmentId", 0);
        $rating  = (int)field($input, "rating", 0);
        $comment = text(field($input, "comment"));

        if ($rating < 1 || $rating > 5) {
            fail("Please choose a rating from 1 to 5 stars.");
        }

        // Kanya ba talaga ang appointment na ito?
        $stmt = $pdo->prepare("SELECT id, barber_id, status, appointment_date, appointment_time
                                 FROM appointments WHERE id = ? AND user_id = ?");
        $stmt->execute(array($appointmentId, $user["id"]));
        $appt = $stmt->fetch();

        if (!$appt) {
            respond(array("success" => false, "message" => "Appointment not found."));
        }

        if ($appt["status"] != "Approved" && $appt["status"] != "Completed") {
            respond(array("success" => false, "message" => "You can only rate appointments that pushed through."));
        }

        // Hindi pa pwede kung hindi pa nangyayari.
        if (strtotime($appt["appointment_date"] . " " . $appt["appointment_time"]) > time()) {
            respond(array("success" => false, "message" => "You can leave feedback after your appointment."));
        }

        // Isang rating lang kada appointment.
        $check = $pdo->prepare("SELECT id FROM feedback WHERE appointment_id = ?");
        $check->execute(array($appointmentId));
        if ($check->fetch()) {
            respond(array("success" => false, "message" => "You already rated this appointment."));
        }

        $insert = $pdo->prepare("INSERT INTO feedback (appointment_id, user_id, barber_id, rating, comment)
                                 VALUES (?, ?, ?, ?, ?)");
        $insert->execute(array($appointmentId, $user["id"], (int)$appt["barber_id"], $rating, $comment));

        respond(array("success" => true, "message" => "Thank you for your feedback!"));


    // Buod ng performance ng bawat barbero base sa stars at appointments.
    case "getBarberPerformance":
        requireAdmin();

        // 1. Rating ng bawat barbero, pati ilan ang 5 star, 4 star, atbp.
        $rows = $pdo->query("SELECT b.id, b.name, b.status, b.specialty,
                                    ROUND(AVG(f.rating), 2) AS avg_rating, COUNT(f.id) AS rating_count,
                                    SUM(f.rating = 5) AS s5, SUM(f.rating = 4) AS s4,
                                    SUM(f.rating = 3) AS s3, SUM(f.rating = 2) AS s2,
                                    SUM(f.rating = 1) AS s1
                               FROM barbers b
                               LEFT JOIN feedback f ON f.barber_id = b.id
                           GROUP BY b.id
                           ORDER BY avg_rating DESC, b.name")->fetchAll();

        // 2. Bilang ng appointment at kita ng bawat barbero.
        $apptRows = $pdo->query("SELECT barber_id, status, COUNT(*) AS total, SUM(final_price) AS revenue
                                   FROM appointments GROUP BY barber_id, status")->fetchAll();

        $apptStats = array();
        foreach ($apptRows as $a) {
            $barberId = (int)$a["barber_id"];

            if (!isset($apptStats[$barberId])) {
                $apptStats[$barberId] = array(
                    "total" => 0, "completed" => 0, "approved" => 0,
                    "cancelled" => 0, "noShow" => 0, "revenue" => 0
                );
            }

            $apptStats[$barberId]["total"] += (int)$a["total"];

            // Ang kita ay galing lang sa mga natuloy na appointment.
            if ($a["status"] == "Completed") {
                $apptStats[$barberId]["completed"] = (int)$a["total"];
                $apptStats[$barberId]["revenue"] += (float)$a["revenue"];
            }
            if ($a["status"] == "Approved") {
                $apptStats[$barberId]["approved"] = (int)$a["total"];
                $apptStats[$barberId]["revenue"] += (float)$a["revenue"];
            }
            if ($a["status"] == "Cancelled") {
                $apptStats[$barberId]["cancelled"] = (int)$a["total"];
            }
            if ($a["status"] == "No-show") {
                $apptStats[$barberId]["noShow"] = (int)$a["total"];
            }
        }

        // 3. Pinakabagong 5 komento sa bawat barbero.
        $commentRows = $pdo->query("SELECT f.barber_id, f.rating, f.comment,
                                           DATE_FORMAT(f.created_at, '%Y-%m-%d') AS created, u.full_name
                                      FROM feedback f
                                      JOIN users u ON u.id = f.user_id
                                  ORDER BY f.created_at DESC")->fetchAll();

        $comments = array();
        foreach ($commentRows as $c) {
            $barberId = (int)$c["barber_id"];

            if (!isset($comments[$barberId])) {
                $comments[$barberId] = array();
            }

            if (count($comments[$barberId]) < 5) {
                $comments[$barberId][] = array(
                    "rating"   => (int)$c["rating"],
                    "comment"  => $c["comment"],
                    "date"     => $c["created"],
                    "customer" => $c["full_name"]
                );
            }
        }

        // 4. Pagsamahin lahat.
        $list = array();
        foreach ($rows as $row) {
            $barberId = (int)$row["id"];

            if (isset($apptStats[$barberId])) {
                $stats = $apptStats[$barberId];
            } else {
                $stats = array("total" => 0, "completed" => 0, "approved" => 0,
                               "cancelled" => 0, "noShow" => 0, "revenue" => 0);
            }

            if (isset($comments[$barberId])) {
                $barberComments = $comments[$barberId];
            } else {
                $barberComments = array();
            }

            $rating = null;
            if ($row["avg_rating"] != null) {
                $rating = (float)$row["avg_rating"];
            }

            $list[] = array(
                "id"          => $barberId,
                "name"        => $row["name"],
                "status"      => $row["status"],
                "specialty"   => $row["specialty"],
                "rating"      => $rating,
                "ratingCount" => (int)$row["rating_count"],
                "stars" => array(
                    "5" => (int)$row["s5"],
                    "4" => (int)$row["s4"],
                    "3" => (int)$row["s3"],
                    "2" => (int)$row["s2"],
                    "1" => (int)$row["s1"]
                ),
                "appointments"   => $stats,
                "recentComments" => $barberComments
            );
        }

        respond($list);


    // ============================================================
    //  ANALYTICS
    // ============================================================

    case "getDailyAnalyticsByMonth":
        requireAdmin();

        $year  = (int)argAt($args, 0, 0);
        $month = (int)argAt($args, 1, 0);

        if ($year < 2000 || $month < 1 || $month > 12) {
            fail("Invalid month.");
        }

        // Unang araw ng buwan hanggang unang araw ng susunod na buwan.
        $start = sprintf("%04d-%02d-01", $year, $month);
        $end = date("Y-m-d", strtotime($start . " +1 month"));

        $stmt = $pdo->prepare("SELECT a.appointment_date, a.status, a.final_price,
                                      s.name AS service, b.name AS barber
                                 FROM appointments a
                                 JOIN services s ON s.id = a.service_id
                                 JOIN barbers b ON b.id = a.barber_id
                                WHERE a.appointment_date >= ? AND a.appointment_date < ?");
        $stmt->execute(array($start, $end));

        $stats = array();          // bawat araw
        $barberStats = array();    // bawat barbero
        $serviceStats = array();   // bawat serbisyo
        $monthlyRevenue = 0;

        foreach ($stmt->fetchAll() as $row) {
            $date = $row["appointment_date"];
            $barber = $row["barber"];
            $service = $row["service"];

            if (!isset($stats[$date])) {
                $stats[$date] = array("total" => 0, "approved" => 0, "cancelled" => 0, "revenue" => 0);
            }
            $stats[$date]["total"]++;

            if (!isset($barberStats[$barber])) {
                $barberStats[$barber] = array("approved" => 0, "total" => 0, "revenue" => 0,
                                              "serviceCounts" => array());
            }
            $barberStats[$barber]["total"]++;

            // Ang cancelled at no-show ay walang kita.
            if ($row["status"] == "Cancelled" || $row["status"] == "No-show") {
                $stats[$date]["cancelled"]++;
                continue;
            }

            $price = (float)$row["final_price"];

            $stats[$date]["approved"]++;
            $stats[$date]["revenue"] += $price;
            $monthlyRevenue += $price;

            $barberStats[$barber]["approved"]++;
            $barberStats[$barber]["revenue"] += $price;

            if (!isset($barberStats[$barber]["serviceCounts"][$service])) {
                $barberStats[$barber]["serviceCounts"][$service] = 0;
            }
            $barberStats[$barber]["serviceCounts"][$service]++;

            if (!isset($serviceStats[$service])) {
                $serviceStats[$service] = array("total" => 0, "barberCounts" => array());
            }
            $serviceStats[$service]["total"]++;

            if (!isset($serviceStats[$service]["barberCounts"][$barber])) {
                $serviceStats[$service]["barberCounts"][$barber] = 0;
            }
            $serviceStats[$service]["barberCounts"][$barber]++;
        }

        // Anong serbisyo ang pinakamadalas gawin ng bawat barbero?
        foreach ($barberStats as $name => $data) {
            $topService = "-";
            $topCount = 0;

            foreach ($data["serviceCounts"] as $serviceName => $count) {
                if ($count > $topCount) {
                    $topCount = $count;
                    $topService = $serviceName;
                }
            }

            $barberStats[$name]["topService"] = $topService;
            unset($barberStats[$name]["serviceCounts"]);
        }

        // Sinong barbero ang madalas gumawa ng bawat serbisyo?
        foreach ($serviceStats as $name => $data) {
            $topBarber = "-";
            $topCount = 0;

            foreach ($data["barberCounts"] as $barberName => $count) {
                if ($count > $topCount) {
                    $topCount = $count;
                    $topBarber = $barberName;
                }
            }

            $serviceStats[$name]["topBarber"] = $topBarber;
            unset($serviceStats[$name]["barberCounts"]);
        }

        // Pinakamadalas at pinakabihirang serbisyo sa buwan na ito.
        $most = array("name" => "-", "count" => 0);
        $least = array("name" => "-", "count" => 0);
        $firstOne = true;

        foreach ($serviceStats as $name => $data) {
            if ($firstOne) {
                $most = array("name" => $name, "count" => $data["total"]);
                $least = array("name" => $name, "count" => $data["total"]);
                $firstOne = false;
                continue;
            }
            if ($data["total"] > $most["count"]) {
                $most = array("name" => $name, "count" => $data["total"]);
            }
            if ($data["total"] < $least["count"]) {
                $least = array("name" => $name, "count" => $data["total"]);
            }
        }

        // Ang mga may underscore ay hindi araw, kaya hiwalay silang
        // binabasa ng JavaScript.
        $stats["_monthlyRevenue"] = $monthlyRevenue;
        $stats["_barberStats"] = $barberStats;
        $stats["_serviceStats"] = $serviceStats;
        $stats["_mostService"] = $most;
        $stats["_leastService"] = $least;

        respond($stats);


    // ============================================================
    //  SALES FORECASTING
    // ------------------------------------------------------------
    //  Ito ang machine learning part ng project. Ginagamit ko ang
    //  LINEAR REGRESSION (least squares method), ang pinakasimpleng
    //  modelo. Ang gagawin niya ay maghanap ng isang tuwid na linya
    //  na pinakamalapit sa lahat ng benta ng nakaraang buwan:
    //
    //        benta = intercept + (slope x numero ng buwan)
    //
    //    slope     = gaano tumataas o bumababa kada buwan
    //    intercept = saan nagsisimula ang linya
    //
    //  Pagkatapos, ipagpapatuloy lang natin ang linya para makuha
    //  ang hula sa susunod na mga buwan.
    // ============================================================

    case "getSalesForecast":
        requireAdmin();

        $monthsAhead = (int)argAt($args, 0, 3);
        if ($monthsAhead < 1) {
            $monthsAhead = 1;
        }
        if ($monthsAhead > 6) {
            $monthsAhead = 6;
        }

        // HAKBANG 1: Kunin ang benta sa mga TAPOS NA buwan lang.
        //
        // Hindi kasama ang kasalukuyang buwan kasi kalahati pa lang ito,
        // at hindi rin kasama ang mga paparating na booking kasi hindi pa
        // nangyayari. Kapag isinama, mukhang bumababa ang benta gayong
        // hindi naman talaga.
        $firstOfThisMonth = date("Y-m-01");

        $stmt = $pdo->prepare("SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS ym,
                                      SUM(final_price) AS revenue, COUNT(*) AS bookings
                                 FROM appointments
                                WHERE status IN ('Approved', 'Completed')
                                  AND appointment_date < ?
                             GROUP BY ym ORDER BY ym");
        $stmt->execute(array($firstOfThisMonth));
        $rows = $stmt->fetchAll();

        if (count($rows) == 0) {
            respond(array(
                "success" => false,
                "history" => array(),
                "monthsWithSales" => 0,
                "message" => "There are no completed months of sales yet, so there is nothing to forecast."
            ));
        }

        // Ang benta ngayong buwan. Ipinapakita lang, hindi ginagamit
        // sa pag-aaral ng modelo.
        $curStmt = $pdo->prepare("SELECT SUM(final_price) AS revenue, COUNT(*) AS bookings
                                    FROM appointments
                                   WHERE status IN ('Approved', 'Completed')
                                     AND appointment_date >= ? AND appointment_date <= CURDATE()");
        $curStmt->execute(array($firstOfThisMonth));
        $curRow = $curStmt->fetch();

        $curRevenue = 0;
        if ($curRow["revenue"] != null) {
            $curRevenue = round((float)$curRow["revenue"], 2);
        }

        $currentMonth = array(
            "month"    => date("Y-m"),
            "label"    => date("M Y"),
            "revenue"  => $curRevenue,
            "bookings" => (int)$curRow["bookings"],
            "partial"  => true
        );

        // HAKBANG 2: Gawing tuloy-tuloy ang mga buwan.
        // Kapag may buwan na walang benta, 0 ang ilalagay natin doon.
        $salesByMonth = array();
        foreach ($rows as $row) {
            $salesByMonth[$row["ym"]] = array(
                "revenue"  => (float)$row["revenue"],
                "bookings" => (int)$row["bookings"]
            );
        }

        $monthKeys = array_keys($salesByMonth);
        $firstMonth = $monthKeys[0];
        $lastMonth = $monthKeys[count($monthKeys) - 1];

        $history = array();
        $cursor = $firstMonth;

        while (true) {
            $revenue = 0;
            $bookings = 0;

            if (isset($salesByMonth[$cursor])) {
                $revenue = round($salesByMonth[$cursor]["revenue"], 2);
                $bookings = $salesByMonth[$cursor]["bookings"];
            }

            $history[] = array(
                "month"    => $cursor,
                "label"    => date("M Y", strtotime($cursor . "-01")),
                "revenue"  => $revenue,
                "bookings" => $bookings,
                "partial"  => false
            );

            if ($cursor == $lastMonth) {
                break;
            }
            $cursor = date("Y-m", strtotime($cursor . "-01 +1 month"));
        }

        // Kailangan ng hindi bababa sa tatlong buwan na may benta.
        // Kapag dalawa lang at malayo ang pagitan, sumasadsad ang linya
        // sa ibaba ng zero at nagiging walang kwenta ang hula. Mas mabuti
        // nang sabihin ito kaysa magpakita ng 0.00 na parang totoo.
        $monthsWithSales = count($rows);

        if ($monthsWithSales < 3) {
            if ($monthsWithSales == 1) {
                $countText = "1 month currently has sales";
            } else {
                $countText = $monthsWithSales . " months currently have sales";
            }

            respond(array(
                "success" => false,
                "history" => $history,
                "currentMonth" => $currentMonth,
                "monthsWithSales" => $monthsWithSales,
                "message" => "Not enough sales data for a reliable forecast. The model needs at least 3 completed months with recorded appointments, but only " . $countText . ". The actual sales recorded so far are shown below."
            ));
        }

        // HAKBANG 3: Hanapin ang linya gamit ang least squares formula.
        //
        //   slope     = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        //   intercept = (sumY - slope * sumX) / n
        $n = count($history);
        $sumX = 0;
        $sumY = 0;
        $sumXY = 0;
        $sumXX = 0;

        for ($i = 0; $i < $n; $i++) {
            $x = $i + 1;                      // pang-ilang buwan
            $y = $history[$i]["revenue"];     // benta sa buwan na iyon

            $sumX = $sumX + $x;
            $sumY = $sumY + $y;
            $sumXY = $sumXY + ($x * $y);
            $sumXX = $sumXX + ($x * $x);
        }

        $bottom = ($n * $sumXX) - ($sumX * $sumX);

        if ($bottom == 0) {
            $slope = 0;
        } else {
            $slope = (($n * $sumXY) - ($sumX * $sumY)) / $bottom;
        }

        $intercept = ($sumY - ($slope * $sumX)) / $n;
        $average = $sumY / $n;

        // HAKBANG 4: Gaano katumpak ang modelo?
        // Inihahambing natin ang hula ng linya sa totoong benta.
        $totalError = 0;
        $counted = 0;

        for ($i = 0; $i < $n; $i++) {
            $predicted = $intercept + ($slope * ($i + 1));

            // Sa graph, huwag ipakitang negatibo.
            $trend = $predicted;
            if ($trend < 0) {
                $trend = 0;
            }
            $history[$i]["trend"] = round($trend, 2);

            if ($history[$i]["revenue"] > 0) {
                $totalError += abs($history[$i]["revenue"] - $predicted) / $history[$i]["revenue"];
                $counted++;
            }
        }

        $errorRate = null;
        $accuracy = null;

        if ($counted > 0) {
            $errorRate = round(($totalError / $counted) * 100, 1);
            $accuracy = round(100 - $errorRate, 1);
            if ($accuracy < 0) {
                $accuracy = 0;
            }
        }

        // Kapag walang masukat na error, 20% na lang ang gamit na saklaw.
        $spread = 20;
        if ($errorRate != null) {
            $spread = $errorRate;
        }

        // HAKBANG 5: Hulaan ang susunod na mga buwan.
        // Nagsisimula sa buwan PAGKATAPOS ng kasalukuyan, kasi hindi pa
        // tapos ang ngayon.
        $forecast = array();
        $futureMonth = date("Y-m");

        for ($i = 1; $i <= $monthsAhead; $i++) {
            $futureMonth = date("Y-m", strtotime($futureMonth . "-01 +1 month"));

            // Pang-ilang buwan ito kung bibilangin mula sa unang buwan
            // ng kasaysayan.
            $x = monthGap($firstMonth, $futureMonth) + 1;

            $predicted = $intercept + ($slope * $x);
            if ($predicted < 0) {
                $predicted = 0;
            }

            $low = $predicted * (1 - ($spread / 100));
            if ($low < 0) {
                $low = 0;
            }
            $high = $predicted * (1 + ($spread / 100));

            $forecast[] = array(
                "month"     => $futureMonth,
                "label"     => date("M Y", strtotime($futureMonth . "-01")),
                "predicted" => round($predicted, 2),
                "low"       => round($low, 2),
                "high"      => round($high, 2)
            );
        }

        // Ano ang inaasahan ng modelo para sa kasalukuyang buwan?
        // Para may maikumpara sa aktwal na benta ngayon.
        $currentX = monthGap($firstMonth, date("Y-m")) + 1;
        $currentTrend = $intercept + ($slope * $currentX);
        if ($currentTrend < 0) {
            $currentTrend = 0;
        }
        $currentMonth["trend"] = round($currentTrend, 2);

        // Pataas ba o pababa ang takbo?
        if ($slope > 0) {
            $direction = "Going up";
        } else if ($slope < 0) {
            $direction = "Going down";
        } else {
            $direction = "Flat";
        }

        respond(array(
            "success"      => true,
            "history"      => $history,
            "currentMonth" => $currentMonth,
            "forecast"     => $forecast,
            "model" => array(
                "slope"           => round($slope, 2),
                "intercept"       => round($intercept, 2),
                "average"         => round($average, 2),
                "monthsUsed"      => $n,
                "monthsWithSales" => $monthsWithSales,
                "accuracy"        => $accuracy,
                "errorRate"       => $errorRate,
                "direction"       => $direction
            )
        ));


    // ============================================================
    //  CUSTOMER FORECASTING
    // ------------------------------------------------------------
    //  Kapareho ng Sales Forecast, pero ang hinuhulaan ay ang BILANG
    //  NG CUSTOMER sa susunod na buwan, hindi ang benta.
    //
    //    customers = bilang ng natuloy na appointment (Approved o
    //                Completed) - bawat isa ay isang customer na
    //                pumunta sa shop
    //    unique    = ilang magkakaibang tao ang mga iyon
    //
    //  Parehong may sariling linya ang dalawa.
    // ============================================================

    case "getCustomerForecast":
        requireAdmin();

        $monthsAhead = (int)argAt($args, 0, 3);
        $monthsAhead = max(1, min(6, $monthsAhead));

        // Tapos na buwan lang ang ginagamit sa pag-aaral, gaya ng sa benta.
        $firstOfThisMonth = date("Y-m-01");

        $stmt = $pdo->prepare("SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS ym,
                                      COUNT(*) AS visits, COUNT(DISTINCT user_id) AS uniques
                                 FROM appointments
                                WHERE status IN ('Approved', 'Completed')
                                  AND appointment_date < ?
                             GROUP BY ym ORDER BY ym");
        $stmt->execute(array($firstOfThisMonth));
        $rows = $stmt->fetchAll();

        // Ang kasalukuyang buwan hanggang ngayong araw. Ipinapakita lang.
        $curStmt = $pdo->prepare("SELECT COUNT(*) AS visits, COUNT(DISTINCT user_id) AS uniques
                                    FROM appointments
                                   WHERE status IN ('Approved', 'Completed')
                                     AND appointment_date >= ? AND appointment_date <= CURDATE()");
        $curStmt->execute(array($firstOfThisMonth));
        $curRow = $curStmt->fetch();

        // Ang mga naka-book na sa natitirang araw ng buwan na ito.
        $bookedStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments
                                      WHERE status = 'Approved'
                                        AND appointment_date > CURDATE()
                                        AND appointment_date < ?");
        $bookedStmt->execute(array(date("Y-m-01", strtotime($firstOfThisMonth . " +1 month"))));

        $currentMonth = array(
            "month"     => date("Y-m"),
            "label"     => date("M Y"),
            "customers" => (int)$curRow["visits"],
            "unique"    => (int)$curRow["uniques"],
            "upcoming"  => (int)$bookedStmt->fetchColumn(),
            "partial"   => true
        );

        // Gawing tuloy-tuloy ang mga buwan (0 kapag walang customer).
        $byMonth = array();
        foreach ($rows as $row) {
            $byMonth[$row["ym"]] = $row;
        }

        $history = array();

        if (count($rows) > 0) {
            $firstMonth = $rows[0]["ym"];
            $lastMonth = $rows[count($rows) - 1]["ym"];
            $cursor = $firstMonth;

            while (true) {
                $visits = 0;
                $uniques = 0;

                if (isset($byMonth[$cursor])) {
                    $visits = (int)$byMonth[$cursor]["visits"];
                    $uniques = (int)$byMonth[$cursor]["uniques"];
                }

                $history[] = array(
                    "month"     => $cursor,
                    "label"     => date("M Y", strtotime($cursor . "-01")),
                    "customers" => $visits,
                    "unique"    => $uniques,
                    "partial"   => false
                );

                if ($cursor == $lastMonth) {
                    break;
                }
                $cursor = date("Y-m", strtotime($cursor . "-01 +1 month"));
            }
        }

        $monthsWithCustomers = count($rows);

        if ($monthsWithCustomers < 3) {
            respond(array(
                "success" => false,
                "history" => $history,
                "currentMonth" => $currentMonth,
                "monthsWithCustomers" => $monthsWithCustomers,
                "message" => "Not enough data for a reliable customer forecast. The model needs at least 3 completed months with customers, but only " . $monthsWithCustomers . " " . ($monthsWithCustomers == 1 ? "month has" : "months have") . " any so far."
            ));
        }

        $visitValues = array();
        $uniqueValues = array();
        foreach ($history as $h) {
            $visitValues[] = $h["customers"];
            $uniqueValues[] = $h["unique"];
        }

        $visitLine = fitLine($visitValues);
        $uniqueLine = fitLine($uniqueValues);

        for ($i = 0; $i < count($history); $i++) {
            $history[$i]["trend"] = round(lineAt($visitLine, $i + 1), 1);
        }

        // Kapag walang masukat na error, 20% na lang ang saklaw.
        $spread = 20;
        if ($visitLine["errorRate"] !== null) {
            $spread = $visitLine["errorRate"];
        }

        $forecast = array();
        $futureMonth = date("Y-m");

        for ($i = 1; $i <= $monthsAhead; $i++) {
            $futureMonth = date("Y-m", strtotime($futureMonth . "-01 +1 month"));
            $x = monthGap($firstMonth, $futureMonth) + 1;

            // Buong tao ang customer, kaya ini-round.
            $predicted = lineAt($visitLine, $x);

            $forecast[] = array(
                "month"     => $futureMonth,
                "label"     => date("M Y", strtotime($futureMonth . "-01")),
                "predicted" => (int)round($predicted),
                "unique"    => (int)round(lineAt($uniqueLine, $x)),
                "low"       => (int)max(0, floor($predicted * (1 - ($spread / 100)))),
                "high"      => (int)ceil($predicted * (1 + ($spread / 100)))
            );
        }

        $currentX = monthGap($firstMonth, date("Y-m")) + 1;
        $currentMonth["trend"] = round(lineAt($visitLine, $currentX), 1);

        $slope = $visitLine["slope"];
        if ($slope > 0.05) {
            $direction = "Growing";
        } else if ($slope < -0.05) {
            $direction = "Declining";
        } else {
            $direction = "Steady";
        }

        respond(array(
            "success"      => true,
            "history"      => $history,
            "currentMonth" => $currentMonth,
            "forecast"     => $forecast,
            "model" => array(
                "slope"      => round($slope, 2),
                "average"    => round($visitLine["average"], 1),
                "monthsUsed" => count($history),
                "accuracy"   => $visitLine["accuracy"],
                "errorRate"  => $visitLine["errorRate"],
                "direction"  => $direction
            )
        ));


    // Kapag hindi ko kilala ang action.
    default:
        fail("Unknown action.");

    }

} catch (PDOException $e) {

    // Kapag may problema sa gitna ng transaction, ibalik sa dati.
    if (db()->inTransaction()) {
        db()->rollBack();
    }

    respond(array(
        "success" => false,
        "message" => "Database error. Import database/upgrade_v2.sql and check api/config.php."
    ), 500);

} catch (Exception $e) {

    respond(array("success" => false, "message" => $e->getMessage()), 500);
}
