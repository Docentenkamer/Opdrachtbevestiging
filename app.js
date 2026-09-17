/* =========================================================
   MONDAY
   ========================================================= */

const monday = window.mondaySdk();

const SCHOOLS_BOARD_ID = 5092598441;

const SCHOOL_COLUMNS = {
  address: "location_mm1gvbxd",
  contact: "board_relation_mm78dcsg",
  website: "company_domain"
};

let schools = [];
let selectedSchool = null;

/* Index van het actieve item in de school-dropdown
   (voor pijltjestoetsen-navigatie). -1 = niets actief. */
let activeDropdownIndex = -1;


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

  if (column.display_value && column.display_value.trim()) {
    return column.display_value.trim();
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

  if (!input) {
    console.error("Schoolveld niet gevonden.");
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
              ... on BoardRelationValue {
                display_value
              }
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
   SCHOOL-DROPDOWN (eigen, scrollbare lijst i.p.v.
   de native <datalist>, die in de meeste browsers niet
   met het muiswiel te scrollen is)
   ========================================================= */

function getSchoolInputEl() {
  return document.getElementById("school-search");
}

function getSchoolDropdownEl() {
  return document.getElementById("schools-dropdown");
}


function filterSchools(query) {

  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return schools;
  }

  return schools.filter(school =>
    school.name.toLowerCase().includes(normalized)
  );
}


function renderSchoolsDropdown(list) {

  const dropdown = getSchoolDropdownEl();

  if (!dropdown) {
    return;
  }

  dropdown.innerHTML = "";
  activeDropdownIndex = -1;

  if (!list.length) {

    const empty = document.createElement("li");
    empty.className = "no-results";
    empty.textContent = "Geen scholen gevonden";
    dropdown.appendChild(empty);

    return;
  }

  list.forEach(school => {

    const item = document.createElement("li");
    item.setAttribute("role", "option");
    item.dataset.schoolId = school.id;

    const name = document.createElement("span");
    name.textContent = school.name;
    item.appendChild(name);

    if (school.address) {

      const address = document.createElement("span");
      address.className = "school-address";
      address.textContent = school.address;
      item.appendChild(address);

    }

    /*
     * mousedown i.p.v. click: dit vuurt vóór het
     * blur-event van het inputveld, zodat de selectie
     * verwerkt wordt vóórdat de dropdown (via blur)
     * zou sluiten.
     */
    item.addEventListener("mousedown", event => {
      event.preventDefault();
      selectSchoolFromDropdown(school);
    });

    dropdown.appendChild(item);

  });
}


function openSchoolsDropdown(query = "") {

  const dropdown = getSchoolDropdownEl();
  const input = getSchoolInputEl();

  if (!dropdown) {
    return;
  }

  const list = filterSchools(query);

  renderSchoolsDropdown(list);

  dropdown.classList.add("open");

  if (input) {
    input.setAttribute("aria-expanded", "true");
  }
}


function closeSchoolsDropdown() {

  const dropdown = getSchoolDropdownEl();
  const input = getSchoolInputEl();

  if (!dropdown) {
    return;
  }

  dropdown.classList.remove("open");
  activeDropdownIndex = -1;

  if (input) {
    input.setAttribute("aria-expanded", "false");
  }
}


function selectSchoolFromDropdown(school) {

  const input = getSchoolInputEl();

  if (input) {
    input.value = school.name;
  }

  selectedSchool = school;

  updateSchoolInfo();
  closeSchoolsDropdown();
  updatePreview();
}


function getDropdownOptionEls() {

  const dropdown = getSchoolDropdownEl();

  if (!dropdown) {
    return [];
  }

  return Array.from(
    dropdown.querySelectorAll("li[role='option']")
  );
}


function moveDropdownSelection(step) {

  const items = getDropdownOptionEls();

  if (!items.length) {
    return;
  }

  activeDropdownIndex =
    (activeDropdownIndex + step + items.length) % items.length;

  items.forEach((item, index) => {
    item.classList.toggle(
      "active",
      index === activeDropdownIndex
    );
  });

  items[activeDropdownIndex].scrollIntoView({
    block: "nearest"
  });
}


function confirmDropdownSelection() {

  const items = getDropdownOptionEls();

  if (activeDropdownIndex < 0 || !items[activeDropdownIndex]) {
    return;
  }

  const schoolId =
    items[activeDropdownIndex].dataset.schoolId;

  const school =
    schools.find(candidate => candidate.id === schoolId);

  if (school) {
    selectSchoolFromDropdown(school);
  }
}


/* =========================================================
   SCHOOL SELECTEREN (typen)
   ========================================================= */

function handleSchoolInput() {

  const schoolInput = getSchoolInputEl();

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

  openSchoolsDropdown(typedName);
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


    /* ---------------------------------------------------
       FIX: scrollpositie resetten vóór het renderen.
       html2canvas rendert het element t.o.v. de viewport,
       niet t.o.v. het document. Als de pagina op dat
       moment gescrold is (bijv. omdat het linker formulier
       langer is dan het scherm), blijft er bovenaan de PDF
       precies zoveel witruimte staan als er gescrold was
       en schuift de rest van de inhoud mee naar beneden.
       Door naar boven te scrollen vóór het genereren,
       voorkomen we dat helemaal.
       --------------------------------------------------- */
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(resolve));


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


    /* Bestandsnaam samenstellen:
       naam_school_functie_eerstedatum.pdf
       Zo is elke opdrachtbevestiging in de
       downloads-map makkelijk te herkennen en
       terug te zoeken, en blijft de naam ook
       kort als er meerdere data zijn ingevuld
       (we gebruiken dan alleen de eerste datum,
       zodat dezelfde leerkracht op dezelfde
       groep maar een andere dag toch een eigen
       bestandsnaam krijgt). */

    let naam =
      document
        .getElementById("naam")
        ?.value
        ?.trim();

    if (!naam) {
      naam = "kandidaat";
    }


    let school =
      selectedSchool?.name ||
      document
        .getElementById("school-search")
        ?.value
        ?.trim();

    if (!school) {
      school = "school";
    }


    let functie =
      document
        .getElementById("functie")
        ?.value
        ?.trim();

    if (!functie) {
      functie = "opdracht";
    }


    let datum =
      document
        .getElementById("datum")
        ?.value
        ?.trim();

    /* Bij meerdere, komma-gescheiden data
       (bijv. "15/09, 16/09, 17/09") nemen we
       alleen de eerste. */
    if (datum) {
      datum = datum.split(",")[0].trim();
    }

    if (!datum) {
      datum = "datum";
    }


    const safeNaam =
      createSafeFilename(naam) ||
      "kandidaat";

    const safeSchool =
      createSafeFilename(school) ||
      "school";

    const safeFunctie =
      createSafeFilename(functie) ||
      "opdracht";

    const safeDatum =
      createSafeFilename(datum) ||
      "datum";


    const filename =
      `${safeNaam}_${safeSchool}_${safeFunctie}_${safeDatum}.pdf`;


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
        backgroundColor: "#ffffff",

        /* FIX: compenseert een eventuele resterende
           scrollpositie, als extra vangnet bovenop de
           window.scrollTo(0, 0) hierboven. */
        scrollX: 0,
        scrollY: -window.scrollY
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

    /*
     * De inhoud is altijd bedoeld als één
     * pagina. Door afrondingsverschillen kan
     * html2pdf soms een piepklein "restje"
     * op een tweede, vrijwel lege pagina
     * zetten (die dan uitgerekt en vervormd
     * oogt). Die overtollige pagina('s)
     * verwijderen we hier automatisch.
     */

    await html2pdf()
      .set(options)
      .from(element)
      .toPdf()
      .get("pdf")
      .then(function (pdf) {

        const totalPages =
          pdf.internal.getNumberOfPages();

        for (
          let page = totalPages;
          page > 1;
          page--
        ) {
          pdf.deletePage(page);
        }

      })
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


    const schoolInput = getSchoolInputEl();


    if (schoolInput) {

      schoolInput.addEventListener(
        "input",
        handleSchoolInput
      );


      schoolInput.addEventListener(
        "change",
        handleSchoolInput
      );


      /* Bij focus: toon meteen de volledige,
         scrollbare lijst met alle scholen. */
      schoolInput.addEventListener("focus", () => {
        openSchoolsDropdown("");
      });


      /* Kleine vertraging vóór het sluiten, zodat een
         klik op een dropdown-item (mousedown hierboven)
         eerst verwerkt wordt. */
      schoolInput.addEventListener("blur", () => {
        setTimeout(closeSchoolsDropdown, 100);
      });


      schoolInput.addEventListener("keydown", event => {

        const dropdownOpen =
          getSchoolDropdownEl()?.classList.contains("open");

        if (event.key === "ArrowDown") {
          event.preventDefault();

          if (!dropdownOpen) {
            openSchoolsDropdown(schoolInput.value.trim());
          } else {
            moveDropdownSelection(1);
          }

        } else if (event.key === "ArrowUp") {
          event.preventDefault();

          if (dropdownOpen) {
            moveDropdownSelection(-1);
          }

        } else if (event.key === "Enter") {

          if (dropdownOpen && activeDropdownIndex >= 0) {
            event.preventDefault();
            confirmDropdownSelection();
          }

        } else if (event.key === "Escape") {
          closeSchoolsDropdown();
        }

      });

    }


    /* Klik buiten de dropdown sluit 'm ook
       (naast de blur-afhandeling hierboven). */
    document.addEventListener("click", event => {

      const dropdown = getSchoolDropdownEl();
      const input = getSchoolInputEl();

      if (!dropdown || !input) {
        return;
      }

      const clickedInside =
        dropdown.contains(event.target) ||
        input.contains(event.target);

      if (!clickedInside) {
        closeSchoolsDropdown();
      }

    });


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
