/* =========================================================
   MONDAY.COM
   ========================================================= */

const monday = window.mondaySdk();


/* =========================================================
   JOUW SCHOLENBORD
   ========================================================= */

const SCHOOLS_BOARD_ID = 5092598441;

const SCHOOL_COLUMNS = {
  address: "location_mm1gvbxd",
  contact: "text_mm1g37d1",
  website: "company_domain"
};


/* =========================================================
   VARIABELEN
   ========================================================= */

let schools = [];
let selectedSchool = null;


/* =========================================================
   ALGEMENE HULPFUNCTIES
   ========================================================= */

function getInputValue(id, fallback = "-") {

  const element = document.getElementById(id);

  if (!element) {
    return fallback;
  }

  const value = element.value.trim();

  return value || fallback;
}


/* =========================================================
   TARIEF OPMAKEN
   ========================================================= */

function formatTarief(value) {

  if (!value || value === "-") {
    return "-";
  }

  let clean = value
    .replace("€", "")
    .replace(/excl\.?\s*btw/gi, "")
    .trim();

  return `€${clean} excl. btw`;
}


/* =========================================================
   PLAATS UIT ADRES HALEN
   ========================================================= */

function extractPlace(address) {

  if (!address) {
    return "";
  }

  /*
   Voorbeeld:
   Erasmusplein 1, 3132 EL, Vlaardingen
   */

  const postcodeMatch = address.match(
    /\b\d{4}\s?[A-Z]{2}\s*,?\s*(.+)$/i
  );

  if (
    postcodeMatch &&
    postcodeMatch[1]
  ) {

    return postcodeMatch[1]
      .replace(/^,\s*/, "")
      .trim();

  }

  /*
   Fallback:
   laatste gedeelte na een komma.
   */

  const parts = address
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts[parts.length - 1];
  }

  return "";
}


/* =========================================================
   MONDAY COLUMN VALUES OMZETTEN
   ========================================================= */

function mapColumnValues(columnValues) {

  const mapped = {};

  columnValues.forEach(column => {
    mapped[column.id] = column;
  });

  return mapped;
}


/* =========================================================
   TEKST UIT MONDAY-KOLOM HALEN
   ========================================================= */

function getColumnText(column) {

  if (!column) {
    return "";
  }

  if (
    column.text &&
    column.text.trim()
  ) {
    return column.text.trim();
  }

  if (column.value) {

    try {

      const parsed = JSON.parse(column.value);

      /*
       Location-kolom
       */

      if (parsed.address) {
        return parsed.address;
      }

      /*
       Link-kolom
       */

      if (parsed.url) {
        return parsed.url;
      }

      /*
       Tekst
       */

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


/* =========================================================
   WEBSITE UIT MONDAY HALEN
   ========================================================= */

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
      // Geen probleem.
    }

  }

  return column.text
    ? column.text.trim()
    : "";
}


/* =========================================================
   SCHOLEN UIT MONDAY LADEN
   ========================================================= */

async function loadSchools() {

  const searchInput =
    document.getElementById("school-search");

  if (!searchInput) {
    console.error(
      "School zoekveld niet gevonden in index.html"
    );
    return;
  }

  searchInput.placeholder =
    "Scholen laden...";

  searchInput.disabled = true;


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

      console.error(
        "Monday API fout:",
        response.errors
      );

      throw new Error(
        response.errors[0].message
      );

    }


    const items =
      response
        ?.data
        ?.boards
        ?.[0]
        ?.items_page
        ?.items || [];


    schools = items.map(item => {

      const columns =
        mapColumnValues(
          item.column_values || []
        );


      const address =
        getColumnText(
          columns[
            SCHOOL_COLUMNS.address
          ]
        );


      const contact =
        getColumnText(
          columns[
            SCHOOL_COLUMNS.contact
          ]
        );


      const website =
        getWebsite(
          columns[
            SCHOOL_COLUMNS.website
          ]
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


    /*
     Items zonder naam verwijderen.
     */

    schools =
      schools.filter(
        school =>
          school.name &&
          school.name.trim()
      );


    /*
     Alfabetisch sorteren.
     */

    schools.sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "nl",
          {
            sensitivity: "base"
          }
        )
    );


    searchInput.disabled = false;

    searchInput.placeholder =
      "Typ de naam van een school...";


    console.log(
      `${schools.length} scholen geladen.`,
      schools
    );


  } catch (error) {

    console.error(
      "Scholen konden niet worden geladen:",
      error
    );


    searchInput.disabled = true;

    searchInput.placeholder =
      "Scholen konden niet worden geladen";

  }

}


