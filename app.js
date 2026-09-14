/* =========================================================
   MONDAY
   ========================================================= */

const monday = window.mondaySdk();

const SCHOOLS_BOARD_ID = 5092598441;

const SCHOOL_COLUMNS = {
  address: "location_mm1gvbxd",
  contact: "text_mm1g37d1",
  website: "company_domain"
};

let schools = [];
let selectedSchool = null;


/* =========================================================
   HULPFUNCTIES
   ========================================================= */

function getInputValue(id, fallback = "-") {
  const element = document.getElementById(id);

  if (!element) {
    return fallback;
  }

  const value = element.value.trim();

  return value || fallback;
}


function formatTarief(value) {
  if (!value || value === "-") {
    return "-";
  }

  const clean = value
    .replace("€", "")
    .replace(/excl\.?\s*btw/gi, "")
    .trim();

  return `€${clean} excl. btw`;
}


function extractPlace(address) {
  if (!address) {
    return "";
  }

  const postcodeMatch = address.match(
    /\b\d{4}\s?[A-Z]{2}\s*,?\s*(.+)$/i
  );

  if (postcodeMatch && postcodeMatch[1]) {
    return postcodeMatch[1]
      .replace(/^,\s*/, "")
      .trim();
  }

  const parts = address
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts[parts.length - 1];
  }

  return "";
}


function mapColumnValues(columnValues) {
  const mapped = {};

  columnValues.forEach(column => {
    mapped[column.id] = column;
  });

  return mapped;
}


function getColumnText(column) {
  if (!column) {
    return "";
  }

  if (column.text && column.text.trim()) {
    return column.text.trim();
  }

  if (column.value) {
    try {
      const parsed = JSON.parse(column.value);

      if (parsed.address) {
        return parsed.address;
      }

      if (parsed.url) {
        return parsed.url;
      }

      if (parsed.text) {
        return parsed.text;
      }

    } catch (error) {
      if (typeof column.value === "string") {
        return column.value
          .replace(/^"|"$/g, "")
          .trim();
      }
    }
  }

  return "";
}


function getWebsite(column) {
  if (!column) {
    return "";
  }

  if (column.value) {
    try {
      const parsed = JSON.parse(column.value);

      if (parsed.url) {
        return parsed.url;
      }

    } catch (error) {
      // Gebruik text als fallback
    }
  }

  return column.text
    ? column.text.trim()
    : "";
}


/* =========================================================
   SCHOLEN LADEN
   ========================================================= */

