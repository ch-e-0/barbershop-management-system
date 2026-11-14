// ============================================================
//  pdf.js
//  Ang paggawa ng PDF ng Sales Report (Analytics page) at ng
//  Sales Forecast.
//
//  Gumagamit ng jsPDF at jsPDF-AutoTable (MIT license). Hindi ko
//  sila nilo-load agad - kapag pinindot lang ang "Download PDF"
//  saka kinukuha sa internet, para hindi bumagal ang dashboard.
// ============================================================

var PDF_LIBRARIES = [
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"
];

var pdfLibraryPromise = null;


// Ang icon sa Download PDF button (Lucide, ISC license).
function downloadIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
         '<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />' +
         "</svg>";
}


function loadScript(url) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = function () {
      reject(new Error("Could not load the PDF tool. Check your internet connection and try again."));
    };
    document.head.appendChild(script);
  });
}


// Isang beses lang kinukuha. Sunod-sunod dahil kailangan muna
// ang jsPDF bago ang AutoTable.
function loadPdfLibrary() {
  if (!pdfLibraryPromise) {
    pdfLibraryPromise = loadScript(PDF_LIBRARIES[0]).then(function () {
      return loadScript(PDF_LIBRARIES[1]);
    }).catch(function (error) {
      pdfLibraryPromise = null;   // para masubukan ulit
      throw error;
    });
  }
  return pdfLibraryPromise;
}


// Walang ₱ sa built-in na font ng PDF, kaya "PHP" ang gamit.
function pdfPeso(amount) {
  var number = Number(amount) || 0;
  return "PHP " + number.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// Kinukuha ang logo bilang data URL para mailagay sa PDF.
// Kapag hindi makuha, tuloy pa rin ang PDF nang walang logo.
function loadLogoForPdf() {
  return fetch("img/logo.jpg").then(function (response) {
    return response.blob();
  }).then(function (blob) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(blob);
    });
  }).catch(function () {
    return null;
  });
}


// Ang kulay ng PDF: espresso at ginto, gaya ng website.
function pdfColors() {
  return { dark: [46, 34, 25], accent: [181, 134, 47], soft: [248, 242, 231], text: [42, 32, 23] };
}


// Bagong PDF na may header (logo, pangalan ng shop, pamagat).
// Ibinabalik ang doc at kung saang taas magsisimula ang laman.
function startPdf(title, subtitle, logo) {
  var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  var colors = pdfColors();
  var pageWidth = doc.internal.pageSize.getWidth();
  var textX = 14;

  if (logo) {
    try {
      doc.addImage(logo, "JPEG", 14, 10, 24, 24);
      textX = 43;
    } catch (error) {
      // Tuloy kahit hindi mailagay ang logo.
    }
  }

  var shopName = "Supremo Barbershop";
  if (typeof shopSettings != "undefined" && shopSettings && shopSettings.shopName) {
    shopName = shopSettings.shopName;
  }

  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(shopName, textX, 18);

  doc.setFontSize(13);
  doc.text(title, textX, 25.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(113, 113, 122);
  doc.text(subtitle + "  ·  Generated " + new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  }), textX, 31.5);

  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.setLineWidth(0.8);
  doc.line(14, 38, pageWidth - 14, 38);

  return { doc: doc, y: 46 };
}


// Pamagat ng bawat bahagi. Lumilipat ng page kapag malapit na sa dulo.
function pdfSection(doc, text, y) {
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }

  var colors = pdfColors();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(text, 14, y);

  return y + 3;
}


