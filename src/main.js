"use strict";

const API_URL = "https://veryfast.io/t/front_test_api.php";

let statusRegion;

// Skeleton Loader

function showSkeleton() {
  const container = getContainer();
  container.setAttribute("aria-busy", "true");

  container.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
}

function hideSkeleton() {
  const container = getContainer();
  container.removeAttribute("aria-busy");
  container.innerHTML = "";
}

// Data fetching

async function fetchProducts() {
  showSkeleton();
  setStatus("Loading products…");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (data.state === "ok") {
      hideSkeleton();
      buildCards(data.result.elements);
    } else {
      hideSkeleton();
      showError(
        "Something went wrong while loading products. Please try again later."
      );
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    hideSkeleton();
    showError(
      "Couldn't load products. Please check your connection and reload the page."
    );
  }
}

// Loading, error and status state

function getContainer() {
  return document.getElementById("cards-container");
}

function showError(message) {
  const container = getContainer();
  container.removeAttribute("aria-busy");
  container.innerHTML = `<p class="error-message" role="alert">${message}</p>`;
}

function setStatus(message) {
  if (statusRegion) {
    statusRegion.textContent = message;
  }
}

function initStatusRegion() {
  statusRegion = document.createElement("p");
  statusRegion.className = "visually-hidden";
  statusRegion.setAttribute("role", "status");
  document.body.appendChild(statusRegion);
}

// Sanitize HTML

function sanitizeHTML(unsafeHtml) {
  if (!unsafeHtml) return "";

  const parser = new DOMParser();
  const document = parser.parseFromString(unsafeHtml, "text/html");

  document
    .querySelectorAll("script")
    .forEach((scriptElement) => scriptElement.remove());

  document.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return document.body.innerHTML;
}

// Cards render

function buildCards(elements) {
  const container = getContainer();

  container.innerHTML = "";
  container.removeAttribute("aria-busy");

  if (!elements || elements.length === 0) {
    showError("No products are available at the moment.");
    return;
  }

  elements.forEach((item, index) => {
    container.appendChild(createCard(item, index));
  });

  setStatus(`${elements.length} products loaded.`);
}

function createCard(item, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.index = index;

  const priceBox = document.createElement("div");
  priceBox.className = "price-box";

  if (item.is_best) {
    const badge = document.createElement("div");
    badge.className = "card-badge";
    badge.textContent = "Best Value";
    priceBox.appendChild(badge);
  }

  if (item.price_key === "50%") {
    const discount = document.createElement("div");
    discount.className = "card-discount";
    discount.setAttribute("aria-hidden", "true");
    priceBox.appendChild(discount);
  }

  const { current: currentPrice, old: previousPrice } = parsePrices(item);
  const periodText = getPeriodFromLicense(item.license_name);

  const priceDiv = document.createElement("div");
  priceDiv.className = "price";

  const screenReaderPrice = document.createElement("span");
  screenReaderPrice.className = "visually-hidden";
  screenReaderPrice.textContent = formatPriceText(
    currentPrice,
    periodText,
    previousPrice
  );

  priceDiv.appendChild(screenReaderPrice);

  const priceParagraph = document.createElement("p");
  priceParagraph.setAttribute("aria-hidden", "true");
  priceParagraph.textContent = `$${currentPrice}`;

  priceDiv.appendChild(priceParagraph);

  const periodSpan = document.createElement("span");
  periodSpan.setAttribute("aria-hidden", "true");
  periodSpan.textContent = periodText;

  priceDiv.appendChild(periodSpan);
  priceBox.appendChild(priceDiv);

  if (previousPrice) {
    const previousPriceContainer = document.createElement("div");
    previousPriceContainer.className = "previous-price";
    previousPriceContainer.setAttribute("aria-hidden", "true");

    const previousPriceParagraph = document.createElement("p");
    previousPriceParagraph.textContent = `$${previousPrice}`;

    previousPriceContainer.appendChild(previousPriceParagraph);
    priceBox.appendChild(previousPriceContainer);
  }

  card.appendChild(priceBox);

  const contentBox = document.createElement("div");
  contentBox.className = "content-box";

  const { name: productName, license: licenseText } = splitNameDisplay(
    item.name_display,
    item.license_name
  );

  const productTitle = document.createElement("div");
  productTitle.className = "product-title";

  const titleId = `product-title-${index}`;

  const nameParagraph = document.createElement("p");
  nameParagraph.id = titleId;
  nameParagraph.textContent = productName || item.name_prod || "Product";

  productTitle.appendChild(nameParagraph);

  const licenseSpan = document.createElement("span");
  licenseSpan.textContent = licenseText;

  productTitle.appendChild(licenseSpan);
  contentBox.appendChild(productTitle);

  card.setAttribute("aria-labelledby", titleId);

  const downloadBtn = document.createElement("button");

  downloadBtn.type = "button";
  downloadBtn.className = "download-btn";
  downloadBtn.dataset.link = item.link;
  downloadBtn.dataset.index = index;

  downloadBtn.setAttribute(
    "aria-label",
    `Download ${productName || item.name_prod || "product"}${
      licenseText ? `, ${licenseText}` : ""
    }`
  );

  downloadBtn.innerHTML = `
    Download
    <i class="download-icon" aria-hidden="true"></i>
  `;

  downloadBtn.addEventListener("click", function (event) {
    event.preventDefault();
    handleDownload(this.dataset.link);
  });

  contentBox.appendChild(downloadBtn);
  card.appendChild(contentBox);

  return card;
}