async function loadSchools() {

  const input =
    document.getElementById("school-search");

  const datalist =
    document.getElementById("schools-list");

  if (!input || !datalist) {
    console.error("Schoolvelden niet gevonden.");
    return;
  }

  input.disabled = true;
  input.placeholder = "Scholen laden...";

  const query = `
    query {
      boards(ids: [${SCHOOLS_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(
              ids: [
                "${SCHOOL_COLUMNS.address}",
                "${SCHOOL_COLUMNS.contact}",
                "${SCHOOL_COLUMNS.website}"
              ]
            ) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  try {

    const response =
      await monday.api(query);

    if (
      response.errors &&
      response.errors.length > 0
    ) {
      throw new Error(
        response.errors[0].message
      );
    }

    const items =
      response?.data
        ?.boards?.[0]
        ?.items_page
        ?.items || [];

    schools = items.map(item => {

      const columns =
        mapColumnValues(
          item.column_values || []
        );

      const address =
        getColumnText(
          columns[SCHOOL_COLUMNS.address]
        );

      const contact =
        getColumnText(
          columns[SCHOOL_COLUMNS.contact]
        );

      const website =
        getWebsite(
          columns[SCHOOL_COLUMNS.website]
        );

      return {
        id: String(item.id),
        name: item.name || "",
        address: address,
        place: extractPlace(address),
        contact: contact,
        website: website
      };

    });


    schools = schools
      .filter(school => school.name)
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "nl",
            {
              sensitivity: "base"
            }
          )
      );


    /* Dropdown vullen */

    datalist.innerHTML = "";

    schools.forEach(school => {

      const option =
        document.createElement("option");

      option.value = school.name;

      if (school.address) {
        option.label = school.address;
      }

      datalist.appendChild(option);

    });


    input.disabled = false;

    input.placeholder =
      "Typ de naam van een school...";


    console.log(
      `${schools.length} scholen geladen.`
    );

  } catch (error) {

    console.error(
      "Scholen konden niet worden geladen:",
      error
    );

    input.disabled = true;

    input.placeholder =
      "Scholen konden niet worden geladen";

  }
}


/* =========================================================
   SCHOOL SELECTEREN
   ========================================================= */

function handleSchoolInput() {

  const schoolInput =
    document.getElementById("school-search");

  if (!schoolInput) {
    return;
  }

  const typedName =
    schoolInput.value.trim();


  selectedSchool =
    schools.find(
      school =>
        school.name.toLowerCase() ===
        typedName.toLowerCase()
    ) || null;


  if (selectedSchool) {
    updateSchoolInfo();
  } else {
    clearSchoolInfo();
  }


  updatePreview();
}


/* =========================================================
   SCHOOLINFO
   ========================================================= */

function clearSchoolInfo() {

  const address =
    document.getElementById(
      "school-adres"
    );

  const contact =
    document.getElementById(
      "school-contactpersoon"
    );

  const website =
    document.getElementById(
      "school-website"
    );

  if (address) {
    address.textContent = "—";
  }

  if (contact) {
    contact.textContent = "—";
  }

  if (website) {
    website.textContent = "—";
  }
}


function updateSchoolInfo() {

  const address =
    document.getElementById(
      "school-adres"
    );

  const contact =
    document.getElementById(
      "school-contactpersoon"
    );

  const website =
    document.getElementById(
      "school-website"
    );

  if (address) {
    address.textContent =
      selectedSchool?.address || "—";
  }

  if (contact) {
    contact.textContent =
      selectedSchool?.contact || "—";
  }

  if (website) {
    website.textContent =
      selectedSchool?.website || "—";
  }
}


/* =========================================================
   PDF PREVIEW
   ========================================================= */

function updatePreview() {

  const naam =
    getInputValue("naam", "...");

  const functie =
    getInputValue("functie");


  const typedSchool =
    document
      .getElementById("school-search")
      ?.value
      ?.trim() || "";


  const school =
    selectedSchool?.name ||
    typedSchool ||
    "...";


  const adres =
    selectedSchool?.address || "-";

  const plaats =
    selectedSchool?.place || "...";

  const contactpersoon =
    selectedSchool?.contact || "-";

  const website =
    selectedSchool?.website || "-";


  const datum =
    getInputValue("datum");


  const starttijd =
    getInputValue(
      "starttijd",
      ""
    );

  const eindtijd =
    getInputValue(
      "eindtijd",
      ""
    );


  let werktijden = "-";

  if (starttijd && eindtijd) {
    werktijden =
      `${starttijd} – ${eindtijd}`;
  }


  const urenRaw =
    getInputValue("uren");

  const uren =
    urenRaw === "-"
      ? "-"
      : `${urenRaw} uur`;


  const tarief =
    formatTarief(
      getInputValue("tarief")
    );


  const setText = (id, value) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };


  setText("p-naam", naam);
  setText("p-functie", functie);
  setText("p-school", school);
  setText("p-school-intro", school);
  setText("p-plaats", plaats);
  setText("p-adres", adres);
  setText("p-datum", datum);
  setText("p-werktijden", werktijden);
  setText("p-uren", uren);
  setText("p-tarief", tarief);
  setText("p-contactpersoon", contactpersoon);
  setText("p-website", website);
}


/* =========================================================
   DATUM VAN VANDAAG
   ========================================================= */

function setCurrentDate() {

  const formatted =
    new Intl.DateTimeFormat(
      "nl-NL",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(
      new Date()
    );


  const element =
    document.getElementById(
      "p-vandaag"
    );

  if (element) {
    element.textContent = formatted;
  }
}


/* =========================================================
   BESTANDSNAAM
   ========================================================= */

function createSafeFilename(text) {

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}


/* =========================================================
   PDF DOWNLOADEN
   ========================================================= */

async function downloadPDF() {

  try {

    /* Preview eerst volledig bijwerken */
    updatePreview();


    /* Controleren of html2pdf beschikbaar is */

    if (typeof html2pdf === "undefined") {

      console.error(
        "html2pdf is niet geladen."
      );

      alert(
        "De PDF-module is nog niet geladen. Vernieuw de pagina en probeer het opnieuw."
      );

      return;
    }


    /* PDF-element ophalen */

    const element =
      document.getElementById(
        "pdf-document"
      );


    if (!element) {

      console.error(
        'Element met id "pdf-document" niet gevonden.'
      );

      alert(
        "De PDF kon niet worden gemaakt omdat het document niet gevonden werd."
      );

      return;
    }


    /* Naam ophalen */

    let naam =
      document
        .getElementById("naam")
        ?.value
        ?.trim();


    if (!naam) {
      naam = "opdracht";
    }


    const safeName =
      createSafeFilename(naam) ||
      "opdracht";


    const filename =
      `opdrachtbevestiging-${safeName}.pdf`;


    /* Even wachten zodat afbeeldingen/fonts
       volledig zijn verwerkt */

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }


    /* PDF-instellingen */

    const options = {

      margin: 0,

      filename: filename,

      image: {
        type: "jpeg",
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff"
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },

      pagebreak: {
        mode: [
          "avoid-all",
          "css",
          "legacy"
        ]
      }

    };


    console.log(
      "PDF wordt gegenereerd:",
      filename
    );


    /* PDF genereren */

    await html2pdf()
      .set(options)
      .from(element)
      .save();


    console.log(
      "PDF succesvol gegenereerd."
    );


  } catch (error) {

    console.error(
      "Fout bij PDF genereren:",
      error
    );

    alert(
      "Er is iets misgegaan bij het maken van de PDF. Bekijk eventueel de browserconsole voor meer informatie."
    );

  }
}


/* =========================================================
   DOWNLOADKNOP KOPPELEN
   ========================================================= */

function setupDownloadButton() {

  /*
   * We proberen meerdere mogelijke ID's.
   * Zo is de code wat robuuster als de knop
   * bijvoorbeeld "download-pdf" of "downloadPDF" heet.
   */

  const button =
    document.getElementById("download-pdf") ||
    document.getElementById("downloadPDF") ||
    document.getElementById("download-pdf-button");


  if (!button) {

    console.warn(
      "PDF-downloadknop niet gevonden. Controleer het id van de knop in index.html."
    );

    return;
  }


  /*
   * Voorkom dat de knop een formulier submit
   * en daardoor de pagina opnieuw laadt.
   */

  button.type = "button";


  button.addEventListener(
    "click",
    downloadPDF
  );


  console.log(
    "PDF-downloadknop gekoppeld."
  );
}


/* =========================================================
   APP START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    setCurrentDate();

    clearSchoolInfo();

    updatePreview();


    const schoolInput =
      document.getElementById(
        "school-search"
      );


    if (schoolInput) {

      schoolInput.addEventListener(
        "input",
        handleSchoolInput
      );


      schoolInput.addEventListener(
        "change",
        handleSchoolInput
      );

    }


    document
      .querySelectorAll(
        "input, textarea"
      )
      .forEach(element => {

        if (
          element.id ===
          "school-search"
        ) {
          return;
        }


        element.addEventListener(
          "input",
          updatePreview
        );

      });


    /*
     * PDF-knop koppelen
     */
    setupDownloadButton();


    /*
     * Scholen uit monday laden
     */
    await loadSchools();

  }
);