// Talahanayan na pare-pareho ang itsura sa buong PDF.
// rightColumns = mga column na naka-align sa kanan (numero).
function pdfTable(doc, y, head, body, rightColumns, foot) {
  var colors = pdfColors();
  var columnStyles = {};

  for (var i = 0; i < rightColumns.length; i++) {
    columnStyles[rightColumns[i]] = { halign: "right" };
  }

  var options = {
    startY: y,
    head: [head],
    body: body,
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.4, lineColor: [228, 228, 231], lineWidth: 0.2, textColor: [39, 39, 42] },
    headStyles: { fillColor: colors.dark, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: colors.soft },
    columnStyles: columnStyles,
    didParseCell: function (cell) {
      if (rightColumns.indexOf(cell.column.index) != -1) {
        cell.cell.styles.halign = "right";
      }
    }
  };

  if (foot) {
    options.foot = [foot];
    options.footStyles = { fillColor: colors.soft, textColor: colors.text, fontStyle: "bold" };
  }

  doc.autoTable(options);
  return doc.lastAutoTable.finalY + 10;
}


// Pahina X ng Y sa ibaba ng bawat page, tapos i-download.
function finishPdf(doc, fileName) {
  var pages = doc.internal.getNumberOfPages();
  var pageWidth = doc.internal.pageSize.getWidth();
  var pageHeight = doc.internal.pageSize.getHeight();

  for (var p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(161, 161, 170);
    doc.text("Page " + p + " of " + pages, pageWidth - 14, pageHeight - 8, { align: "right" });
  }

  doc.save(fileName);
}


// Pinapatakbo ang paggawa ng PDF habang naka-disable ang button.
async function runPdfJob(button, job) {
  var oldHtml = "";
  if (button) {
    oldHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = "Preparing PDF...";
  }

  try {
    await loadPdfLibrary();
    var logo = await loadLogoForPdf();
    job(logo);
    toast("PDF downloaded.", "good");
  } catch (error) {
    handleError(error);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = oldHtml;
    }
  }
}


// ------------------------------------------------------------
//  SALES REPORT (galing sa Analytics page)
// ------------------------------------------------------------

function downloadSalesReportPdf(report, button) {
  if (!report) {
    toast("Load a month first.", "bad");
    return;
  }

  return runPdfJob(button, function (logo) {
    var monthName = new Date(report.year, report.month - 1, 1).toLocaleString("en-US", { month: "long" });
    var period = monthName + " " + report.year;

    var start = startPdf("Monthly Sales Report", period, logo);
    var doc = start.doc;
    var y = start.y;

    // ----- buod -----
    var averageSale = 0;
    if (report.totalApproved > 0) {
      averageSale = report.revenue / report.totalApproved;
    }

    y = pdfSection(doc, "Summary", y);
    y = pdfTable(doc, y, ["Item", "Value"], [
      ["Total revenue", pdfPeso(report.revenue)],
      ["Appointments that pushed through", String(report.totalApproved)],
      ["Cancelled / No-show", String(report.totalCancelled)],
      ["Average sale per appointment", pdfPeso(averageSale)],
      ["Most requested service", (report.mostService.name || "-") + " (" + (report.mostService.count || 0) + ")"],
      ["Least requested service", (report.leastService.name || "-") + " (" + (report.leastService.count || 0) + ")"]
    ], [1]);

    // ----- benta kada araw -----
    var dayKeys = Object.keys(report.days).sort();
    var dayRows = [];

    for (var i = 0; i < dayKeys.length; i++) {
      var day = report.days[dayKeys[i]];
      var parts = dayKeys[i].split("-");
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

      dayRows.push([
        date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        date.toLocaleDateString("en-US", { weekday: "short" }),
        String(day.approved || 0),
        String(day.cancelled || 0),
        pdfPeso(day.revenue || 0)
      ]);
    }

    y = pdfSection(doc, "Daily sales", y);

    if (dayRows.length == 0) {
      y = pdfTable(doc, y, ["Date", "Day", "Pushed through", "Cancelled / No-show", "Revenue"],
                   [[{ content: "No appointments this month.", colSpan: 5 }]], []);
    } else {
      y = pdfTable(doc, y, ["Date", "Day", "Pushed through", "Cancelled / No-show", "Revenue"], dayRows, [2, 3, 4],
                   ["Total", "", String(report.totalApproved), String(report.totalCancelled), pdfPeso(report.revenue)]);
    }

    // ----- benta kada barbero -----
    var barberRows = [];
    for (var barberName in report.barberStats) {
      var b = report.barberStats[barberName];
      barberRows.push([barberName, b.topService || "-", String(b.approved || 0), String(b.total || 0), pdfPeso(b.revenue || 0)]);
    }

    if (barberRows.length > 0) {
      y = pdfSection(doc, "Sales by barber", y);
      y = pdfTable(doc, y, ["Barber", "Top service", "Pushed through", "Total", "Revenue"], barberRows, [2, 3, 4]);
    }

    // ----- serbisyo -----
    var serviceRows = [];
    for (var serviceName in report.serviceStats) {
      var s = report.serviceStats[serviceName];
      serviceRows.push([serviceName, s.topBarber || "-", String(s.total || 0)]);
    }

    if (serviceRows.length > 0) {
      y = pdfSection(doc, "Services performed", y);
      y = pdfTable(doc, y, ["Service", "Top barber", "Times done"], serviceRows, [2]);
    }

    finishPdf(doc, "sales-report-" + report.year + "-" + pad2(report.month) + ".pdf");
  });
}