// Parsing data

function parsePrices(item) {
  let currentPrice = item.amount != null ? String(item.amount) : null;
  let previousPrice = null;

  if (item.amount_html) {
    const sanitizedHtml = sanitizeHTML(item.amount_html);

    const previousPriceMatch =
      sanitizedHtml.match(/\$([\d.]+)\s*<\/strike>/i) ||
      sanitizedHtml.match(/<strike[^>]*>\s*\$?([\d.]+)/i);

    if (previousPriceMatch) {
      previousPrice = previousPriceMatch[1];
    }

    if (currentPrice == null) {
      const currentPriceMatch = sanitizedHtml.match(/\$([\d.]+)\s*<\/strong>/i);

      if (currentPriceMatch) {
        currentPrice = currentPriceMatch[1];
      }
    }
  }

  return {
    current: currentPrice ?? "",
    old: previousPrice,
  };
}

function splitNameDisplay(nameDisplay, licenseName) {
  if (!nameDisplay) {
    return {
      name: "",
      license: "",
    };
  }

  if (licenseName) {
    const licensePattern = new RegExp(licenseName + "s?\\s*$", "i");

    const match = nameDisplay.match(licensePattern);

    if (match) {
      return {
        name: nameDisplay.slice(0, match.index).trim(),
        license: nameDisplay.slice(match.index).trim(),
      };
    }
  }

  const periodPattern = /^(.+?)\s(\d+\s*[-–]\s*\w+.*)$/;
  const periodMatch = nameDisplay.match(periodPattern);

  if (periodMatch) {
    return {
      name: periodMatch[1],
      license: periodMatch[2],
    };
  }

  return {
    name: nameDisplay,
    license: "",
  };
}

function getPeriodFromLicense(licenseName) {
  if (!licenseName) {
    return "/per year";
  }

  const lowercasedLicense = licenseName.toLowerCase();

  return lowercasedLicense.includes("monthly") ||
    lowercasedLicense.includes("mo")
    ? "/mo"
    : "/per year";
}

function formatPriceText(price, period, previousPrice) {
  let unit = period.replace(/^\//, "").trim();

  if (unit === "mo") {
    unit = "per month";
  }

  let text = `$${price} ${unit}`;

  if (previousPrice) {
    text += `, reduced from $${previousPrice}`;
  }

  return text;
}

// Download

function handleDownload(link) {
  if (link) {
    const anchorElement = document.createElement("a");

    anchorElement.href = link;
    anchorElement.download = "";

    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
  }

  setTimeout(showDownloadArrow, 1500);
}

function showDownloadArrow() {
  document
    .querySelectorAll(".download-indicator")
    .forEach((indicator) => indicator.remove());

  const browser = detectBrowser();
  const device = detectDevice();

  const isMobile = device === "mobile";
  const isFirefox = browser === "firefox";

  const indicator = document.createElement("div");
  indicator.className = "download-indicator";
  indicator.id = "downloadGuide";
  indicator.setAttribute("role", "status");

  const arrow = document.createElement("div");

  arrow.className = `arrow ${isMobile ? "arrow-down" : "arrow-up"}`;

  arrow.innerHTML = `
    <div class="content">
      <p class="title">OPEN</p>
      <p class="subtitle">your downloaded file</p>
    </div>
  `;

  indicator.appendChild(arrow);
  document.body.appendChild(indicator);

  Object.assign(indicator.style, {
    position: "fixed",
    zIndex: "9999",
    pointerEvents: "none",
  });

  if (isMobile) {
    indicator.style.bottom = "70px";
    indicator.style.right = "20px";
  } else {
    indicator.style.top = "20px";
    indicator.style.right = isFirefox ? "50px" : "20px";
  }

  requestAnimationFrame(() => {
    indicator.classList.add("visible");
  });

  setTimeout(() => {
    indicator.classList.remove("visible");

    setTimeout(() => {
      indicator.remove();
    }, 500);
  }, 8000);
}

// Browser detection

function detectBrowser() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Firefox")) {
    return "firefox";
  }

  if (userAgent.includes("Edg") || userAgent.includes("Edge")) {
    return "edge";
  }

  if (userAgent.includes("Chrome") || userAgent.includes("CriOS")) {
    return "chrome";
  }

  if (userAgent.includes("Safari")) {
    return "safari";
  }

  return "unknown";
}

// Device detection

function detectDevice() {
  const userAgent = navigator.userAgent;
  const windowWidth = window.innerWidth;

  if (
    userAgent.includes("iPad") ||
    (userAgent.includes("Android") && !userAgent.includes("Mobile"))
  ) {
    return "tablet";
  }

  if (
    userAgent.includes("iPhone") ||
    userAgent.includes("iPod") ||
    userAgent.includes("Android") ||
    userAgent.includes("Mobile")
  ) {
    return "mobile";
  }

  if (windowWidth <= 480) {
    return "mobile";
  }

  if (windowWidth <= 1024) {
    return "tablet";
  }

  return "desktop";
}

document.addEventListener("DOMContentLoaded", () => {
  initStatusRegion();
  fetchProducts();
});
