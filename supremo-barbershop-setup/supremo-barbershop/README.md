# Supremo Barbershop — XAMPP version

Local na sistema ng barbershop gamit ang HTML, CSS, JavaScript, PHP, at MySQL.

## Tatlong role

| Role | Paano nakakakuha ng account | Ano ang kaya |
|------|------------------------------|--------------|
| **Customer** | Mag-register mag-isa sa `register.html` | Tingnan ang serbisyo, mag-book, gumamit ng promo code, magbigay ng feedback (stars + note) |
| **Barber** | **Ginagawa ng admin** sa Barbers page | Tingnan ang sariling appointments, markahan kung natuloy o no-show, maglagay ng day off |
| **Admin** | **Ginagawa lang ng ibang admin** sa Customers page | Appointments, services, barbers, promos, analytics, sales forecast, barber performance, shop settings |

> Walang self-register na admin. Kahit i-post pa nang diretso sa API, tinatanggihan ito ng server.
> Ang tanging exception ay kapag **wala pang kahit isang admin** sa database — ang unang account
> na gagawin sa register page ang magiging admin (para may makapasok sa bagong install).

## Setup

1. Kopyahin ang folder sa `htdocs` ng XAMPP mo (`D:\Xampp\htdocs\supremo-barbershop`).
2. Buksan ang XAMPP, i-start ang **Apache** at **MySQL**.
3. Pumunta sa `http://localhost/phpmyadmin`.
4. **Bagong install:** Import > `database/supremo_barbershop_import.sql`, tapos Import > `database/upgrade_v2.sql`.
5. **May database ka na:** Import > `database/upgrade_v2.sql` lang. Additive ito — walang mabuburang data.
6. Buksan ang `http://localhost/supremo-barbershop/`.

> Isang beses lang patakbuhin ang `upgrade_v2.sql`. Kapag inulit, mag-e-error ang `ALTER TABLE`
> dahil naidagdag na ang mga column.

### Sample data (opsyonal)

Ang Sales Forecast ay kailangan ng appointments sa tatlo o higit pang tapos nang buwan bago
ito makapaghula. Para may makita agad:

- Import > `database/sample_data.sql` — 73 appointment mula Marso hanggang Setyembre 2026,
  59 feedback (stars at komento), at 9 booking na gumamit ng promo code. Gumagamit lang ito ng
  mga existing na customer, service, at barbero — walang bagong account na ginagawa.
- Import > `database/remove_sample_data.sql` — binubura lahat ng ito.

Ang sample rows ay may markang `created_at = '2000-01-01 00:00:00'`, kaya ang totoong booking
na gagawin sa website ay hindi kailanman maaapektuhan ng pagbura.

## Mga page

| File | Para saan |
|------|-----------|
| `index.html` | Landing page — serbisyo, presyo, at promo (bukas sa lahat) |
| `login.html` | Iisang login para sa customer, barber, at admin |
| `register.html` | Registration ng customer (hiwalay na sa login) |
| `forgot-password.html` | Reset ng password gamit ang security question |
| `dashboard.html` | Dashboard. Nagbabago ang menu depende sa role |
| `img/logo.jpg` | Logo ng shop. Lumalabas sa header ng bawat page, sa itaas ng landing page, at bilang favicon sa tab ng browser |

## Mga JavaScript file

| File | Laman |
|------|-------|
| `js/api.js` | Pagtawag sa server, pag-format ng petsa/presyo, phone auto-format, session |
| `js/dashboard.js` | Router ng dashboard — dito nakalista ang menu ng bawat role |
| `js/account.js` | Account Settings (lahat ng role) |
| `js/customer.js` | Services, Book Appointment, My Appointments, Promos, feedback modal |
| `js/barber.js` | Overview, My Appointments, My Schedule (day off), calendar builder |
| `js/admin.js` | Lahat ng admin page kasama ang sales at customer forecast chart |
| `js/pdf.js` | Download PDF ng Sales Report (Analytics) at Sales Forecast. Kinukuha ang jsPDF sa internet kapag pinindot lang |

`api/index.php` ang isang lugar kung saan nakalagay ang lahat ng business rule.
`api/config.php` ang database connection at ang mga tseke sa role.