// ------------------------------------------------------------
//  SALES FORECAST
// ------------------------------------------------------------

function downloadSalesForecastPdf(result, button) {
  if (!result || !result.success) {
    toast("There is no forecast to download yet.", "bad");
    return;
  }

  return runPdfJob(button, function (logo) {
    var model = result.model;
    var current = result.currentMonth;
    var next = result.forecast[0];

    var start = startPdf("Sales Forecast Report", "Linear regression on " + model.monthsUsed + " months of sales", logo);
    var doc = start.doc;
    var y = start.y;

    var accuracy = "-";
    if (model.accuracy !== null) {
      accuracy = model.accuracy + "%";
    }

    var slopeSign = "";
    if (model.slope >= 0) {
      slopeSign = "+";
    }

    y = pdfSection(doc, "Summary", y);
    y = pdfTable(doc, y, ["Item", "Value"], [
      ["Forecast for " + next.label, pdfPeso(next.predicted)],
      ["Expected range", pdfPeso(next.low) + " - " + pdfPeso(next.high)],
      ["Sales trend", model.direction + " (" + slopeSign + pdfPeso(model.slope) + " per month)"],
      ["Model accuracy", accuracy],
      ["Average monthly sales", pdfPeso(model.average)],
      [current.label + " so far (in progress)", pdfPeso(current.revenue) + " from " + current.bookings + " bookings"]
    ], [1]);

    var forecastRows = [];
    for (var i = 0; i < result.forecast.length; i++) {
      var f = result.forecast[i];
      forecastRows.push([f.label, pdfPeso(f.low), pdfPeso(f.predicted), pdfPeso(f.high)]);
    }

    y = pdfSection(doc, "Forecast", y);
    y = pdfTable(doc, y, ["Month", "Lowest", "Forecast", "Highest"], forecastRows, [1, 2, 3]);

    var historyRows = [];
    var allMonths = result.history.concat([current]);
    for (var j = 0; j < allMonths.length; j++) {
      var h = allMonths[j];
      var label = h.label;
      if (h.partial) {
        label += " (in progress)";
      }
      historyRows.push([label, String(h.bookings), pdfPeso(h.revenue), pdfPeso(h.trend)]);
    }

    y = pdfSection(doc, "Sales history", y);
    y = pdfTable(doc, y, ["Month", "Bookings", "Actual sales", "Model line"], historyRows, [1, 2, 3]);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(doc.splitTextToSize(
      "The current month is still in progress, so it is not used to train the model. " +
      "The range is based on the model's average error on past months.", 182), 14, y);

    finishPdf(doc, "sales-forecast-" + current.month + ".pdf");
  });
}
