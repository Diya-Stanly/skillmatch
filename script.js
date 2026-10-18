const resumeInput = document.getElementById("resume-file");
const resumeText = document.getElementById("resume-text");
const jobText = document.getElementById("job-text");
const fileStatus = document.getElementById("file-status");
const dropZone = document.getElementById("drop-zone");
const analyzeButton = document.getElementById("analyze-button");
const errorMessage = document.getElementById("error-message");
const emptyState = document.getElementById("empty-state");
const report = document.getElementById("report");

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const skillTerms = [
  "python", "java", "javascript", "typescript", "c++", "c#", "sql", "html", "css",
  "react", "angular", "vue", "node.js", "express", "flask", "django", "fastapi",
  "rest api", "api", "git", "github", "linux", "docker", "kubernetes", "aws",
  "azure", "gcp", "machine learning", "deep learning", "artificial intelligence",
  "data analysis", "data visualization", "pandas", "numpy", "scikit-learn",
  "tensorflow", "pytorch", "opencv", "mediapipe", "computer vision", "nlp",
  "natural language processing", "mongodb", "postgresql", "mysql", "firebase",
  "figma", "ui/ux", "responsive design", "testing", "debugging", "agile",
  "communication", "teamwork", "problem solving", "problem-solving", "leadership",
  "project management", "excel", "power bi", "tableau", "algorithms",
  "data structures", "object-oriented programming", "oop", "cybersecurity",
  "networking", "cloud computing", "blockchain", "unity", "c"
];

const stopWords = new Set([
  "about","above","after","again","against","also","among","and","any","are","because",
  "been","before","being","below","between","both","but","can","could","did","does",
  "during","each","few","for","from","further","had","has","have","having","here",
  "how","into","its","itself","just","more","most","must","not","only","other","our",
  "out","over","own","same","should","some","such","than","that","the","their","them",
  "then","there","these","they","this","those","through","under","until","very","was",
  "were","what","when","where","which","while","who","will","with","within","would",
  "you","your","role","work","working","experience","required","requirements","skills",
  "skill","responsibilities","responsibility","candidate","candidates","ability",
  "strong","good","excellent","preferred","including","using","years","year","team",
  "teams","looking","seeking","knowledge","understanding","support","help","develop",
  "development","including","across","well","etc","must","may","new","plus","based"
]);

function updateCount(textarea, output) {
  output.textContent = `${textarea.value.length.toLocaleString()} characters`;
}
resumeText.addEventListener("input", () => updateCount(resumeText, document.getElementById("resume-count")));
jobText.addEventListener("input", () => updateCount(jobText, document.getElementById("job-count")));

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}
function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

async function readSelectedFile(file) {
  clearError();
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showError("This file is larger than 5 MB. Please choose a smaller file.");
    return;
  }
  const name = file.name.toLowerCase();
  try {
    fileStatus.textContent = `Reading ${file.name}…`;
    if (name.endsWith(".txt")) {
      resumeText.value = await file.text();
    } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
      if (!window.pdfjsLib) throw new Error("The PDF reader couldn't load. Check your internet connection, or paste the resume text instead.");
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let pagesText = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pagesText.push(content.items.map(item => item.str).join(" "));
      }
      resumeText.value = pagesText.join("\n\n");
      if (!resumeText.value.trim()) {
        throw new Error("No selectable text was found in this PDF. It may be a scanned image. Paste the resume text or use a text-based PDF.");
      }
    } else {
      throw new Error("Please select a PDF or TXT file.");
    }
    updateCount(resumeText, document.getElementById("resume-count"));
    fileStatus.textContent = `✓ Loaded ${file.name} — review the text below before analyzing.`;
  } catch (error) {
    fileStatus.textContent = "Couldn't read this file.";
    showError(error.message || "Something went wrong while reading the file. Try pasting the text instead.");
  }
}

resumeInput.addEventListener("change", () => readSelectedFile(resumeInput.files[0]));
["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});
dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];
  if (file) readSelectedFile(file);
});