/* =========================================================
   SCHOOL ZOEKRESULTATEN TONEN
   ========================================================= */

function showSchoolResults(searchTerm = "") {

  const resultsContainer =
    document.getElementById(
      "school-results"
    );


  if (!resultsContainer) {
    return;
  }


  const term =
    searchTerm
      .trim()
      .toLowerCase();


  /*
   Zoeken op:
   - schoolnaam
   - adres
   - plaats
   */

  let matches =
    schools.filter(school => {

      const searchableText = `
        ${school.name}
        ${school.address}
        ${school.place}
      `.toLowerCase();

      return searchableText.includes(term);

    });


  /*
   Maximaal 10 resultaten tegelijk.
   */

  matches =
    matches.slice(0, 10);


  resultsContainer.innerHTML = "";


  if (matches.length === 0) {

    const noResults =
      document.createElement("div");

    noResults.className =
      "school-no-results";

    noResults.textContent =
      "Geen scholen gevonden";

    resultsContainer.appendChild(
      noResults
    );

    resultsContainer.classList.add(
      "visible"
    );

    return;

  }


  matches.forEach(school => {

    const result =
      document.createElement("div");

    result.className =
      "school-result";


    const name =
      document.createElement("div");

    name.className =
      "school-result-name";

    name.textContent =
      school.name;


    result.appendChild(name);


    /*
     Adres als tweede regel tonen.
     */

    if (school.address) {

      const address =
        document.createElement("div");

      address.className =
        "school-result-address";

      address.textContent =
        school.address;

      result.appendChild(address);

    }


    result.addEventListener(
      "click",
      () => {

        selectSchool(school);

      }
    );


    resultsContainer.appendChild(
      result
    );

  });


  resultsContainer.classList.add(
    "visible"
  );

}


/* =========================================================
   SCHOOL SELECTEREN
   ========================================================= */

function selectSchool(school) {

  selectedSchool = school;


  const searchInput =
    document.getElementById(
      "school-search"
    );


  searchInput.value =
    school.name;


  hideSchoolResults();

  updateSchoolInfo();

  updatePreview();

}


/* =========================================================
   SCHOOLRESULTATEN VERBERGEN
   ========================================================= */

function hideSchoolResults() {

  const resultsContainer =
    document.getElementById(
      "school-results"
    );


  if (resultsContainer) {

    resultsContainer.classList.remove(
      "visible"
    );

  }

}


/* =========================================================
   VERWERKEN WAT GEBRUIKER TYpt
   ========================================================= */

function handleSchoolSearch() {

  const searchInput =
    document.getElementById(
      "school-search"
    );


  const typedValue =
    searchInput.value.trim();


  /*
   Als iemand na het selecteren weer gaat typen,
   verbreken we de bestaande selectie.
   */

  if (
    selectedSchool &&
    typedValue !== selectedSchool.name
  ) {

    selectedSchool = null;

    clearSchoolInfo();

  }


  showSchoolResults(
    typedValue
  );


  updatePreview();

}


/* =========================================================
   SCHOOLINFO LEEGMAKEN
   ========================================================= */

function clearSchoolInfo() {

  document.getElementById(
    "school-adres"
  ).textContent = "—";


  document.getElementById(
    "school-contactpersoon"
  ).textContent = "—";


  document.getElementById(
    "school-website"
  ).textContent = "—";

}


/* =========================================================
   SCHOOLINFO TONEN
   ========================================================= */

function updateSchoolInfo() {

  const address =
    selectedSchool
      ?.address || "—";


  const contact =
    selectedSchool
      ?.contact || "—";


  const website =
    selectedSchool
      ?.website || "—";


  document.getElementById(
    "school-adres"
  ).textContent =
    address;


  document.getElementById(
    "school-contactpersoon"
  ).textContent =
    contact;


  document.getElementById(
    "school-website"
  ).textContent =
    website;

}


/* =========================================================
   PDF PREVIEW BIJWERKEN
   ========================================================= */

