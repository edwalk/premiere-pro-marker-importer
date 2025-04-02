/**
 * Premiere Pro Marker Importer
 * 
 * This script imports markers into an active Premiere Pro sequence from a CSV file.
 * 
 * Expected CSV Format:
 * - First row: Header (will be skipped)
 * - First column: Timestamp (in seconds or HH:MM:SS format)
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

  try {
    file.open('r');
    var data = [];
    var isFirstLine = true;
    var lineNumber = 0;

    while (!file.eof) {
      lineNumber++;
      var line = file.readln();

      // Skip empty lines
      if (!line || trim(line) === "") {
        continue;
      }

      // Split the line and clean up each column
      var columns = line.split(',').map(function (col) {
        return trim(col.replace(/^["']|["']$/g, '')); // Remove quotes if present
      });

      if (isFirstLine) {
        // Validate header
        if (columns.length < 2) {
          throw new Error("CSV header must contain at least two columns: Timestamp and Comment");
        }
        isFirstLine = false;
        continue;
      }

      // Validate data row
      if (columns.length < 2) {
        log("Warning: Line " + lineNumber + " is missing required columns. Skipping.", 'warning');
        continue;
      }

      data.push(columns);
    }

    return data;
  } finally {
    file.close();
  }
}

function parseCSVData(data) {
  var markers = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var timestamp = row[0];
    var comment = row[1];

    // Skip if timestamp is empty
    if (!timestamp) {
      log("Warning: Empty timestamp at row " + (i + 2) + ". Skipping.", 'warning');
      continue;
    }

    // Skip if comment is empty
    if (!comment) {
      log("Warning: Empty comment at row " + (i + 2) + ". Skipping.", 'warning');
      continue;
    }

    markers.push({
      timestamp: timestamp,
      comment: comment
    });
  }

  if (markers.length === 0) {
    throw new Error("No valid markers found in the CSV file");
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

  var insertedCount = 0;
  var skippedCount = 0;

  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i];
    try {
      var time = parseTimeString(marker.timestamp);
      var markerObj = sequence.markers.createMarker(time);
      markerObj.name = marker.comment;
      insertedCount++;
    } catch (error) {
      log("Failed to insert marker at row " + (i + 2) + ": " + error.message, 'warning');
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    log(skippedCount + " markers were skipped due to errors.", 'warning');
  }

  return {
    inserted: insertedCount,
    skipped: skippedCount
  };
}

function selectCSVFile() {
  var file = File.openDialog(CONFIG.fileDialogTitle, CONFIG.fileDialogFilter);
  if (file !== null) {
    log("Selected file: " + file.fsName, 'debug');
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

    log("Processing file: " + filePath);
    var data = readCSV(filePath);

    if (data.length === 0) {
      throw new Error("CSV file is empty or contains no valid data.");
    }

    var markers = parseCSVData(data);
    var result = insertMarkers(markers);
    log("Successfully imported " + result.inserted + " markers. " + result.skipped + " were skipped.", 'info');
  } catch (error) {
    log(error.message, 'error');
  }
}

main();