function normalize(text) {
  return text.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function containsTerm(text, term) {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, "i").test(text);
}
function getKeywords(jobDescription) {
  const normalizedJob = normalize(jobDescription);
  const foundSkills = skillTerms.filter(term => containsTerm(normalizedJob, term));
  const words = normalizedJob.match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  const frequencies = new Map();
  words.forEach(word => {
    const cleaned = word.replace(/[.-]+$/, "");
    if (!cleaned || stopWords.has(cleaned) || skillTerms.includes(cleaned) || /^\d+$/.test(cleaned)) return;
    frequencies.set(cleaned, (frequencies.get(cleaned) || 0) + 1);
  });
  const customKeywords = [...frequencies.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([word]) => word);
  return [...new Set([...foundSkills, ...customKeywords])];
}
function renderChips(container, terms, emptyMessage) {
  container.replaceChildren();
  if (!terms.length) {
    const empty = document.createElement("span");
    empty.className = "no-chips";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  terms.forEach(term => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = term;
    container.appendChild(chip);
  });
}
function renderSuggestions(matched, missing, score) {
  const list = document.getElementById("suggestions-list");
  list.replaceChildren();
  const suggestions = [];
  if (missing.length) suggestions.push(`Review the ${missing.slice(0, 4).join(", ")} terms. Add them only where they accurately reflect your skills or experience.`);
  if (!/project|built|created|developed|implemented/i.test(resumeText.value)) suggestions.push("Consider describing a relevant project and what you personally built or contributed.");
  if (!/result|improved|reduced|increased|achieved|measured|%/i.test(resumeText.value)) suggestions.push("Where you can support it, add specific outcomes or measurable impact to project and experience bullets.");
  if (matched.length) suggestions.push(`Make your strongest overlap visible near the top of your resume: ${matched.slice(0, 3).join(", ")}.`);
  if (score < 40) suggestions.push("Compare the role requirements with your actual background and tailor the resume to the parts of the role that fit your experience.");
  if (!suggestions.length) suggestions.push("Review the matched terms, then proofread the resume and make sure each claim is clear and accurate.");
  suggestions.slice(0, 4).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
}

function analyze() {
  clearError();
  const resume = normalize(resumeText.value);
  const job = normalize(jobText.value);
  if (resume.length < 40) return showError("Please add more resume text before analyzing (at least 40 characters).");
  if (job.length < 40) return showError("Please paste a fuller job description (at least 40 characters).");
  const keywords = getKeywords(jobText.value);
  if (!keywords.length) return showError("I couldn't identify enough keywords. Try a more detailed job description with technical skills or repeated role-specific terms.");

  const matched = keywords.filter(term => containsTerm(resume, term));
  const missing = keywords.filter(term => !containsTerm(resume, term));
  const score = Math.round((matched.length / keywords.length) * 100);

  document.getElementById("match-score").textContent = `${score}%`;
  document.getElementById("score-ring").style.setProperty("--score", score);
  document.getElementById("matched-count").textContent = matched.length;
  document.getElementById("missing-count").textContent = missing.length;
  document.getElementById("matched-label").textContent = `${matched.length} found`;
  document.getElementById("missing-label").textContent = `${missing.length} to review`;

  let title = "A starting point";
  let description = "Use the keyword overlap as a prompt for a closer review.";
  if (score >= 75) { title = "Strong keyword overlap"; description = "Many identified terms appear in both texts. Review context and evidence, too."; }
  else if (score >= 45) { title = "Some relevant overlap"; description = "You mention several terms from the role. Review the gaps and tailor your examples."; }
  else { title = "Room to tailor"; description = "The texts share fewer identified terms. Check whether the role fits your experience before editing."; }
  document.getElementById("score-title").textContent = title;
  document.getElementById("score-description").textContent = description;

  renderChips(document.getElementById("matched-chips"), matched, "No identified keywords matched yet.");
  renderChips(document.getElementById("missing-chips"), missing, "No missing keywords from this comparison.");
  renderSuggestions(matched, missing, score);

  emptyState.hidden = true;
  report.hidden = false;
  report.scrollIntoView({ behavior: "smooth", block: "start" });
}

analyzeButton.addEventListener("click", analyze);
document.getElementById("reset-button").addEventListener("click", () => {
  resumeText.value = "";
  jobText.value = "";
  resumeInput.value = "";
  fileStatus.textContent = "No file selected yet";
  updateCount(resumeText, document.getElementById("resume-count"));
  updateCount(jobText, document.getElementById("job-count"));
  report.hidden = true;
  emptyState.hidden = false;
  clearError();
  document.querySelector(".input-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("back-top").addEventListener("click", event => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