function updatePreview() {

  const naam =
    getInputValue(
      "naam",
      "..."
    );


  const functie =
    getInputValue(
      "functie"
    );


  /*
   Als er een school geselecteerd is,
   gebruiken we de monday-gegevens.

   Als iemand alleen iets heeft getypt,
   tonen we die tekst als schoolnaam.
   */

  const typedSchoolName =
    document
      .getElementById(
        "school-search"
      )
      ?.value
      ?.trim() || "";


  const school =
    selectedSchool
      ?.name ||
      typedSchoolName ||
      "...";


  const adres =
    selectedSchool
      ?.address || "-";


  const plaats =
    selectedSchool
      ?.place || "...";


  const contactpersoon =
    selectedSchool
      ?.contact || "-";


  const website =
    selectedSchool
      ?.website || "-";


  const datum =
    getInputValue(
      "datum"
    );


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


  if (
    starttijd &&
    eindtijd
  ) {

    werktijden =
      `${starttijd} – ${eindtijd}`;

  }


  const urenRaw =
    getInputValue(
      "uren"
    );


  const uren =
    urenRaw === "-"
      ? "-"
      : `${urenRaw} uur`;


  const tarief =
    formatTarief(
      getInputValue(
        "tarief"
      )
    );


  document.getElementById(
    "p-naam"
  ).textContent =
    naam;


  document.getElementById(
    "p-functie"
  ).textContent =
    functie;


  document.getElementById(
    "p-school"
  ).textContent =
    school;


  document.getElementById(
    "p-school-intro"
  ).textContent =
    school;


  document.getElementById(
    "p-plaats"
  ).textContent =
    plaats;


  document.getElementById(
    "p-adres"
  ).textContent =
    adres;


  document.getElementById(
    "p-datum"
  ).textContent =
    datum;


  document.getElementById(
    "p-werktijden"
  ).textContent =
    werktijden;


  document.getElementById(
    "p-uren"
  ).textContent =
    uren;


  document.getElementById(
    "p-tarief"
  ).textContent =
    tarief;


  document.getElementById(
    "p-contactpersoon"
  ).textContent =
    contactpersoon;


  document.getElementById(
    "p-website"
  ).textContent =
    website;

}


/* =========================================================
   DATUM VAN VANDAAG
   ========================================================= */

function setCurrentDate() {

  const today =
    new Date();


  const formattedDate =
    new Intl.DateTimeFormat(
      "nl-NL",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(today);


  document.getElementById(
    "p-vandaag"
  ).textContent =
    formattedDate;

}


/* =========================================================
   BESTANDSNAAM OPSCHONEN
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

function downloadPDF() {

  updatePreview();


  const element =
    document.getElementById(
      "pdf-document"
    );


  let naam =
    document
      .getElementById(
        "naam"
      )
      .value
      .trim();


  if (!naam) {
    naam = "opdracht";
  }


  const safeName =
    createSafeFilename(
      naam
    );


  const filename =
    `opdrachtbevestiging-${safeName}.pdf`;


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


  html2pdf()
    .set(options)
    .from(element)
    .save();

}


/* =========================================================
   APP STARTEN
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {


    /*
     Datum in de PDF zetten.
     */

    setCurrentDate();


    /*
     Zoekveld school.
     */

    const schoolSearch =
      document.getElementById(
        "school-search"
      );


    if (schoolSearch) {


      /*
       Tijdens typen zoeken.
       */

      schoolSearch.addEventListener(
        "input",
        handleSchoolSearch
      );


      /*
       Bij aanklikken alvast scholen tonen.
       */

      schoolSearch.addEventListener(
        "focus",
        () => {

          showSchoolResults(
            schoolSearch.value
          );

        }
      );


      /*
       Enter selecteert het eerste resultaat.
       */

      schoolSearch.addEventListener(
        "keydown",
        event => {

          if (event.key !== "Enter") {
            return;
          }


          const firstResult =
            document.querySelector(
              ".school-result"
            );


          if (firstResult) {

            event.preventDefault();

            firstResult.click();

          }

        }
      );

    }


    /*
     Resultaten sluiten wanneer je
     ergens anders klikt.
     */

    document.addEventListener(
      "click",
      event => {

        const wrapper =
          document.querySelector(
            ".school-search-wrapper"
          );


        if (
          wrapper &&
          !wrapper.contains(
            event.target
          )
        ) {

          hideSchoolResults();

        }

      }
    );


    /*
     Preview automatisch aanpassen
     tijdens het invullen.
     */

    document
      .querySelectorAll(
        "input, textarea"
      )
      .forEach(element => {

        /*
         Schoolzoekveld heeft hierboven
         al eigen logica.
         */

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


    clearSchoolInfo();

    updatePreview();


    /*
     Scholen uit monday ophalen.
     */

    await loadSchools();

  }
);
