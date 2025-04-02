/**
 * Premiere Pro Marker Importer
 * 
 * This script imports markers into an active Premiere Pro sequence from a CSV file.
 * 
 * Expected CSV Format:
 * - First row: Header (will be skipped)
 * - First column: Timestamp (in seconds)
 * - Second column: Event/comment text
 * 
 * Usage:
 * 1. Open a sequence in Premiere Pro
 * 2. Run this script
 * 3. Select your CSV file
 * 
 * @version 1.0
 */

// Configuration
var CONFIG = {
  // File dialog settings
  fileDialogTitle: "Select CSV File with Markers",
  fileDialogFilter: "CSV Files:*.csv;All Files:*.*",

  // CSV settings
  csvDelimiter: ',',
  skipEmptyLines: true,

  // Time format settings
  defaultTimeFormat: 'seconds', // 'seconds' or 'HH:MM:SS'

  // Logging settings
  logLevel: 'info', // 'debug', 'info', 'warning', 'error'
  showDebugInfo: false
};

// Logging Utility
function log(message, type) {
  if (!type) type = 'info';

  // Skip debug messages if debug is disabled
  if (type === 'debug' && !CONFIG.showDebugInfo) {
    return;
  }

  var prefix = '';
  switch (type) {
    case 'error':
      prefix = 'ERROR: ';
      break;
    case 'warning':
      prefix = 'WARNING: ';
      break;
    case 'debug':
      prefix = 'DEBUG: ';
      break;
    default:
      prefix = 'INFO: ';
  }

  $.writeln(prefix + message);
}

// Custom trim function
function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

function readCSV(filePath) {
  var file = new File(filePath);
  if (!file.exists) {
    throw new Error("File does not exist: " + filePath);
  }

  file.open('r');
  var data = [];
  var isFirstLine = true;
  while (!file.eof) {
    var line = file.readln();
    if (isFirstLine) {
      isFirstLine = false;
      continue; // Skip the header row
    }
    if (line !== "") { // Ensure the line is not empty
      var columns = line.split(',');
      data.push(columns);
    }
  }
  file.close();
  return data;
}

function parseCSVData(data) {
  var markers = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].length >= 2) { // Ensure there are at least two columns
      // Corrected: Timestamp is in the first column, Event (comment) in the second
      var timestamp = trim(String(data[i][0])); // Get timestamp from the first column
      var comment = trim(String(data[i][1]));   // Get event description from the second column
      markers.push({ timestamp: timestamp, comment: comment });
    } else {
      alert("Skipping invalid row: " + data[i].join(", "));
    }
  }
  return markers;
}

// Time Format Utilities
function parseTimeString(timeStr) {
  // Remove any whitespace
  timeStr = trim(timeStr);

  // Try parsing as seconds first
  var seconds = parseFloat(timeStr);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Try parsing as HH:MM:SS format
  var parts = timeStr.split(':');
  if (parts.length === 3) {
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    var secs = parseFloat(parts[2]);

    if (!isNaN(hours) && !isNaN(minutes) && !isNaN(secs)) {
      return hours * 3600 + minutes * 60 + secs;
    }
  }

  throw new Error("Invalid time format: " + timeStr + ". Expected seconds or HH:MM:SS format.");
}

function insertMarkers(markers) {
  var sequence = app.project.activeSequence;
  if (!sequence) {
    throw new Error("No active sequence found.");
  }

  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i];
    var time = parseFloat(marker.timestamp); // Convert timestamp to float
    if (isNaN(time)) {
      alert("Invalid time value: " + marker.timestamp);
      continue;
    }
    var markerObj = sequence.markers.createMarker(time);
    markerObj.name = marker.comment;
  }
}

function selectCSVFile() {
  var file = File.openDialog("Select a CSV file", "CSV Files:*.csv");
  if (file !== null) {
    return file.fsName;
  }
  return null;
}

function main() {
  try {
    var filePath = selectCSVFile();
    if (!filePath) {
      throw new Error("No file selected.");
    }

    var data = readCSV(filePath);

    // Debug: Check the contents of data
    var dataString = "";
    for (var i = 0; i < data.length; i++) {
      dataString += data[i].join(", ") + "\n";
    }
    alert("CSV Data:\n" + dataString);

    // Check if data is not empty
    if (data.length > 0) {
      alert("First row of CSV: " + data[0].join(", "));
    } else {
      alert("CSV file is empty.");
    }

    var markers = parseCSVData(data);
    insertMarkers(markers);
    alert("Markers inserted successfully!");
  } catch (error) {
    alert("Error: " + error.message);
  }
}

main();
