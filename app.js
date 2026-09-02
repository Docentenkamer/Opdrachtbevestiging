function value(id, fallback = "-") {
  const val = document.getElementById(id).value.trim();
  return val || fallback;
}


function formatTarief(value) {
  if (!value || value === "-") return "-";

  let clean = value
    .replace("€", "")
    .replace("excl. btw", "")
    .trim();

  return `€${clean} excl. btw`;
}


function updatePreview() {

  const naam = value("naam", "...");
  const functie = value("functie");
  const school = value("school");
  const plaats = value("plaats");
  const adres = value("adres");
  const datum = value("datum");

  const starttijd = value("starttijd", "");
  const eindtijd = value("eindtijd", "");

  let werktijden = "-";

  if (starttijd && eindtijd) {
    werktijden = `${starttijd} – ${eindtijd}`;
  }

  const urenRaw = value("uren");
  const uren =
    urenRaw === "-"
      ? "-"
      : `${urenRaw} uur`;

  const tarief = formatTarief(value("tarief"));

  const contactpersoon = value("contactpersoon");
  const website = value("website");


  document.getElementById("p-naam").textContent = naam;

  document.getElementById("p-functie").textContent =
    functie;

  document.getElementById("p-school").textContent =
    school;

  document.getElementById("p-school-intro").textContent =
    school;

  document.getElementById("p-plaats").textContent =
    plaats;

  document.getElementById("p-adres").textContent =
    adres;

  document.getElementById("p-datum").textContent =
    datum;

  document.getElementById("p-werktijden").textContent =
    werktijden;

  document.getElementById("p-uren").textContent =
    uren;

  document.getElementById("p-tarief").textContent =
    tarief;

  document.getElementById("p-contactpersoon").textContent =
    contactpersoon;

  document.getElementById("p-website").textContent =
    website;
}


function setCurrentDate() {

  const date = new Date();

  const formatted = new Intl.DateTimeFormat(
    "nl-NL",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);

  document.getElementById("p-vandaag").textContent =
    formatted;
}


function downloadPDF() {

  updatePreview();

  const element =
    document.getElementById("pdf-document");

  let naam =
    document.getElementById("naam").value.trim();

  if (!naam) {
    naam = "opdracht";
  }

  const filename =
    `opdrachtbevestiging-${naam
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`;


  const options = {

    margin: 0,

    filename: filename,

    image: {
      type: "jpeg",
      quality: 0.98
    },

    html2canvas: {
      scale: 2,
      useCORS: true
    },

    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    },

    pagebreak: {
      mode: ["avoid-all"]
    }

  };


  html2pdf()
    .set(options)
    .from(element)
    .save();
}


document.querySelectorAll(
  "input, textarea"
).forEach(element => {

  element.addEventListener(
    "input",
    updatePreview
  );

});


setCurrentDate();
updatePreview();
