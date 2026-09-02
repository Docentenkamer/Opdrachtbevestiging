/* =========================================================
   MONDAY.COM
   ========================================================= */

const monday = mondaySdk();


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
   WEBSITE OPMAKEN
   ========================================================= */

function formatWebsite(value) {

  if (!value) {
    return "";
  }

  return value.trim();
}


/* =========================================================
   PLAATS UIT ADRES HALEN

   Bijvoorbeeld:

   Erasmusplein 1, 3132 EL, Vlaardingen

   wordt:

   Vlaardingen
   ========================================================= */

function extractPlace(address) {

  if (!address) {
    return "";
  }


  /*
   Probeer eerst een Nederlands postcodepatroon.
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
   Als dat niet lukt:
   pak het laatste gedeelte na een komma.
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
   COLUMN VALUES OMZETTEN NAAR OBJECT
   ========================================================= */

function mapColumnValues(columnValues) {

  const mapped = {};

  columnValues.forEach(column => {

    mapped[column.id] = column;

  });

  return mapped;
}


/* =========================================================
   WAARDE UIT MONDAY-KOLOM HALEN
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


  /*
   Fallback wanneer monday geen text teruggeeft.
   */

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
       Tekstwaarde
       */

      if (parsed.text) {
        return parsed.text;
      }

    } catch (error) {

      /*
       Als de waarde geen JSON is,
       gebruiken we hem rechtstreeks.
       */

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


  /*
   Eerst proberen we de URL uit de
   raw monday value te halen.
   */

  if (column.value) {

    try {

      const parsed = JSON.parse(column.value);

      if (parsed.url) {
        return parsed.url;
      }

    } catch (error) {
      // Geen probleem: hieronder gebruiken we text.
    }

  }


  return formatWebsite(
    column.text || ""
  );
}


/* =========================================================
   SCHOLEN UIT MONDAY LADEN
   ========================================================= */

async function loadSchools() {

  const schoolSelect =
    document.getElementById("school");


  schoolSelect.innerHTML = `
    <option value="">
      Scholen laden...
    </option>
  `;


  /*
   We vragen alleen de gegevens op die
   nodig zijn voor de opdrachtbevestiging.
   */

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


    /*
     Foutmelding vanuit monday / GraphQL.
     */

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


    /*
     Monday-items omzetten naar een
     eenvoudiger scholenobject.
     */

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
     Lege schoolnamen eruit halen.
     */

    schools =
      schools.filter(
        school => school.name
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


    /*
     Dropdown leegmaken en opnieuw vullen.
     */

    schoolSelect.innerHTML = `
      <option value="">
        Selecteer een school...
      </option>
    `;


    schools.forEach(school => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        school.id;


      option.textContent =
        school.name;


      schoolSelect.appendChild(
        option
      );

    });


    /*
     Geen scholen gevonden?
     */

    if (schools.length === 0) {

      schoolSelect.innerHTML = `
        <option value="">
          Geen scholen gevonden
        </option>
      `;

    }


    console.log(
      `${schools.length} scholen geladen.`,
      schools
    );


  } catch (error) {

    console.error(
      "Scholen konden niet worden geladen:",
      error
    );


    schoolSelect.innerHTML = `
      <option value="">
        Scholen konden niet worden geladen
      </option>
    `;


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

}


/* =========================================================
   SCHOOL GESELECTEERD
   ========================================================= */

function handleSchoolChange() {

  const schoolId =
    document
      .getElementById("school")
      .value;


  selectedSchool =
    schools.find(
      school =>
        school.id === schoolId
    ) || null;


  updateSchoolInfo();

  updatePreview();
}


/* =========================================================
   SCHOOLGEGEVENS ONDER DROPDOWN TONEN
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
   Schoolgegevens komen rechtstreeks
   uit het Scholenbord.
   */

  const school =
    selectedSchool
      ?.name || "...";


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


  /*
   Opdrachtgegevens
   */

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


  /*
   Declarabele uren
   */

  const urenRaw =
    getInputValue(
      "uren"
    );


  const uren =
    urenRaw === "-"
      ? "-"
      : `${urenRaw} uur`;


  /*
   Tarief
   */

  const tarief =
    formatTarief(
      getInputValue(
        "tarief"
      )
    );


  /*
   Preview vullen
   */

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
      .getElementById("naam")
      .value
      .trim();


  if (!naam) {
    naam = "opdracht";
  }


  const safeName =
    createSafeFilename(naam);


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
     Datum rechtsonder PDF.
     */

    setCurrentDate();


    /*
     Schooldropdown.
     */

    const schoolSelect =
      document.getElementById(
        "school"
      );


    if (schoolSelect) {

      schoolSelect.addEventListener(
        "change",
        handleSchoolChange
      );

    }


    /*
     Preview automatisch aanpassen
     tijdens het typen.
     */

    document
      .querySelectorAll(
        "input, textarea"
      )
      .forEach(element => {

        element.addEventListener(
          "input",
          updatePreview
        );

      });


    /*
     Eerste lege preview tonen.
     */

    updatePreview();


    /*
     Schoolgegevens ophalen uit monday.
     */

    await loadSchools();

  }
);