## Database

`database/supremo_barbershop_import.sql` — orihinal na tables at data mula sa Excel.
`database/upgrade_v2.sql` — mga bagong feature:

- `users.role` — dinagdagan ng `Barber`
- `barbers.user_id` — kabit sa login account ng barbero
- `appointments` — dinagdagan ng `price`, `discount`, `final_price`, `promo_id`, at ng status na `Completed` / `No-show`
- `barber_days_off` — day off ng barbero
- `feedback` — stars at komento (isa lang kada appointment)
- `promos` — promo code na ginagawa ng admin
- `app_settings` — pangalan ng shop at oras ng booking

## Sales forecasting

Nasa **Admin → Sales Forecast**. Gumagamit ng **linear regression (least squares)** na naka-code
mismo sa PHP — walang kailangang i-install na Python o library:

```
benta = intercept + (slope × bilang ng buwan)
```

Kinukuha ang kabuuang benta kada buwan mula sa mga natuloy na appointment, hinahanap ang linyang
pinakamalapit sa lahat ng puntong iyon, tapos ginagamit iyon para hulaan ang susunod na tatlong buwan.
Ang ipinapakitang katumpakan ay galing sa paghahambing ng hula ng modelo sa totoong benta ng
mga nakaraang buwan.

Dalawang panuntunan ang sinusunod para hindi mapeke ang resulta:

- **Tapos nang buwan lang ang ginagamit sa pag-aaral.** Ang kasalukuyang buwan ay tuloy-tuloy pa at
  ang mga paparating na booking ay hindi pa nangyayari — kapag isinama ang mga ito, mukhang bumababa
  ang benta gayong hindi naman. Ipinapakita pa rin ang kasalukuyang buwan, may markang *In progress*,
  katabi ng inaasahan ng modelo.
- **Kailangan ng tatlo o higit pang buwan na may benta.** Kapag kulang, ipinapakita ang totoong benta
  at ang paliwanag kung bakit wala pang hula — sa halip na magpakita ng ₱0.00 na parang totoong hula.

## Customer forecasting

Nasa **Admin → Customer Forecast**. Kaparehong linear regression ng Sales Forecast, pero ang
hinuhulaan ay **ilang customer ang darating sa susunod na buwan**:

- **Customers** — bawat natuloy na appointment (Approved o Completed) ay isang customer.
- **Different people** — ilang magkakaibang tao ang mga iyon (may bumabalik nang higit sa isang beses).

Pareho ang mga panuntunan: tapos nang buwan lang ang ginagamit, at kailangan ng tatlo o higit pang
buwan na may customer bago ito maghula.

## Color palette at PDF

- Iisa ang palette ng buong website: **espresso brown at ginto**. Nasa `:root` ng
  `css/style.css` ang lahat ng kulay.
- Ang **Download PDF** sa Analytics at Sales Forecast ay kailangan ng internet sa unang pindot
  (kinukuha ang jsPDF). Kailangan din ng internet para sa font (Playfair Display at Plus Jakarta Sans);
  kapag offline, ginagamit ang font ng computer.

## Mga dapat tandaan

- Gamitin ang `localhost` address. Huwag i-double click ang `index.html` — kailangang tumakbo ang PHP.
- Ang XAMPP ay karaniwang `root` na walang password. Baguhin ang `api/config.php` kung iba sa iyo.
- Ang mga lumang account mula sa Excel ay may plain na password. Sa unang matagumpay na login,
  awtomatikong pinapalitan ito ng secure na password hash.
- Password rule: **8 karakter pataas, may letra at may numero** — pareho sa browser at sa server.
- `Codes.gs` — ang orihinal na Apps Script, reference lang. Hindi na ito ginagamit.

## Kapag hindi lumalabas ang binago mo

Kapag nag-edit ka ng file sa `js/` o `css/` at parang walang nangyari sa browser,
**naka-save pa ang lumang bersyon sa cache**. Pindutin ang **Ctrl + Shift + R**
(o Ctrl + F5) para pilitin ang browser na kunin ang bagong file. Ito ang unang
dapat subukan bago mag-isip na may sira ang code.
