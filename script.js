import { books, authors } from "./data.js";

// DOM elements
const bookSelect = document.getElementById("bookSelect");
const authorSelect = document.getElementById("authorSelect");
const buildBtn = document.getElementById("buildBtn");
const status = document.getElementById("status");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// Initialize dropdowns
function initializeDropdowns() {
  // Populate book select
  Object.keys(books).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key.toUpperCase();
    bookSelect.appendChild(option);
  });

  // Populate author select
  authors.forEach(author => {
    const option = document.createElement("option");
    option.value = author;
    option.textContent = author.charAt(0).toUpperCase() + author.slice(1);
    authorSelect.appendChild(option);
  });
}

// Update status
function updateStatus(message, type = "") {
  status.textContent = message;
  status.className = `status ${type}`;
}

// Update progress
function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `Processing ${current} of ${total} items...`;
}

// Fetch sutta data from API
async function fetchSuttaData(uid) {
  try {
    const response = await fetch(`https://suttacentral.net/api/suttaplex/${uid}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching data for ${uid}:`, error);
    return null;
  }
}

// Check if author exists in translations
function authorExistsInTranslations(translations, targetAuthor) {
  if (!translations || !Array.isArray(translations)) {
    return false;
  }
  return translations.some(translation => translation.author_uid && translation.author_uid.toLowerCase() === targetAuthor.toLowerCase());
}

// Convert array to CSV
function arrayToCSV(data) {
  return data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// Download CSV file
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Main build function
async function buildCSV() {
  const selectedBook = bookSelect.value;
  const selectedAuthor = authorSelect.value;

  if (!selectedBook || !selectedAuthor) {
    updateStatus("Please select both a book collection and an author.", "error");
    return;
  }

  const uids = books[selectedBook];
  const csvData = [["UID", "Author_Available"]]; // Header row

  buildBtn.disabled = true;
  progressContainer.style.display = "block";
  updateStatus("Processing suttas...", "loading");

  try {
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      updateProgress(i + 1, uids.length);

      const suttaData = await fetchSuttaData(uid);

      let authorAvailable = false;
      if (suttaData && suttaData.length > 0) {
        const translations = suttaData[0].translations;
        authorAvailable = authorExistsInTranslations(translations, selectedAuthor);
      }

      csvData.push([uid, authorAvailable]);

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Generate and download CSV
    const csvContent = arrayToCSV(csvData);
    const filename = `${selectedBook}_${selectedAuthor}_translations.csv`;
    downloadCSV(csvContent, filename);

    updateStatus(`CSV file "${filename}" has been downloaded successfully!`, "success");
  } catch (error) {
    console.error("Error building CSV:", error);
    updateStatus("An error occurred while building the CSV. Please try again.", "error");
  } finally {
    buildBtn.disabled = false;
    progressContainer.style.display = "none";
  }
}

// Event listeners
document.getElementById("csvForm").addEventListener("submit", function (e) {
  e.preventDefault();
  buildCSV();
});

// Initialize the app
initializeDropdowns();
updateStatus("Select a book collection and author to begin.");
