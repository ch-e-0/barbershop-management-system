<?php
// ============================================================
//  config.php
//  Dito nakalagay ang connection sa database at ang mga
//  maliliit na function na paulit-ulit kong ginagamit
//  sa index.php.
// ============================================================

// Palitan lang ito kung iba ang setup ng MySQL mo sa XAMPP.
$db_host = "127.0.0.1";
$db_name = "supremo_barbershop";
$db_user = "root";
$db_pass = "";

date_default_timezone_set("Asia/Manila");
session_start();


// Kumokonekta sa database. Isang beses lang talaga kumokonekta
// kahit ilang beses tawagin, kasi tinatago ko sa $GLOBALS.
function db() {
    if (isset($GLOBALS["pdo_connection"])) {
        return $GLOBALS["pdo_connection"];
    }

    global $db_host, $db_name, $db_user, $db_pass;

    $dsn = "mysql:host=" . $db_host . ";dbname=" . $db_name . ";charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass);
    // Para mag-error kapag may mali sa query, hindi tahimik lang.
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Para array na may pangalan ang column ang balik, hindi numero.
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $GLOBALS["pdo_connection"] = $pdo;
    return $pdo;
}


// Ito ang ipinapadala pabalik sa JavaScript. Laging JSON.
function respond($data, $status = 200) {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($data);
    exit;
}


// Pang-error message. Ginagamit ko kapag may maling input.
function fail($message, $status = 400) {
    respond(array("success" => false, "message" => $message), $status);
}


// Sino ang naka-login ngayon? NULL kapag wala.
function currentUser() {
    if (isset($_SESSION["user"])) {
        return $_SESSION["user"];
    }
    return null;
}


// Kailangan may naka-login bago tumuloy.
function requireLogin() {
    $user = currentUser();
    if ($user == null) {
        respond(array("success" => false, "message" => "Please log in first."), 401);
    }
    return $user;
}


// Admin lang ang pwede sa mga tinatawag nito.
function requireAdmin() {
    $user = requireLogin();
    if ($user["role"] != "Admin") {
        respond(array("success" => false, "message" => "Admin access required."), 403);
    }
    return $user;
}


// Para sa mga action na pwede sa mahigit isang role.
// Halimbawa: requireRole("Admin", "Barber")
function requireRole() {
    $allowed = func_get_args();
    $user = requireLogin();

    if (!in_array($user["role"], $allowed)) {
        respond(array("success" => false, "message" => "You do not have access to this page."), 403);
    }
    return $user;
}


// Kinukuha ang barber record ng naka-login na barbero.
// Kailangan ito kasi magkaibang table ang users at barbers.
function requireBarber() {
    $user = requireRole("Barber");

    $stmt = db()->prepare("SELECT id, name FROM barbers WHERE user_id = ?");
    $stmt->execute(array($user["id"]));
    $barber = $stmt->fetch();

    if (!$barber) {
        respond(array("success" => false, "message" => "This account is not linked to a barber profile."), 403);
    }

    return array(
        "user"       => $user,
        "barberId"   => (int)$barber["id"],
        "barberName" => $barber["name"]
    );
}


// Mga settings ng shop (pangalan, oras ng bukas at sara).
// Nasa app_settings table ito para mapalitan ng admin.
function settings() {
    if (isset($GLOBALS["shop_settings"])) {
        return $GLOBALS["shop_settings"];
    }

    // Default kapag wala pa sa database.
    $result = array(
        "shop_name"  => "Supremo Barbershop",
        "open_hour"  => "8",
        "close_hour" => "20",
        "slot_hours" => "1"
    );

    $rows = db()->query("SELECT setting_key, setting_value FROM app_settings")->fetchAll();
    foreach ($rows as $row) {
        $result[$row["setting_key"]] = $row["setting_value"];
    }

    $GLOBALS["shop_settings"] = $result;
    return $result;
}


// Nililinis ang text na galing sa user (tinatanggal ang espasyo).
function text($value) {
    if ($value === null) {
        return "";
    }
    return trim((string)$value);
}
